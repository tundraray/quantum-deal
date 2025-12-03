import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  paymentTransactions,
  PaymentTransaction,
  NewPaymentTransaction,
  PaymentState,
} from '../schema/payment-transactions';
import { eq, sql, desc } from 'drizzle-orm';

@Injectable()
export class PaymentTransactionsRepository {
  private readonly logger = new Logger(PaymentTransactionsRepository.name);

  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  /**
   * Create a new payment transaction
   *
   * @param transaction - Transaction data to insert
   * @returns Created transaction
   */
  async create(
    transaction: Omit<
      NewPaymentTransaction,
      'createdAt' | 'updatedAt' | 'metadata'
    > & { metadata?: Record<string, unknown> },
  ): Promise<PaymentTransaction> {
    const result = await this.db
      .insert(paymentTransactions)
      .values({
        ...transaction,
        state: PaymentState.PENDING,
        metadata: transaction.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    this.logger.log(
      `Created payment transaction ${result[0].id} for user ${transaction.userId}`,
    );

    return result[0];
  }

  /**
   * Update payment state with optional details
   *
   * @param id - Transaction ID
   * @param state - New payment state
   * @param details - Additional details to update (timestamps, reasons, etc.)
   * @returns Updated transaction or null if not found
   */
  async updateState(
    id: number,
    state: PaymentState,
    details?: {
      paidAt?: Date;
      completedAt?: Date;
      failedAt?: Date;
      refundedAt?: Date;
      expiredAt?: Date;
      cancelledAt?: Date;
      telegramInvoiceId?: string;
      telegramPaymentChargeId?: string;
      failureReason?: string;
      cancellationReason?: string;
      refundReason?: string;
      refundAmount?: number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<PaymentTransaction | null> {
    const result = await this.db
      .update(paymentTransactions)
      .set({
        state,
        ...details,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, id))
      .returning();

    if (result[0]) {
      this.logger.log(`Updated payment transaction ${id} to state: ${state}`);
    } else {
      this.logger.warn(`Payment transaction ${id} not found for state update`);
    }

    return result[0] || null;
  }

  /**
   * Find transaction by Telegram invoice ID
   * Used in webhook processing
   *
   * @param invoiceId - Telegram invoice ID
   * @returns Transaction or null if not found
   */
  async findByTelegramInvoiceId(
    invoiceId: string,
  ): Promise<PaymentTransaction | null> {
    const result = await this.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.telegramInvoiceId, invoiceId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find transaction by ID
   *
   * @param id - Transaction ID
   * @returns Transaction or null if not found
   */
  async findById(id: number): Promise<PaymentTransaction | null> {
    const result = await this.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find bot user's payment history
   * Returns transactions ordered by creation date (newest first)
   *
   * @param botUserId - Bot user ID (bot_users.id)
   * @param options - Pagination options
   * @returns Array of transactions
   */
  async findByBotUser(
    botUserId: number,
    options?: { limit?: number; offset?: number },
  ): Promise<PaymentTransaction[]> {
    const { limit = 20, offset = 0 } = options || {};

    return this.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.botUserId, botUserId))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * @deprecated Use findByBotUser instead. Will be removed after migration validation.
   *
   * Find user's payment history
   * Returns transactions ordered by creation date (newest first)
   *
   * @param userId - User's Telegram ID
   * @param options - Pagination options
   * @returns Array of transactions
   */
  async findByUser(
    userId: number,
    options?: { limit?: number; offset?: number },
  ): Promise<PaymentTransaction[]> {
    const { limit = 20, offset = 0 } = options || {};

    return this.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.userId, userId))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get payment statistics for a bot user
   * Returns aggregated payment data
   *
   * @param botUserId - Bot user ID (bot_users.id)
   * @returns Payment statistics
   */
  async getStatisticsByBotUser(botUserId: number): Promise<{
    totalPayments: number;
    completedPayments: number;
    failedPayments: number;
    totalStarsSpent: number;
    totalDaysPurchased: number;
  }> {
    const stats = await this.db
      .select({
        totalPayments: sql<number>`COUNT(*)`,
        completedPayments: sql<number>`COUNT(*) FILTER (WHERE state = ${PaymentState.COMPLETED})`,
        failedPayments: sql<number>`COUNT(*) FILTER (WHERE state = ${PaymentState.FAILED})`,
        totalStarsSpent: sql<number>`SUM(CASE WHEN state = ${PaymentState.COMPLETED} THEN amount_stars ELSE 0 END)`,
        totalDaysPurchased: sql<number>`SUM(CASE WHEN state = ${PaymentState.COMPLETED} THEN period_days ELSE 0 END)`,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.botUserId, botUserId));

    return {
      totalPayments: Number(stats[0]?.totalPayments || 0),
      completedPayments: Number(stats[0]?.completedPayments || 0),
      failedPayments: Number(stats[0]?.failedPayments || 0),
      totalStarsSpent: Number(stats[0]?.totalStarsSpent || 0),
      totalDaysPurchased: Number(stats[0]?.totalDaysPurchased || 0),
    };
  }

  /**
   * @deprecated Use getStatisticsByBotUser instead. Will be removed after migration validation.
   *
   * Get payment statistics for a user
   * Returns aggregated payment data
   *
   * @param userId - User's Telegram ID
   * @returns Payment statistics
   */
  async getStatistics(userId: number): Promise<{
    totalPayments: number;
    completedPayments: number;
    failedPayments: number;
    totalStarsSpent: number;
    totalDaysPurchased: number;
  }> {
    const stats = await this.db
      .select({
        totalPayments: sql<number>`COUNT(*)`,
        completedPayments: sql<number>`COUNT(*) FILTER (WHERE state = ${PaymentState.COMPLETED})`,
        failedPayments: sql<number>`COUNT(*) FILTER (WHERE state = ${PaymentState.FAILED})`,
        totalStarsSpent: sql<number>`SUM(CASE WHEN state = ${PaymentState.COMPLETED} THEN amount_stars ELSE 0 END)`,
        totalDaysPurchased: sql<number>`SUM(CASE WHEN state = ${PaymentState.COMPLETED} THEN period_days ELSE 0 END)`,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.userId, userId));

    return {
      totalPayments: Number(stats[0]?.totalPayments || 0),
      completedPayments: Number(stats[0]?.completedPayments || 0),
      failedPayments: Number(stats[0]?.failedPayments || 0),
      totalStarsSpent: Number(stats[0]?.totalStarsSpent || 0),
      totalDaysPurchased: Number(stats[0]?.totalDaysPurchased || 0),
    };
  }

  /**
   * Count transactions by state for analytics
   *
   * @param fromDate - Optional start date for filtering
   * @returns Object with counts per state
   */
  async countByState(fromDate?: Date): Promise<Record<PaymentState, number>> {
    const query = this.db
      .select({
        state: paymentTransactions.state,
        count: sql<number>`COUNT(*)`,
      })
      .from(paymentTransactions)
      .groupBy(paymentTransactions.state);

    if (fromDate) {
      query.where(sql`${paymentTransactions.createdAt} >= ${fromDate}`);
    }

    const results = await query;

    const counts: Record<PaymentState, number> = {
      [PaymentState.PENDING]: 0,
      [PaymentState.PAID]: 0,
      [PaymentState.COMPLETED]: 0,
      [PaymentState.FAILED]: 0,
      [PaymentState.REFUNDED]: 0,
      [PaymentState.EXPIRED]: 0,
      [PaymentState.CANCELLED]: 0,
    };

    results.forEach((row) => {
      counts[row.state as PaymentState] = Number(row.count);
    });

    return counts;
  }
}
