import { Injectable, Inject } from '@nestjs/common';
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
}
