import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Telegraf, Context as TelegrafContext } from 'telegraf';
import { InjectBot } from '@quantumdeal/telegraf';
import {
  PaymentTransactionsRepository,
  RenewalTariffsRepository,
  UserSubscriptionsRepository,
  SubscriptionsRepository,
  UsersRepository,
  BotUsersRepository,
  BotsRepository,
} from '@quantumdeal/db';
import { PaymentState } from '@quantumdeal/db/schema';
import { getRenewalMessage } from '../commands/renew/renewal.i18n';

/**
 * Renewal invoice payload structure
 * Stored in Telegram invoice payload field for validation
 */
export interface RenewalInvoicePayload {
  type: 'renewal';
  version: number;
  transactionId: number;
  userSubscriptionId: number;
  tariffId: number;
  timestamp: number;
}

/**
 * Payment Service
 *
 * Handles Telegram Stars payment integration for subscription renewals:
 * - Creating payment invoices
 * - Validating pre-checkout queries
 * - Processing successful payments
 * - Managing payment states
 * - Expiring old pending payments
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  /** Cached bot ID for QuantumDealBot (resolved lazily) */
  private cachedBotId: number | null = null;

  constructor(
    @InjectBot('QuantumDealBot')
    private readonly bot: Telegraf<TelegrafContext>,
    private readonly paymentTransactionsRepo: PaymentTransactionsRepository,
    private readonly renewalTariffsRepo: RenewalTariffsRepository,
    private readonly userSubscriptionsRepo: UserSubscriptionsRepository,
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly botUsersRepo: BotUsersRepository,
    private readonly botsRepo: BotsRepository,
  ) {}

  /**
   * Create renewal invoice and send to user
   * Finds or creates user_subscription for the given subscription
   *
   * @param userId - User's Telegram ID
   * @param subscriptionId - Subscription ID to activate/renew
   * @param tariffId - Selected tariff
   * @returns Transaction ID and invoice message ID
   */
  async createRenewalInvoice(
    userId: number,
    subscriptionId: number,
    tariffId: number,
  ): Promise<{ transactionId: number; invoiceMessageId: number }> {
    // Get tariff details
    const tariff = await this.renewalTariffsRepo.findById(tariffId);
    if (!tariff || !tariff.isActive) {
      throw new BadRequestException('Invalid or inactive tariff');
    }

    // Verify tariff belongs to the requested subscription
    if (tariff.subscriptionId !== subscriptionId) {
      throw new BadRequestException(
        'Tariff does not belong to this subscription',
      );
    }

    // Find or create user_subscription
    let userSubscription =
      await this.userSubscriptionsRepo.findByUserAndSubscription(
        userId,
        subscriptionId,
      );

    if (!userSubscription) {
      // Create new inactive user_subscription
      userSubscription = await this.userSubscriptionsRepo.create({
        userId,
        subscriptionId,
        isActive: false,
        activatedAt: new Date(),
        expiresAt: null,
      });
    }

    // Create payment transaction
    const transaction = await this.paymentTransactionsRepo.create({
      userId,
      userSubscriptionId: userSubscription.id,
      tariffId,
      amountStars: tariff.priceStars,
      periodDays: tariff.periodDays,
      state: PaymentState.PENDING,
    });

    // Create invoice payload
    const payload: RenewalInvoicePayload = {
      type: 'renewal',
      version: 1,
      transactionId: transaction.id,
      userSubscriptionId: userSubscription.id,
      tariffId,
      timestamp: Date.now(),
    };

    // Get subscription and user lang for invoice
    const subscription = await this.subscriptionsRepo.findById(subscriptionId);
    const userLang = await this.resolveUserLang(userId);

    // Send invoice to user
    try {
      const invoiceMessage = await this.bot.telegram.sendInvoice(userId, {
        title: getRenewalMessage(
          userLang,
          'invoiceTitle',
          subscription?.name || '',
        ),
        description: getRenewalMessage(
          userLang,
          'invoiceDescription',
          subscription?.name || '',
          tariff.displayName,
        ),
        payload: JSON.stringify(payload),
        provider_token: '', // Empty for Telegram Stars
        currency: 'XTR', // Telegram Stars
        prices: [
          {
            label: tariff.displayName,
            amount: tariff.priceStars,
          },
        ],
      });

      // Update transaction with invoice ID
      await this.paymentTransactionsRepo.updateState(
        transaction.id,
        PaymentState.PENDING,
        {
          metadata: {
            invoiceMessageId: invoiceMessage.message_id,
          },
        },
      );

      this.logger.log(
        `Created invoice for user ${userId}, transaction ${transaction.id}`,
      );

      return {
        transactionId: transaction.id,
        invoiceMessageId: invoiceMessage.message_id,
      };
    } catch (error) {
      // If invoice creation fails, mark transaction as failed
      await this.paymentTransactionsRepo.updateState(
        transaction.id,
        PaymentState.FAILED,
        {
          failedAt: new Date(),
          failureReason: `Invoice creation failed: ${(error as Error).message}`,
        },
      );

      this.logger.error(
        `Failed to create invoice for transaction ${transaction.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Validate pre-checkout query before payment processing
   *
   * @param payload - Invoice payload from Telegram
   * @param amount - Payment amount in Stars
   * @param userId - User making the payment
   * @returns true if valid, false otherwise
   */
  async validatePreCheckout(
    payload: RenewalInvoicePayload,
    amount: number,
    userId: number,
  ): Promise<boolean> {
    try {
      // Validate payload structure
      if (payload.type !== 'renewal' || !payload.transactionId) {
        this.logger.warn('Invalid payload structure');
        return false;
      }

      // Find transaction
      const transaction = await this.paymentTransactionsRepo.findById(
        payload.transactionId,
      );

      if (!transaction) {
        this.logger.warn(`Transaction ${payload.transactionId} not found`);
        return false;
      }

      // Verify state is PENDING
      if (transaction.state !== (PaymentState.PENDING as string)) {
        this.logger.warn(
          `Transaction ${transaction.id} is not pending (state: ${transaction.state})`,
        );
        return false;
      }

      // Verify amount matches
      if (transaction.amountStars !== amount) {
        this.logger.warn(
          `Amount mismatch for transaction ${transaction.id}: expected ${transaction.amountStars}, got ${amount}`,
        );
        return false;
      }

      // Verify user owns transaction
      if (transaction.userId !== userId) {
        this.logger.warn(
          `User ${userId} does not own transaction ${transaction.id}`,
        );
        return false;
      }

      // Verify subscription still exists
      const subscription = await this.userSubscriptionsRepo.findById(
        transaction.userSubscriptionId,
      );

      if (!subscription) {
        this.logger.warn(
          `Subscription ${transaction.userSubscriptionId} not found`,
        );
        return false;
      }

      this.logger.log(
        `Pre-checkout validation passed for transaction ${transaction.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error('Pre-checkout validation error:', error);
      return false;
    }
  }

  /**
   * Handle successful payment from Telegram
   * Extends subscription and updates transaction state
   *
   * @param payload - Invoice payload
   * @param telegramChargeId - Telegram payment charge ID
   * @param providerChargeId - Optional provider payment charge ID
   */
  async handleSuccessfulPayment(
    payload: RenewalInvoicePayload,
    telegramChargeId: string,
    providerChargeId?: string,
  ): Promise<void> {
    const { transactionId, userSubscriptionId } = payload;

    this.logger.log(
      `Processing successful payment for transaction ${transactionId}`,
    );

    try {
      // 1. Update payment state to PAID
      await this.paymentTransactionsRepo.updateState(
        transactionId,
        PaymentState.PAID,
        {
          paidAt: new Date(),
          telegramPaymentChargeId: telegramChargeId,
          metadata: {
            providerChargeId,
          },
        },
      );

      // 2. Get transaction details
      const transaction =
        await this.paymentTransactionsRepo.findById(transactionId);

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // 3. Extend subscription
      await this.userSubscriptionsRepo.extendSubscription(
        userSubscriptionId,
        transaction.periodDays,
      );

      // 4. Update payment state to COMPLETED
      await this.paymentTransactionsRepo.updateState(
        transactionId,
        PaymentState.COMPLETED,
        {
          completedAt: new Date(),
        },
      );

      this.logger.log(
        `Payment ${transactionId} completed successfully. Subscription ${userSubscriptionId} extended.`,
      );
    } catch (error) {
      this.logger.error(`Failed to process payment ${transactionId}:`, error);

      // Mark payment as failed
      await this.paymentTransactionsRepo.updateState(
        transactionId,
        PaymentState.FAILED,
        {
          failedAt: new Date(),
          failureReason: `Payment processing failed: ${(error as Error).message}`,
        },
      );

      throw error;
    }
  }

  /**
   * Resolve user language for QuantumDealBot
   * Uses botUsersRepository to get the language from bot_users table
   *
   * @param userId - User's Telegram ID
   * @returns User's language preference or 'en' as default
   */
  private async resolveUserLang(userId: number): Promise<string> {
    try {
      // Resolve the bot ID for QuantumDealBot (cached)
      if (this.cachedBotId === null) {
        const bot = await this.botsRepo.findByName('QuantumDealBot');
        this.cachedBotId = bot?.id ?? null;
      }

      if (this.cachedBotId !== null) {
        return this.botUsersRepo.resolveLanguage(
          userId,
          this.cachedBotId,
          'en',
        );
      }

      return 'en';
    } catch (error) {
      this.logger.warn(
        `Failed to resolve user language for ${userId}, defaulting to 'en'`,
        error,
      );
      return 'en';
    }
  }
}
