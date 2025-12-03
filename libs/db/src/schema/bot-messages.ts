import {
  pgTable,
  bigint,
  varchar,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { bots } from './bots';

export const botMessages = pgTable(
  'bot_messages',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    botId: bigint('bot_id', { mode: 'number' })
      .notNull()
      .references(() => bots.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    lang: varchar('lang', { length: 10 }).notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('uq_bot_messages_bot_type_lang').on(
      table.botId,
      table.type,
      table.lang,
    ),
  ],
);

export type BotMessage = typeof botMessages.$inferSelect;
export type NewBotMessage = typeof botMessages.$inferInsert;
