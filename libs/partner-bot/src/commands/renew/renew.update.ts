import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  Command,
  Update,
  Ctx,
  On,
  RequiresFeature,
} from '@quantumdeal/telegraf';
import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
} from '@quantumdeal/framework';
import type { UserContext } from '../../interfaces';
import { RENEWAL_SCENE_ID } from './renewal.scene';
import {
  PaymentService,
  RenewalInvoicePayload,
} from '@quantumdeal/bot/services/payment.service';
import { getRenewalMessage } from './renewal.i18n';
import { PARTNER_FLOW_FEATURE_KEY } from '@quantumdeal/partner-bot/constants';

/**
 * RenewUpdate
 *
 * Handles subscription renewal commands and payment webhooks:
 * - /renew command: Opens renewal scene
 * - callback_query 'open_renewal_scene': Opens renewal scene from notification
 * - pre_checkout_query: Validates payment before processing
 * - successful_payment: Processes completed payments
 */
@Update()
@RequiresFeature(PARTNER_FLOW_FEATURE_KEY)
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class RenewUpdate {
  private readonly logger = new Logger(RenewUpdate.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Handle /renew command
   *
   * Opens subscription renewal scene where user can:
   * - View available subscriptions and tariffs
   * - Select renewal period
   * - Make payment via Telegram Stars
   *
   * @param ctx - Telegram context
   */
  @Command('renew')
  async onRenew(@Ctx() ctx: UserContext): Promise<void> {
    if (!ctx.user) {
      await ctx.reply('Сначала нужно зарегистрироваться. Используйте /start');
      return;
    }

    try {
      // Enter renewal scene
      await ctx.scene.enter(RENEWAL_SCENE_ID);
    } catch (error) {
      this.logger.error('Error entering renewal scene', error);
      await ctx.reply(
        'An error occurred while opening renewal options. Please try again later.',
      );
    }
  }

  /**
   * Handle pre-checkout query for payment validation
   *
   * Called before Stars are deducted from user's account.
   * Validates payment parameters and user authorization.
   *
   * @param ctx - Telegram context
   */
  @On('pre_checkout_query')
  async onPreCheckoutQuery(@Ctx() ctx: UserContext): Promise<void> {
    const query = ctx.preCheckoutQuery;

    if (!query) {
      return;
    }

    try {
      // Parse invoice payload
      const payload = JSON.parse(
        query.invoice_payload,
      ) as RenewalInvoicePayload;

      // Validate payment
      const isValid = await this.paymentService.validatePreCheckout(
        payload,
        query.total_amount,
        ctx.user?.botUserId || 0,
      );

      if (isValid) {
        // Allow payment to proceed
        await ctx.answerPreCheckoutQuery(true);
        this.logger.log(
          `Pre-checkout approved for transaction ${payload.transactionId}`,
        );
      } else {
        // Reject payment
        await ctx.answerPreCheckoutQuery(
          false,
          'Payment validation failed. Please try again or contact support.',
        );
        this.logger.warn(
          `Pre-checkout rejected for bot user ${ctx.user?.botUserId}`,
        );
      }
    } catch (error) {
      this.logger.error('Pre-checkout query error:', error);
      await ctx.answerPreCheckoutQuery(
        false,
        'An error occurred. Please try again or contact support.',
      );
    }
  }

  /**
   * Handle successful payment
   *
   * Called after payment is confirmed by Telegram.
   * Extends subscription and sends confirmation to user.
   *
   * @param ctx - Telegram context
   */
  @On('successful_payment')
  async onSuccessfulPayment(@Ctx() ctx: UserContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const payment = (ctx.message as any)?.successful_payment;

    if (!payment) {
      return;
    }

    try {
      // Parse payload
      const payload = JSON.parse(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payment.invoice_payload,
      ) as RenewalInvoicePayload;

      this.logger.log(
        `Processing successful payment for bot user ${ctx.user?.botUserId}, transaction ${payload.transactionId}`,
      );

      // Process payment via service
      await this.paymentService.handleSuccessfulPayment(
        payload,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payment.telegram_payment_charge_id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payment.provider_payment_charge_id,
      );

      // Send confirmation to user
      const lang = ctx.user?.lang || 'en';
      await ctx.reply(getRenewalMessage(lang, 'paymentSuccess'));

      this.logger.log(
        `Payment ${payload.transactionId} completed successfully for bot user ${ctx.user?.botUserId}`,
      );
    } catch (error) {
      this.logger.error('Payment processing error:', error);

      const lang = ctx.user?.lang || 'en';
      await ctx.reply(getRenewalMessage(lang, 'paymentError'));
    }
  }
}
