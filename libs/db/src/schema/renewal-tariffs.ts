import {
  pgTable,
  bigint,
  integer,
  varchar,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';

/**
 * Renewal Tariffs Table
 *
 * Stores pricing for subscription renewals in Telegram Stars.
 * Each tariff is associated with a specific subscription.
 * Different subscriptions can have different pricing tiers.
 */
export const renewalTariffs = pgTable(
  'renewal_tariffs',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    /**
     * Subscription ID reference
     * Each tariff must be associated with a specific subscription
     */
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),

    /**
     * Renewal period in days (flexible - any positive integer)
     * Range: 1-3650 days (~10 years maximum)
     */
    periodDays: integer('period_days').notNull(),

    /**
     * Price in Telegram Stars
     * Must be positive integer
     */
    priceStars: integer('price_stars').notNull(),

    /**
     * Display name for the tariff in UI
     * Examples: "1 month", "3 months", "1 месяц", "3 месяца"
     */
    displayName: varchar('display_name', { length: 100 }).notNull(),

    /**
     * Discount percentage (optional)
     * Used to display discount badge in UI
     * Example: 20 for 20% discount
     */
    discountPercent: integer('discount_percent'),

    /**
     * Is this tariff active and available for selection?
     * Use false for soft delete (preserves audit trail in payment_transactions)
     */
    isActive: boolean('is_active').notNull().default(true),

    /**
     * Sort order for display in UI
     * Lower values appear first
     */
    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    /**
     * Unique constraint: one tariff per (subscription, period) combination
     * Prevents duplicate tariffs for the same subscription and period
     */
    unique('uq_renewal_tariff_subscription_period').on(
      table.subscriptionId,
      table.periodDays,
    ),
  ],
);

export type RenewalTariff = typeof renewalTariffs.$inferSelect;
export type NewRenewalTariff = typeof renewalTariffs.$inferInsert;
