import { pgTable, bigint, varchar, text } from 'drizzle-orm/pg-core';

export const messages = pgTable('messages', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  lang: varchar('lang', { length: 10 }),
  type: varchar('type', { length: 30 }),
  message: text('message'),
});

export type MessageType =
  | 'open'
  | 'close_minus'
  | 'close_plus'
  | 'position_sltp_update'
  | 'weekly_report'
  | 'monthly_report';

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
