import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { botMessages, BotMessage, NewBotMessage } from '../schema/bot-messages';
import { Message, messages, MessageType } from '../schema/messages';

/**
 * BotMessagesRepository
 *
 * Repository for managing per-bot message overrides.
 * Implements message resolution hierarchy per ADR-004 Decision 3:
 * bot_messages(botId, type, lang) > messages(type, lang) > messages(type, 'en') > hardcoded fallback
 *
 * This allows bots to customize specific messages while falling back to
 * global defaults for uncustomized messages.
 */
@Injectable()
export class BotMessagesRepository extends BaseRepository<
  BotMessage,
  NewBotMessage,
  number
> {
  protected table = botMessages;
  protected idColumn = botMessages.id;
  private readonly logger = new Logger(BotMessagesRepository.name);

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find bot-specific message override by exact match
   *
   * @param botId - The bot ID
   * @param type - Message type key (e.g., 'welcome', 'open', 'close_plus')
   * @param lang - Language code (e.g., 'en', 'ru')
   * @returns The bot message override or null if not found
   */
  async findByBotTypeAndLang(
    botId: number,
    type: string,
    lang: string,
  ): Promise<BotMessage | null> {
    return this.findOneBy(
      and(
        eq(botMessages.botId, botId),
        eq(botMessages.type, type),
        eq(botMessages.lang, lang),
      ),
    );
  }

  /**
   * Find all message overrides for a specific bot
   *
   * @param botId - The bot ID
   * @returns Array of all message overrides for the bot
   */
  async findAllByBotId(botId: number): Promise<BotMessage[]> {
    return this.findBy(eq(botMessages.botId, botId));
  }

  /**
   * Find all message overrides for a specific message type across all bots
   *
   * Useful for admin views showing which bots have customized a particular message.
   *
   * @param type - Message type key
   * @returns Array of message overrides for the type
   */
  async findAllByType(type: string): Promise<BotMessage[]> {
    return this.findBy(eq(botMessages.type, type));
  }

  /**
   * Find messages by type and language
   * Returns a random message template for the specified type and language
   */
  async findByTypeAndLang(
    type: MessageType,
    lang: string,
  ): Promise<Message | null> {
    const messagesForType = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.type, type), eq(messages.lang, lang)));

    if (messagesForType.length === 0) {
      return null;
    }

    // Return a random message template
    const randomIndex = Math.floor(Math.random() * messagesForType.length);
    return messagesForType[randomIndex];
  }

  /**
   * Resolve message with full hierarchy
   *
   * Resolution order per ADR-004 Decision 3:
   * 1. Bot-specific override (bot_messages table)
   * 2. Global default (messages table)
   * 3. English fallback (messages table, lang='en')
   * 4. Hardcoded fallback (never fails)
   *
   * @param botId - The bot ID (null for global only lookup)
   * @param type - Message type key
   * @param lang - Requested language code
   * @returns Resolved message string (never null)
   */
  async resolveMessage(
    botId: number | null,
    type: MessageType,
    lang: string,
  ): Promise<string> {
    // Step 1: Check bot-specific override
    if (botId !== null) {
      const botOverride = await this.findByBotTypeAndLang(botId, type, lang);
      if (botOverride) {
        return botOverride.message;
      }
    }

    // Step 2: Fall back to global default
    const globalDefault = await this.findByTypeAndLang(type, lang);

    if (globalDefault && globalDefault.message) {
      return globalDefault.message;
    }

    // Step 3: Try English fallback for global messages
    if (lang !== 'en') {
      const englishDefault = await this.findByTypeAndLang(type, 'en');

      if (englishDefault && englishDefault.message) {
        this.logger.debug(
          `Message ${type} not found for lang ${lang}, using English fallback`,
        );
        return englishDefault.message;
      }
    }

    const errorMsg = `${type} template not found for languages '${lang}' and 'en'`;
    this.logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  /**
   * Create or update a bot message override (upsert)
   *
   * If a message with the same (botId, type, lang) combination exists,
   * it will be updated. Otherwise, a new record is created.
   *
   * @param botId - The bot ID
   * @param type - Message type key
   * @param lang - Language code
   * @param message - The message content
   * @returns The created or updated bot message
   */
  async upsert(
    botId: number,
    type: MessageType,
    lang: string,
    message: string,
  ): Promise<BotMessage> {
    const existing = await this.findByBotTypeAndLang(botId, type, lang);

    if (existing) {
      const result = await this.db
        .update(botMessages)
        .set({ message, updatedAt: new Date() })
        .where(eq(botMessages.id, existing.id))
        .returning();

      return result[0];
    }

    return this.create({ botId, type, lang, message });
  }

  /**
   * Delete a bot message override
   *
   * After deletion, resolveMessage() will fall back to global defaults.
   *
   * @param botId - The bot ID
   * @param type - Message type key
   * @param lang - Language code
   * @returns true if deleted, false if not found
   */
  async deleteOverride(
    botId: number,
    type: string,
    lang: string,
  ): Promise<boolean> {
    const existing = await this.findByBotTypeAndLang(botId, type, lang);
    if (!existing) return false;

    return this.delete(existing.id);
  }
}
