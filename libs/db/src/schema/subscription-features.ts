import {
  pgTable,
  bigint,
  varchar,
  boolean,
  jsonb,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';

/**
 * Feature Flag Enumeration
 *
 * Note: Signal delivery is core functionality, not a feature flag.
 *
 * This enum contains only 2 filtering features:
 * - TIER_BASED_FILTERING: System-controlled filtering by subscription tier
 * - CUSTOM_USER_FILTERING: User-configurable filtering preferences
 */
export enum FeatureFlag {
  // Filtering Features (2 features only)
  TIER_BASED_FILTERING = 'tier_based_filtering',
  CUSTOM_USER_FILTERING = 'custom_user_filtering',
}

/**
 * Feature Configuration Type
 * Generic record type for feature-specific configuration
 */
export type FeatureConfig = Record<string, unknown>;

/**
 * Subscription Features Table
 *
 * Maps features to subscriptions with configuration support.
 * Each subscription can have multiple features enabled/disabled independently.
 *
 * Business Rules:
 * - Basic tier: No feature flags (signal delivery only)
 * - VIP/Premium tier: TIER_BASED_FILTERING + CUSTOM_USER_FILTERING
 * - One record per (subscriptionId, featureKey) combination
 * - Cascades on subscription deletion
 */
export const subscriptionFeatures = pgTable(
  'subscription_features',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    featureKey: varchar('feature_key', { length: 100 }).notNull(),
    // Valid values: 'tier_based_filtering' | 'custom_user_filtering'
    isEnabled: boolean('is_enabled').notNull().default(true),
    config: jsonb('config').$type<FeatureConfig>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueSubscriptionFeature: unique('uq_subscription_feature').on(
      table.subscriptionId,
      table.featureKey,
    ),
  }),
);

/**
 * TypeScript Types
 */
export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type NewSubscriptionFeature = typeof subscriptionFeatures.$inferInsert;
