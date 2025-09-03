import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  jsonb,
} from 'drizzle-orm/pg-core';

export const subscriptions = pgTable('subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),
  scope: jsonb('scope'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
