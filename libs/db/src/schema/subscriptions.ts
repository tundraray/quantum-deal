import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { managers } from './managers';

/**
 * Subscription Type Constants
 */
export const SubscriptionType = {
  SIGNALS: 'signals',
} as const;

/**
 * Generate a unique identifier for broadcast subscriptions
 * @returns A 10-character unique ID
 */
export function generateSubscriptionUID(): string {
  return nanoid(10);
}

/**
 * Generate a broadcast subscription type string
 * @returns A type string in format 'subscription_{uid}'
 */
export function generateBroadcastSubscriptionType(): string {
  return `subscription_${generateSubscriptionUID()}`;
}

/**
 * Check if a subscription type is a broadcast subscription
 * @param type - The subscription type to check
 * @returns true if the type is a broadcast subscription (starts with 'subscription_')
 */
export function isBroadcastSubscription(type: string): boolean {
  return type.startsWith('subscription_');
}

export const subscriptions = pgTable('subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),

  /**
   * @deprecated Use subscription_features.config.sectors instead
   * This field will be removed in a future version.
   * Sector filtering is now managed via TIER_BASED_FILTERING feature config.
   *
   * Migration: Run scripts/migrate-subscription-features.ts to migrate
   * scope data to subscription_features.config.sectors
   */
  scope: jsonb('scope').$type<string[] | null>(),

  type: varchar('type', { length: 30 })
    .notNull()
    .default(SubscriptionType.SIGNALS),
  isActive: boolean('is_active').notNull().default(true),
  isHidden: boolean('is_hidden').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  closedBy: bigint('closed_by', { mode: 'number' }).references(
    () => managers.telegramId,
  ),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
