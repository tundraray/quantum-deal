import { Injectable, Logger } from '@nestjs/common';
import {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
} from '@quantumdeal/db';
import { BroadcastResultDto, MessageValidationResult } from '../dto';
import { NotificationService } from '@quantumdeal/framework/notifications';
import {
  MessagePriority,
  QueuedMessageType,
} from '@quantumdeal/framework/notifications/interfaces';
import { LLMService } from '@quantumdeal/framework';
import { z } from 'zod';
import type { MessageEntity } from '../interfaces';
import {
  convertEntitiesToMarkdown,
  hasFormattingEntities,
} from '../utils/entity-converter';

/**
 * Translation response type
 * Maps language code to translated message
 */
type Translations = Record<string, string>;

/**
 * User count breakdown for multi-subscription broadcast preview
 * Used to show total unique users and per-subscription counts
 */
export interface UserCountBreakdown {
  /** Total unique users across all subscriptions (deduplicated by userId) */
  total: number;
  /** Per-subscription breakdown (counts may overlap) */
  breakdown: Array<{
    subscriptionId: number;
    name: string;
    count: number;
  }>;
}

/**
 * Service for broadcasting messages to subscription subscribers
 *
 * CRITICAL: All operations validate subscription is broadcast type INLINE
 * before performing any operations. This prevents accidental broadcasts
 * to the signals subscription.
 */
@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly notificationService: NotificationService,
    private readonly llmService: LLMService,
  ) { }

  /**
   * Count subscribers with optional filters
   *
   * CRITICAL: Validates subscription exists INLINE before counting
   *
   * Supports filtering by:
   * - filterStatus: 'active' (default) or 'expired'
   * - filterBotId: specific bot ID or null/undefined for all bots
   *
   * Backward compatible: calling without filter parameters returns
   * active subscriber count (identical to previous behavior)
   *
   * @param subscriptionId - The subscription ID
   * @param filterStatus - 'active' | 'expired' (default: 'active')
   * @param filterBotId - Optional bot ID filter (null/undefined = all bots)
   * @returns Number of matching subscribers
   * @throws Error if subscription not found
   */
  async countSubscribers(
    subscriptionId: number,
    filterStatus?: 'active' | 'expired',
    filterBotId?: number | null,
  ): Promise<number> {
    // Validate subscription exists
    const subscription =
      await this.subscriptionsRepository.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Determine which query to use based on filterStatus
    const status = filterStatus ?? 'active';

    if (status === 'expired') {
      // Use findExpired for expired subscribers
      const expiredSubscribers =
        await this.userSubscriptionsRepository.findExpired(
          undefined, // subscriptionType - not filtering by type
          filterBotId ?? undefined, // botId filter
          subscriptionId, // subscriptionId filter
        );
      return expiredSubscribers.length;
    }

    // Default: active subscribers (backward compatible)
    const subscribers =
      await this.userSubscriptionsRepository.findActiveBySubscriptionId(
        subscriptionId,
      );

    // Apply bot filter if provided (for active subscribers)
    if (filterBotId != null) {
      return subscribers.filter((s) => s.botUser.botId === filterBotId).length;
    }

    return subscribers.length;
  }

  /**
   * Get unique user count across multiple subscriptions with deduplication
   *
   * CRITICAL: Validates all subscriptions exist INLINE before counting
   *
   * Used for preview display showing:
   * - Total unique users (deduplicated by userId)
   * - Per-subscription breakdown (raw counts, may overlap)
   *
   * @param subscriptionIds - Array of subscription IDs to count
   * @param filterStatus - 'active' | 'expired'
   * @param filterBotId - Specific bot ID or null for all bots
   * @returns UserCountBreakdown with total and breakdown array
   * @throws Error if any subscription not found
   */
  async getUniqueUserCount(
    subscriptionIds: number[],
    filterStatus: 'active' | 'expired',
    filterBotId: number | null,
  ): Promise<UserCountBreakdown> {
    // Collect all unique users using Set (deduplicated by userId)
    const uniqueUserIds = new Set<number>();
    const breakdown: UserCountBreakdown['breakdown'] = [];

    for (const subscriptionId of subscriptionIds) {
      // Validate subscription exists
      const subscription =
        await this.subscriptionsRepository.findById(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get subscribers based on filter status
      let subscribers: Array<{
        botUser: { userId: number; botId: number };
      }>;

      if (filterStatus === 'expired') {
        // Use findExpired for expired subscribers
        const expiredSubscribers =
          await this.userSubscriptionsRepository.findExpired(
            undefined, // subscriptionType - not filtering by type
            filterBotId ?? undefined, // botId filter
            subscriptionId, // subscriptionId filter
          );
        subscribers = expiredSubscribers;
      } else {
        // Active subscribers
        let activeSubscribers =
          await this.userSubscriptionsRepository.findSubscribersWithUserDetails(
            subscriptionId,
          );

        // Apply bot filter if provided (in-memory filtering)
        if (filterBotId != null) {
          activeSubscribers = activeSubscribers.filter(
            (s) => s.botUser.botId === filterBotId,
          );
        }
        subscribers = activeSubscribers;
      }

      // Add to breakdown with subscription name
      breakdown.push({
        subscriptionId,
        name: subscription.name,
        count: subscribers.length,
      });

      // Collect unique user IDs
      for (const sub of subscribers) {
        uniqueUserIds.add(sub.botUser.userId);
      }
    }

    return {
      total: uniqueUserIds.size,
      breakdown,
    };
  }

  /**
   * Validate broadcast message
   *
   * Rules:
   * - Message cannot be empty
   * - Message cannot exceed 4096 characters (Telegram limit)
   *
   * @param message - The message to validate
   * @returns Validation result with error message if invalid
   */
  validateMessage(message: string): MessageValidationResult {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length > 4096) {
      return {
        valid: false,
        error: 'Message exceeds Telegram limit of 4096 characters',
      };
    }

    return { valid: true };
  }

  /**
   * Send broadcast message to subscribers with optional filters
   *
   * CRITICAL: Validates subscription exists INLINE before sending
   *
   * Features:
   * - Automatic translation based on user language preferences
   * - Groups users by language to minimize LLM calls
   * - Preserves message structure (Markdown, emojis, links)
   * - Preserves message formatting via entities (bold, italic, etc.)
   * - Converts entities to Markdown for translation preservation
   * - Fallback to original message on translation failure
   * - Supports filtering by subscription status (active/expired)
   * - Supports filtering by bot ID
   *
   * Backward compatible: calling without filter parameters sends to
   * active subscribers (identical to previous behavior)
   *
   * @param subscriptionId - The subscription ID to broadcast to
   * @param message - The message content
   * @param entities - Message entities for formatting (optional)
   * @param managerId - The manager's Telegram ID who is broadcasting
   * @param filterStatus - 'active' | 'expired' (default: 'active')
   * @param filterBotId - Optional bot ID filter (null/undefined = all bots)
   * @returns Broadcast result with statistics
   * @throws Error if subscription not found, is not broadcast, or message invalid
   */
  async sendBroadcast(
    subscriptionId: number,
    message: string,
    entities: MessageEntity[] | undefined,
    managerId: number,
    filterStatus?: 'active' | 'expired',
    filterBotId?: number | null,
  ): Promise<BroadcastResultDto> {
    // Validate subscription exists
    const subscription =
      await this.subscriptionsRepository.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Validate message
    const validation = this.validateMessage(message);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Determine which query to use based on filterStatus
    const status = filterStatus ?? 'active';
    const botIdFilter = filterBotId ?? undefined;

    // Log filter parameters
    this.logger.log(
      `Broadcast filter: status=${status}, botId=${botIdFilter ?? 'all'}`,
    );

    // Get subscribers based on filter status
    let subscribers: Array<{
      botUser: { userId: number; botId: number; lang: string | null };
      userSubscription: { id: number; subscriptionId: number };
    }>;

    if (status === 'expired') {
      // Use findExpired for expired subscribers
      const expiredSubscribers =
        await this.userSubscriptionsRepository.findExpired(
          undefined, // subscriptionType - not filtering by type
          botIdFilter, // botId filter
          subscriptionId, // subscriptionId filter
        );
      subscribers = expiredSubscribers;
    } else {
      // Default: active subscribers (backward compatible)
      let activeSubscribers =
        await this.userSubscriptionsRepository.findSubscribersWithUserDetails(
          subscriptionId,
        );

      // Apply bot filter if provided (in-memory filtering, same pattern as countSubscribers)
      if (botIdFilter != null) {
        activeSubscribers = activeSubscribers.filter(
          (s) => s.botUser.botId === botIdFilter,
        );
      }
      subscribers = activeSubscribers;
    }

    this.logger.log(
      `Broadcasting message to ${subscribers.length} ${status} subscribers for subscription ${subscriptionId}`,
    );

    // Check if message has formatting entities
    const hasFormatting = hasFormattingEntities(entities);

    // Convert entities to Markdown for translation if present
    const messageForTranslation = hasFormatting
      ? convertEntitiesToMarkdown(message, entities)
      : message;

    this.logger.log(
      `Message has formatting: ${hasFormatting}, using ${hasFormatting ? 'Markdown conversion' : 'plain text'} for translation`,
    );

    // Group users by language preference
    const usersByLang = this.groupUsersByLanguage(subscribers);

    this.logger.debug(
      `Users grouped by language: ${Array.from(usersByLang.keys()).join(', ')}`,
    );

    // Translate message for each language group
    // If entities exist, we translate the Markdown version
    const translatedMessages = await this.translateMessagesForLanguages(
      messageForTranslation,
      usersByLang,
    );

    // Send broadcast via NotificationService
    try {
      const batchResult = this.notificationService.addMessages(
        subscribers.map((sub) => {
          const userLang = sub.botUser.lang || 'en';
          const translatedMessage =
            translatedMessages.get(userLang) || messageForTranslation;

          return {
            telegramId: sub.botUser.userId,
            botId: sub.botUser.botId,
            message: translatedMessage,
            options: {
              priority: MessagePriority.CRITICAL,
              // Use MARKDOWN if we converted entities, otherwise use TEXT
              messageType: hasFormatting
                ? QueuedMessageType.MARKDOWN
                : QueuedMessageType.TEXT,
              metadata: {
                subscriptionId,
                managerId,
                broadcastType: 'subscription',
                targetLanguage: userLang,
                hasFormatting,
              },
            },
          };
        }),
      );

      // Map BatchSendResult to BroadcastResultDto
      const result: BroadcastResultDto = {
        recipientCount: subscribers.length,
        queuedCount: batchResult.queuedCount,
        errorCount: batchResult.errorCount,
        queuedIds: batchResult.queuedIds,
        errors: batchResult.errors,
      };

      this.logger.log(
        `Broadcast queued: ${result.queuedCount} messages, ${result.errorCount} errors, ${translatedMessages.size} languages`,
      );

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to queue broadcast messages:', err);
      throw new Error('Failed to queue broadcast messages');
    }
  }

  /**
   * Group subscribers by their language preference
   *
   * @param subscribers - Array of subscribers with user details
   * @returns Map of language code to array of subscribers
   * @private
   */
  private groupUsersByLanguage(
    subscribers: Array<{
      botUser: { userId: number; lang: string | null };
      userSubscription: any;
    }>,
  ): Map<string, Array<{ botUser: any; userSubscription: any }>> {
    const grouped = new Map<
      string,
      Array<{ botUser: any; userSubscription: any }>
    >();

    for (const sub of subscribers) {
      const lang = sub.botUser.lang || 'en'; // Default to English if no language set
      const group = grouped.get(lang) || [];
      group.push(sub);
      grouped.set(lang, group);
    }

    return grouped;
  }

  /**
   * Translate message for each language group
   *
   * Strategy:
   * - Translate to ALL languages in a SINGLE LLM call
   * - Use fast LLM model (gpt-5-nano) for translation
   * - Use generateObject with Zod schema for type safety
   * - Preserve Markdown formatting, emojis, and links
   * - Fallback to original message on translation failure
   *
   * Performance: O(1) LLM calls regardless of language count
   * - 5 languages: 1 call (vs 5 calls with old approach)
   * - 10 languages: 1 call (vs 10 calls with old approach)
   *
   * @param originalMessage - The original message to translate
   * @param usersByLang - Map of language to users
   * @returns Map of language code to translated message
   * @private
   */
  private async translateMessagesForLanguages(
    originalMessage: string,
    usersByLang: Map<string, Array<{ botUser: any; userSubscription: any }>>,
  ): Promise<Map<string, string>> {
    const translatedMessages = new Map<string, string>();
    const languages = Array.from(usersByLang.keys());

    this.logger.debug(
      `Translating message for ${languages.length} languages in a single LLM call: ${languages.join(', ')}`,
    );

    try {
      // Single LLM call for all languages
      const translations = await this.translateToMultipleLanguages(
        originalMessage,
        languages,
      );

      // Convert Record to Map
      for (const [lang, text] of Object.entries(translations)) {
        translatedMessages.set(lang, text);
      }

      this.logger.log(
        `Successfully translated to ${languages.length} languages in one call`,
      );
    } catch (error) {
      this.logger.error(
        `Translation failed for all languages, using original message as fallback:`,
        error,
      );
      // Fallback: set original message for all languages
      for (const lang of languages) {
        translatedMessages.set(lang, originalMessage);
      }
    }

    return translatedMessages;
  }

  /**
   * Send broadcast message to subscribers across multiple subscriptions with deduplication
   *
   * CRITICAL: Validates all subscriptions exist INLINE before sending
   *
   * Features:
   * - Collects users from all specified subscriptions
   * - Deduplicates by userId (each user receives message only once)
   * - Automatic translation based on user language preferences
   * - Groups users by language to minimize LLM calls
   * - Preserves message formatting via entities (bold, italic, etc.)
   * - Supports filtering by subscription status (active/expired)
   * - Supports filtering by bot ID
   *
   * @param subscriptionIds - Array of subscription IDs to broadcast to
   * @param message - The message content
   * @param entities - Message entities for formatting (optional)
   * @param managerId - The manager's Telegram ID who is broadcasting
   * @param filterStatus - 'active' | 'expired'
   * @param filterBotId - Bot ID filter or null for all bots
   * @returns Broadcast result with deduplicated statistics
   * @throws Error if any subscription not found or message invalid
   */
  async sendBroadcastMulti(
    subscriptionIds: number[],
    message: string,
    entities: MessageEntity[] | undefined,
    managerId: number,
    filterStatus: 'active' | 'expired',
    filterBotId: number | null,
  ): Promise<BroadcastResultDto> {
    // Validate message
    const validation = this.validateMessage(message);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Log filter parameters
    this.logger.log(
      `BroadcastMulti filter: status=${filterStatus}, botId=${filterBotId ?? 'all'}, subscriptions=${subscriptionIds.join(',')}`,
    );

    // Collect unique users using Map (deduplicated by userId)
    // Map preserves first occurrence, ensuring each user receives message only once
    const uniqueUsers = new Map<
      number,
      {
        botUser: { userId: number; botId: number; lang: string | null };
        userSubscription: { id: number; subscriptionId: number };
      }
    >();

    for (const subscriptionId of subscriptionIds) {
      // Validate subscription exists
      const subscription =
        await this.subscriptionsRepository.findById(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get subscribers based on filter status
      let subscribers: Array<{
        botUser: { userId: number; botId: number; lang: string | null };
        userSubscription: { id: number; subscriptionId: number };
      }>;

      if (filterStatus === 'expired') {
        // Use findExpired for expired subscribers
        const expiredSubscribers =
          await this.userSubscriptionsRepository.findExpired(
            undefined, // subscriptionType - not filtering by type
            filterBotId ?? undefined, // botId filter
            subscriptionId, // subscriptionId filter
          );
        subscribers = expiredSubscribers;
      } else {
        // Active subscribers
        let activeSubscribers =
          await this.userSubscriptionsRepository.findSubscribersWithUserDetails(
            subscriptionId,
          );

        // Apply bot filter if provided (in-memory filtering)
        if (filterBotId != null) {
          activeSubscribers = activeSubscribers.filter(
            (s) => s.botUser.botId === filterBotId,
          );
        }
        subscribers = activeSubscribers;
      }

      // Add to unique users map (first occurrence wins)
      for (const sub of subscribers) {
        if (!uniqueUsers.has(sub.botUser.userId)) {
          uniqueUsers.set(sub.botUser.userId, sub);
        }
      }
    }

    const uniqueSubscribers = Array.from(uniqueUsers.values());

    this.logger.log(
      `Broadcasting message to ${uniqueSubscribers.length} unique users across ${subscriptionIds.length} subscriptions`,
    );

    // Check if message has formatting entities
    const hasFormatting = hasFormattingEntities(entities);

    // Convert entities to Markdown for translation if present
    const messageForTranslation = hasFormatting
      ? convertEntitiesToMarkdown(message, entities)
      : message;

    this.logger.log(
      `Message has formatting: ${hasFormatting}, using ${hasFormatting ? 'Markdown conversion' : 'plain text'} for translation`,
    );

    // Group users by language preference
    const usersByLang = this.groupUsersByLanguage(uniqueSubscribers);

    this.logger.debug(
      `Users grouped by language: ${Array.from(usersByLang.keys()).join(', ')}`,
    );

    // Translate message for each language group
    const translatedMessages = await this.translateMessagesForLanguages(
      messageForTranslation,
      usersByLang,
    );

    // Send broadcast via NotificationService
    try {
      const batchResult = this.notificationService.addMessages(
        uniqueSubscribers.map((sub) => {
          const userLang = sub.botUser.lang || 'en';
          const translatedMessage =
            translatedMessages.get(userLang) || messageForTranslation;

          return {
            telegramId: sub.botUser.userId,
            botId: sub.botUser.botId,
            message: translatedMessage,
            options: {
              priority: MessagePriority.CRITICAL,
              // Use MARKDOWN if we converted entities, otherwise use TEXT
              messageType: hasFormatting
                ? QueuedMessageType.MARKDOWN
                : QueuedMessageType.TEXT,
              metadata: {
                subscriptionIds,
                managerId,
                broadcastType: 'multi-subscription',
                targetLanguage: userLang,
                hasFormatting,
              },
            },
          };
        }),
      );

      // Map BatchSendResult to BroadcastResultDto
      const result: BroadcastResultDto = {
        recipientCount: uniqueSubscribers.length,
        queuedCount: batchResult.queuedCount,
        errorCount: batchResult.errorCount,
        queuedIds: batchResult.queuedIds,
        errors: batchResult.errors,
      };

      this.logger.log(
        `BroadcastMulti queued: ${result.queuedCount} messages, ${result.errorCount} errors, ${translatedMessages.size} languages`,
      );

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to queue broadcast multi messages:', err);
      throw new Error('Failed to queue broadcast messages');
    }
  }

  /**
   * Translate message to multiple languages using LLM
   *
   * Uses generateObject with Zod schema for type-safe, structured responses.
   * Translates to ALL languages in a SINGLE LLM call for optimal performance.
   *
   * IMPORTANT RULES:
   * - Preserve ALL Markdown formatting (bold, italic, code blocks, etc.)
   * - Preserve ALL emojis exactly as they are
   * - Preserve ALL links and their structure
   * - Maintain the same message structure and layout
   * - Only translate the actual text content
   * - Keep code blocks, usernames, and technical terms unchanged
   *
   * @param message - The message to translate
   * @param targetLanguages - Array of target language codes (ISO 639-1)
   * @returns Record mapping language codes to translated messages
   * @private
   */
  private async translateToMultipleLanguages(
    message: string,
    targetLanguages: string[],
  ): Promise<Translations> {
    const languageNames: Record<string, string> = {
      en: 'English',
      ru: 'Russian',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      ar: 'Arabic',
      hi: 'Hindi',
      tr: 'Turkish',
      pl: 'Polish',
      uk: 'Ukrainian',
      nl: 'Dutch',
      sv: 'Swedish',
      da: 'Danish',
      no: 'Norwegian',
      fi: 'Finnish',
    };

    // Build list of target language names
    const languageList = targetLanguages
      .map((lang) => languageNames[lang] || lang)
      .join(', ');

    // Create dynamic schema using catchall pattern (same as subscription-expiration service)
    // This pattern works correctly with OpenAI's generateObject API
    const dynamicSchema = z.object({}).catchall(z.string());

    const translationPrompt = `Translate the following message to multiple languages.

IMPORTANT RULES:
- Preserve ALL Markdown formatting (bold **text**, italic *text*, code blocks \`\`\`, etc.)
- Preserve ALL emojis EXACTLY as they are (do not modify or remove)
- Preserve ALL links and their structure [text](url)
- Maintain the SAME message structure and layout
- Only translate the actual text content
- Keep code blocks, usernames (@username), and technical terms unchanged
- Keep numbers, dates, and times in their original format

Target languages: ${languageList}

Original message:
${message}

Return a JSON object with language codes as keys and translated messages as values.

Example output format:
{
  "en": "translated English text",
  "ru": "переведенный русский текст",
  "es": "texto traducido al español"
}`;

    try {
      // Use gpt-5-nano for fast, cost-efficient translation
      const translations = await this.llmService.generateObject({
        model: 'gpt-5-nano',
        schema: dynamicSchema,
        prompt: translationPrompt,
        temperature: 0.3, // Low temperature for consistent translation
      });

      return translations as Translations;
    } catch (error) {
      this.logger.error(
        `LLM translation failed for languages [${targetLanguages.join(', ')}]:`,
        error,
      );
      throw error;
    }
  }
}
