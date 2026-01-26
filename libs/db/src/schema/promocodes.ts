import {
  pgTable,
  bigint,
  varchar,
  integer,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';
import { bots } from './bots';
import { managers } from './managers';
import { promocodeTypeEnum, discountTypeEnum } from './enums';

export const promocodes = pgTable(
  'promocodes',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    /**
     * Unique promocode string (e.g., "ABC12345")
     * Case-insensitive in validation
     */
    code: varchar('code', { length: 50 }).notNull(),

    /**
     * Type of promocode: single_use, multi_use, or system
     */
    type: promocodeTypeEnum('type').notNull(),

    /**
     * Discount type: percentage or fixed
     */
    discountType: discountTypeEnum('discount_type').notNull(),

    /**
     * Discount value:
     * - For 'percentage': 1-100 (e.g., 20 = 20% off)
     * - For 'fixed': Stars amount (e.g., 50 = -50 Stars)
     */
    discountValue: integer('discount_value').notNull(),

    /**
     * Subscription this promocode applies to
     * For MVP, scoped to signals subscription
     */
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),

    /**
     * Bot scope:
     * - NULL = global (works across all bots)
     * - Set value = bot-specific (works only in that bot)
     */
    botId: bigint('bot_id', { mode: 'number' }).references(() => bots.id, {
      onDelete: 'cascade',
    }),

    /**
     * Whether promocode is active and can be used
     */
    isActive: boolean('is_active').notNull().default(true),

    /**
     * Optional: Maximum total activations allowed
     * NULL = unlimited
     */
    maxActivations: integer('max_activations'),

    /**
     * Optional: Promocode validity period
     */
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),

    /**
     * Manager who created this promocode
     * Used for manager isolation (managers see only their own)
     */
    createdBy: bigint('created_by', { mode: 'number' })
      .notNull()
      .references(() => managers.telegramId),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    /**
     * When promocode was deactivated (for audit)
     */
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  },
  (table) => [
    /**
     * Unique code constraint (codes must be globally unique)
     */
    unique('uq_promocodes_code').on(table.code),

    /**
     * Index for code lookup (most frequent query)
     */
    index('idx_promocodes_code_active').on(table.code, table.isActive),

    /**
     * Index for bot-scoped queries
     */
    index('idx_promocodes_bot_active').on(table.botId, table.isActive),

    /**
     * Index for manager's promocodes list
     */
    index('idx_promocodes_created_by').on(table.createdBy),
  ],
);

export type Promocode = typeof promocodes.$inferSelect;
export type NewPromocode = typeof promocodes.$inferInsert;
