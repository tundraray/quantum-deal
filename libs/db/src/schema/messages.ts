import { pgTable, bigint, varchar, text } from 'drizzle-orm/pg-core';

export const messages = pgTable('messages', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  lang: varchar('lang', { length: 10 }),
  type: varchar('type', { length: 10 }),
  message: text('message'),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
