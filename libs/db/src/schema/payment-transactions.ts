import {
  pgTable,
  bigint,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { renewalTariffs } from './renewal-tariffs';
import { userSubscriptions } from './user-subscriptions';

/**
 * Payment States Enum
 *
 * Defines all possible states in the payment lifecycle
 */
export enum PaymentState {
  /** Invoice created, awaiting payment from user */
  PENDING = 'pending',

  /** Payment confirmed by Telegram, Stars deducted from user's account */
  PAID = 'paid',

  /** Subscription successfully extended, payment fully processed */
  COMPLETED = 'completed',

  /** Payment failed (insufficient Stars, payment declined, etc.) */
  FAILED = 'failed',

  /** Payment was successful but later refunded by admin */
  REFUNDED = 'refunded',

  /** Invoice expired without payment (24h timeout) */
  EXPIRED = 'expired',

  /** User cancelled payment before completion */
  CANCELLED = 'cancelled',
}

/**
 * Payment Transactions Table
 *
 * Complete audit trail for all Telegram Stars payment transactions.
 * Tracks the entire payment lifecycle from invoice creation to final state.
 *
 * State Machine:
 * pending → paid → completed (success path)
 *        ↓
 *        failed / refunded / expired / cancelled (failure paths)
 */
export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),

    /**
     * User making the payment
     * References users.telegram_id (Telegram user ID)
     * CASCADE: Delete payment records when user deleted (GDPR compliance)
     */
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.telegramId, { onDelete: 'cascade' }),

    /**
     * Subscription being renewed
     * References user_subscriptions.id
     * CASCADE: Delete payment records when subscription deleted
     */
    userSubscriptionId: bigint('user_subscription_id', { mode: 'number' })
      .notNull()
      .references(() => userSubscriptions.id, { onDelete: 'cascade' }),

    /**
     * Tariff used for this payment
     * References renewal_tariffs.id
     * SET NULL: Preserve payment record even if tariff deleted (audit trail)
     */
    tariffId: bigint('tariff_id', { mode: 'number' }).references(
      () => renewalTariffs.id,
      { onDelete: 'set null' },
    ),

    /**
     * Telegram invoice identifier
     * Unique ID from Telegram for this invoice
     */
    telegramInvoiceId: varchar('telegram_invoice_id', { length: 255 }),

    /**
     * Telegram payment charge identifier
     * Unique ID from Telegram for the completed payment
     */
    telegramPaymentChargeId: varchar('telegram_payment_charge_id', {
      length: 255,
    }),

    /**
     * Payment amount in Telegram Stars
     * Denormalized from tariff for audit purposes
     * (tariff price may change or tariff may be deleted)
     */
    amountStars: integer('amount_stars').notNull(),

    /**
     * Renewal period in days
     * Denormalized from tariff for audit purposes
     */
    periodDays: integer('period_days').notNull(),

    /**
     * Current payment state
     * See PaymentState enum for valid values
     */
    state: varchar('state', { length: 20 })
      .notNull()
      .default(PaymentState.PENDING),

    /**
     * State transition timestamps
     * Each timestamp records when the transaction entered that state
     */

    /** When transaction was created (invoice sent) */
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    /** When payment was confirmed by Telegram */
    paidAt: timestamp('paid_at', { withTimezone: true }),

    /** When subscription was successfully extended */
    completedAt: timestamp('completed_at', { withTimezone: true }),

    /** When payment failed */
    failedAt: timestamp('failed_at', { withTimezone: true }),

    /** When payment was refunded */
    refundedAt: timestamp('refunded_at', { withTimezone: true }),

    /** When invoice expired without payment */
    expiredAt: timestamp('expired_at', { withTimezone: true }),

    /** When user cancelled the payment */
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    /**
     * Failure/cancellation/refund details
     */

    /** Reason why payment failed (for analytics and debugging) */
    failureReason: varchar('failure_reason', { length: 500 }),

    /** Reason why user cancelled (if provided) */
    cancellationReason: varchar('cancellation_reason', { length: 500 }),

    /** Reason for refund (admin note) */
    refundReason: varchar('refund_reason', { length: 500 }),

    /** Amount refunded in Stars (may be partial) */
    refundAmount: integer('refund_amount'),

    /**
     * Additional metadata (JSONB for flexibility)
     * Can store any additional data like:
     * - Provider payment charge ID
     * - Debug information
     * - Custom notes
     */
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),

    /** Last update timestamp */
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    /**
     * Indexes for performance optimization
     */

    /** Fast lookup of user's payment history */
    index('idx_payment_transactions_user_id').on(table.userId),

    /** Filter transactions by state */
    index('idx_payment_transactions_state').on(table.state),

    /** Fast lookup by Telegram invoice ID (webhook processing) */
    index('idx_payment_transactions_telegram_invoice_id').on(
      table.telegramInvoiceId,
    ),

    /** Time-based queries (analytics, reporting) */
    index('idx_payment_transactions_created_at').on(table.createdAt),

    /** Subscription renewal history */
    index('idx_payment_transactions_user_subscription').on(
      table.userSubscriptionId,
    ),
  ],
);

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;

