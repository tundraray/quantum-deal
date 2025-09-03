import { pgTable, timestamp, bigint, real } from 'drizzle-orm/pg-core';

export const summary = pgTable('summary', {
  id: bigint('id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  result: real('result').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Summary = typeof summary.$inferSelect;
export type NewSummary = typeof summary.$inferInsert;
