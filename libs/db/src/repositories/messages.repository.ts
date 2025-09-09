import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { messages, Message, NewMessage, MessageType } from '../schema/messages';

@Injectable()
export class MessagesRepository extends BaseRepository<
  Message,
  NewMessage,
  number
> {
  protected table = messages;
  protected idColumn = messages.id;
  private readonly logger = new Logger(MessagesRepository.name);

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
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
   * Get report template from messages table with fallback logic
   * @param type - Report type
   * @param lang - Language code
   * @returns The message template text
   */
  async getReportTemplate(type: MessageType, lang: string): Promise<string> {
    try {
      // Try to find message for the given type and language
      let message = await this.findByTypeAndLang(type, lang);

      if (!message) {
        this.logger.debug(
          `${type} template not found for language '${lang}', falling back to 'en'`,
        );
        // Fallback to 'en' language
        message = await this.findByTypeAndLang(type, 'en');
      }

      if (message) {
        return message.message || '';
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to get ${type} template for language '${lang}': ${err.message}`,
        err.stack,
      );
      throw new Error(`Failed to retrieve ${type} template: ${err.message}`);
    }

    const errorMsg = `${type} template not found for languages '${lang}' and 'en'`;
    this.logger.error(errorMsg);
    throw new Error(errorMsg);
  }
}
