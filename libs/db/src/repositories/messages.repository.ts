import { Injectable, Inject } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { messages, Message, NewMessage } from '../schema/messages';

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
}
