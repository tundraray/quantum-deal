import {
  pgTable,
  bigint,
  varchar,
  integer,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { botUsers } from './bot-users';
import { subscriptions } from './subscriptions';
import { discountTypeEnum } from './enums';

export const userDiscounts = pgTable(
  'user_discounts',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    /**
     * Bot user receiving the discount
     * References bot_users.id (internal auto-generated ID)
     */
    botUserId: bigint('bot_user_id', { mode: 'number' })
      .notNull()
      .references(() => botUsers.id, { onDelete: 'cascade' }),

    /**
     * Subscription this discount applies to
     */
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),

    /**
     * Type of discount: 'percentage' or 'fixed'
     */
    discountType: discountTypeEnum('discount_type').notNull(),

    /**
     * Discount value (denormalized for audit purposes)
     */
    discountValue: integer('discount_value').notNull(),

    /**
     * Source of discount: 'promocode' or 'system_rule'
     */
    sourceType: varchar('source_type', { length: 20 }).notNull(),

    /**
     * ID of the source (promocode.id or system_discount_rule.id)
     */
    sourceId: bigint('source_id', { mode: 'number' }).notNull(),

    /**
     * When discount was assigned
     */
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    /**
     * One discount per user per subscription (enforces single discount rule)
     */
    unique('uq_user_discounts_bot_user_subscription').on(
      table.botUserId,
      table.subscriptionId,
    ),

    /**
     * Index for efficient discount lookup by user
     */
    index('idx_user_discounts_bot_user').on(table.botUserId),

    /**
     * Index for analytics: discounts by source
     */
    index('idx_user_discounts_source').on(table.sourceType, table.sourceId),
  ],
);

export type UserDiscount = typeof userDiscounts.$inferSelect;
export type NewUserDiscount = typeof userDiscounts.$inferInsert;
