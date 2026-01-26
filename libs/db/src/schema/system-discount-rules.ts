import {
  pgTable,
  bigint,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';
import { bots } from './bots';
import { managers } from './managers';
import { discountTypeEnum, triggerTypeEnum } from './enums';

export const systemDiscountRules = pgTable(
  'system_discount_rules',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    /**
     * Human-readable rule name for identification
     */
    name: varchar('name', { length: 100 }).notNull(),

    /**
     * Subscription this rule applies to
     */
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),

    /**
     * Bot scope:
     * - NULL = global rule (applies to all bots)
     * - Set value = bot-specific rule (higher priority)
     */
    botId: bigint('bot_id', { mode: 'number' }).references(() => bots.id, {
      onDelete: 'cascade',
    }),

    /**
     * Trigger condition type
     */
    triggerType: triggerTypeEnum('trigger_type').notNull(),

    /**
     * Trigger value (e.g., days after expiration: 0-365)
     */
    triggerValue: integer('trigger_value').notNull(),

    /**
     * Discount type to assign
     */
    discountType: discountTypeEnum('discount_type').notNull(),

    /**
     * Discount value to assign
     */
    discountValue: integer('discount_value').notNull(),

    /**
     * Whether rule is active
     */
    isActive: boolean('is_active').notNull().default(true),

    /**
     * Manager who created this rule (for audit)
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
  },
  (table) => [
    /**
     * Index for finding active rules by subscription
     */
    index('idx_system_discount_rules_subscription_active').on(
      table.subscriptionId,
      table.isActive,
    ),

    /**
     * Index for finding rules by bot
     */
    index('idx_system_discount_rules_bot_active').on(
      table.botId,
      table.isActive,
    ),
  ],
);

export type SystemDiscountRule = typeof systemDiscountRules.$inferSelect;
export type NewSystemDiscountRule = typeof systemDiscountRules.$inferInsert;
