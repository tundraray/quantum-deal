import {
  pgTable,
  timestamp,
  bigint,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';
import { bots } from './bots';
import { botUsers } from './bot-users';

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
export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    // NEW: Primary FK to bot-specific user context
    // References bot_users.id (auto-generated internal ID, NOT telegramId)
    botUserId: bigint('bot_user_id', { mode: 'number' }).references(
      () => botUsers.id,
      { onDelete: 'cascade' },
    ),

    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    botId: bigint('bot_id', { mode: 'number' }).references(() => bots.id, {
      onDelete: 'cascade',
    }),
    activatedAt: timestamp('activated_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_subscriptions_bot').on(table.botId),
    index('idx_user_subscriptions_bot_user').on(table.botUserId),
  ],
);

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
