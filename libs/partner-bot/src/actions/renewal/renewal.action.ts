import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { Action, Ctx, RequiresFeature, Update } from '@quantumdeal/telegraf';
import type { PartnerBotContext } from '../../interfaces';
import {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
  RenewalTariffsRepository,
} from '@quantumdeal/db';
import { TelegrafExceptionFilter } from '@quantumdeal/framework';
import { PARTNER_FLOW_FEATURE_KEY } from '@quantumdeal/partner-bot/constants';
import { PaymentService } from '@quantumdeal/bot/services/payment.service';

/**
 * Renewal Action
 *
 * Handles one-click renewal from expiration reminders
 * Sends Telegram Stars invoice immediately with pre-filled subscription details
 */
@Update()
@RequiresFeature(PARTNER_FLOW_FEATURE_KEY)
@UseFilters(TelegrafExceptionFilter)
@Injectable()
export class RenewalAction {
  private readonly logger = new Logger(RenewalAction.name);

  constructor(
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly renewalTariffsRepository: RenewalTariffsRepository,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Handle one-click renewal callback
   * Callback data format: 'renew_now:{userSubscriptionId}:{subscriptionId}'
   *
   * Flow:
   * 1. Parse userSubscriptionId and subscriptionId from callback_data
   * 2. Verify ownership and subscription validity
   * 3. Fetch renewal tariff (first available)
   * 4. Send Telegram Stars invoice
   */
  @Action(/^renew_now:(\d+):(\d+)$/)
  async handleRenewNow(@Ctx() ctx: PartnerBotContext): Promise<void> {
    const user = ctx.user;
    if (!user) {
      await ctx.answerCbQuery('User not found');
      return;
    }

    try {
      // Answer callback query immediately
      await ctx.answerCbQuery();

      // Parse IDs from callback_data
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const callbackData = ctx.callbackQuery?.['data'];

      if (typeof callbackData !== 'string') {
        await ctx.reply('Invalid renewal request');
        return;
      }

      const match = callbackData.match(/^renew_now:(\d+):(\d+)$/);
      if (!match) {
        await ctx.reply('Invalid renewal request');
        return;
      }

      const userSubscriptionId = parseInt(match[1], 10);
      const subscriptionId = parseInt(match[2], 10);

      // Send typing indicator
      await ctx.sendChatAction('typing');

      // Fetch user subscription
      const userSubscription =
        await this.userSubscriptionsRepository.findById(userSubscriptionId);

      if (!userSubscription) {
        await ctx.reply('Subscription not found');
        return;
      }

      // Verify ownership
      if (userSubscription.botUserId !== user.botUserId) {
        await ctx.reply('This subscription does not belong to you');
        return;
      }

      // Fetch subscription details
      const subscription =
        await this.subscriptionsRepository.findById(subscriptionId);

      if (!subscription) {
        await ctx.reply('Subscription plan not found');
        return;
      }

      // Fetch renewal tariffs (get first available tariff for this subscription)
      const tariffs =
        await this.renewalTariffsRepository.findBySubscription(subscriptionId);

      if (!tariffs || tariffs.length === 0) {
        await ctx.reply('No renewal options available for this subscription');
        return;
      }

      // Use first tariff (sorted by sort_order, then period_days)
      const tariff = tariffs[0];

      const { transactionId, invoiceMessageId } =
        await this.paymentService.createRenewalInvoice(
          user.botUserId,
          subscriptionId,
          tariff.id,
        );

      this.logger.log(
        `Created renewal invoice for bot user ${user.botUserId}, subscription ${subscriptionId}, transaction ${transactionId}, message ${invoiceMessageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling renewal for bot user ${user.botUserId}`,
        error,
      );
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  /**
   * Handle "View Plans" button from /start command
   * Callback data format: 'open_renewal_scene'
   *
   * Opens the renewal scene to show all available subscription plans.
   * This provides users with a direct path to view and purchase subscriptions.
   *
   * Flow:
   * 1. Answer callback query to clear loading state
   * 2. Enter renewal scene
   * 3. Scene displays available subscriptions with tariff options
   */
  @Action('open_renewal_scene')
  async handleOpenRenewalScene(@Ctx() ctx: PartnerBotContext): Promise<void> {
    this.logger.debug('handleOpenRenewalScene called'); // DEBUG LOG

    const user = ctx.user;
    if (!user) {
      this.logger.warn('No user in context'); // WARN LOG
      await ctx.answerCbQuery('User not found');
      return;
    }

    this.logger.debug(`Bot user ${user.botUserId} opening renewal scene`); // DEBUG LOG

    try {
      // Answer callback query immediately
      await ctx.answerCbQuery();
      this.logger.debug('Callback query answered'); // DEBUG LOG

      // Enter renewal scene
      await ctx.scene.enter('renewal');
      this.logger.debug('Scene entered successfully'); // DEBUG LOG

      this.logger.log(
        `Bot user ${user.botUserId} opened renewal scene from View Plans button`,
      );
    } catch (error) {
      this.logger.error(
        `Error opening renewal scene for bot user ${user.botUserId}`,
        error,
      );
      await ctx.reply(
        'An error occurred. Please try /renew command or contact support.',
      );
    }
  }
}
