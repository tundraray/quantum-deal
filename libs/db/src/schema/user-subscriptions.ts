import { pgTable, timestamp, bigint, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { subscriptions } from './subscriptions';

/**
 * User Subscriptions Table
 *
 * Central many-to-many relationship table that replaces:
 * - users.subscribeId (old one-to-one relationship)
 * - codes.userId, codes.activationDate, codes.expirationDate (old activation data)
 *
 * This table allows users to have multiple active subscriptions simultaneously,
 * supporting both:
 * - Signals subscriptions (type: 'signals')
 * - Broadcast subscriptions (type: 'subscription_{uid}')
 */
export const userSubscriptions = pgTable('user_subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.telegramId, { onDelete: 'cascade' }),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  activatedAt: timestamp('activated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
