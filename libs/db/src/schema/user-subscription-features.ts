import {
  pgTable,
  serial,
  bigint,
  varchar,
  jsonb,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * User Subscription Features Settings Type
 *
 * Stores user-specific configuration for enabled features.
 * Each feature can have its own settings structure.
 *
 * Examples:
 * - CUSTOM_USER_FILTERING: { symbols: ['GBPUSD.a', 'EURUSD.a', 'BTCUSD.a'] }
 *
 * NOTE: TIER_BASED_FILTERING does not require user settings - it's configured
 * at the subscription level via subscription_features.config.sectors
 */
export type UserFeatureSettings = Record<string, unknown>;

/**
 * User Subscription Features Table
 *
 * Stores user-level configuration for features they have access to.
 * This allows users to customize how enabled features behave.
 *
 * Examples:
 * - CUSTOM_USER_FILTERING: User configures personal settings via user_subscription_features.settings
 *
 * Business Rules:
 * - One record per (userId, featureKey) combination
 * - Cascades on user deletion
 * - Settings are stored in JSONB format for flexibility
 * - is_active allows soft deletion (preserve settings for future upgrade)
 */
export const userSubscriptionFeatures = pgTable(
  'user_subscription_features',
  {
    id: serial('id').primaryKey(),

    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.telegramId, { onDelete: 'cascade' }),

    featureKey: varchar('feature_key', { length: 50 }).notNull(),

    /**
     * User-specific settings for this feature in JSONB format.
     * Structure depends on the feature.
     *
     * Examples:
     * - CUSTOM_USER_FILTERING: { symbols: ['GBPUSD.a', 'EURUSD.a'] }
     */
    settings: jsonb('settings')
      .$type<UserFeatureSettings>()
      .notNull()
      .default({}),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at').notNull().defaultNow(),

    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint: one settings record per user per feature
    uniqueUserFeature: unique('unique_user_feature').on(
      table.userId,
      table.featureKey,
    ),
  }),
);

/**
 * TypeScript Types
 */
export type UserSubscriptionFeature =
  typeof userSubscriptionFeatures.$inferSelect;
export type NewUserSubscriptionFeature =
  typeof userSubscriptionFeatures.$inferInsert;
