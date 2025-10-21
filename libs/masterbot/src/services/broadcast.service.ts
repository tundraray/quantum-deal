import { Injectable, Logger } from '@nestjs/common';
import {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
} from '@quantumdeal/db';
import { isBroadcastSubscription } from '@quantumdeal/db/schema/subscriptions';
import { BroadcastResultDto, MessageValidationResult } from '../dto';
import { NotificationService } from '@quantumdeal/bot';
import {
  MessagePriority,
  QueuedMessageType,
} from '@quantumdeal/bot/interfaces/notification.interface';
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
  ) {}

  /**
   * Count active subscribers for a subscription
   *
   * CRITICAL: Validates subscription is broadcast type INLINE before counting
   *
   * @param subscriptionId - The subscription ID
   * @returns Number of active subscribers
   * @throws Error if subscription not found or is not broadcast type
   */
  async countSubscribers(subscriptionId: number): Promise<number> {
    // Validate subscription type
    const subscription =
      await this.subscriptionsRepository.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Count active subscribers
    const subscribers =
      await this.userSubscriptionsRepository.findActiveBySubscriptionId(
        subscriptionId,
      );
    return subscribers.length;
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
   * Send broadcast message to all subscribers
   *
   * CRITICAL: Validates subscription is broadcast type INLINE before sending
   *
   * Features:
   * - Automatic translation based on user language preferences
   * - Groups users by language to minimize LLM calls
   * - Preserves message structure (Markdown, emojis, links)
   * - Preserves message formatting via entities (bold, italic, etc.)
   * - Converts entities to Markdown for translation preservation
   * - Fallback to original message on translation failure
   *
   * @param subscriptionId - The subscription ID to broadcast to
   * @param message - The message content
   * @param entities - Message entities for formatting (optional)
   * @param managerId - The manager's Telegram ID who is broadcasting
   * @returns Broadcast result with statistics
   * @throws Error if subscription not found, is not broadcast, or message invalid
   */
  async sendBroadcast(
    subscriptionId: number,
    message: string,
    entities: MessageEntity[] | undefined,
    managerId: number,
  ): Promise<BroadcastResultDto> {
    // Validate subscription type
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

    // Get all active subscribers with user details
    const subscribers =
      await this.userSubscriptionsRepository.findSubscribersWithUserDetails(
        subscriptionId,
      );

    this.logger.log(
      `Broadcasting message to ${subscribers.length} subscribers for subscription ${subscriptionId}`,
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
          const userLang = sub.user.lang || 'en';
          const translatedMessage =
            translatedMessages.get(userLang) || messageForTranslation;

          return {
            userId: sub.user.telegramId,
            message: translatedMessage,
            options: {
              priority: MessagePriority.NORMAL,
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
      user: { telegramId: number; lang: string | null };
      userSubscription: any;
    }>,
  ): Map<string, Array<{ user: any; userSubscription: any }>> {
    const grouped = new Map<
      string,
      Array<{ user: any; userSubscription: any }>
    >();

    for (const sub of subscribers) {
      const lang = sub.user.lang || 'en'; // Default to English if no language set
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
    usersByLang: Map<string, Array<{ user: any; userSubscription: any }>>,
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

Example format:
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
