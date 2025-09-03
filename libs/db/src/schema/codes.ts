import { pgTable, timestamp, varchar, bigint } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';
import { users } from './users';

export const codes = pgTable('codes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: varchar('code').notNull(),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id),
  userId: bigint('user_id', { mode: 'number' }).references(
    () => users.telegramId,
  ),
  activationDate: timestamp('activation_date'),
  expirationDate: timestamp('expiration_date'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Code = typeof codes.$inferSelect;
export type NewCode = typeof codes.$inferInsert;
