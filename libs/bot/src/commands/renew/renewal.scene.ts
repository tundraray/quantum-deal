import { Injectable, Logger } from '@nestjs/common';
import { Scene, SceneEnter, Action, Ctx } from '@quantumdeal/telegraf';
import { Markup, Context } from 'telegraf';
import type { UserContext } from '../../interfaces';
import { PaymentService } from '../../services/payment.service';
import {
  RenewalTariffsRepository,
  UserSubscriptionsRepository,
  SubscriptionsRepository,
} from '@quantumdeal/db';
import { getRenewalMessage, formatDays } from './renewal.i18n';

export const RENEWAL_SCENE_ID = 'renewal';

/**
 * RenewalScene
 *
 * Handles subscription renewal UI flow:
 * 1. Show all available subscriptions with tariffs
 * 2. User selects tariff (can be for their current or new subscription)
 * 3. Create and send payment invoice
 */
@Scene(RENEWAL_SCENE_ID)
@Injectable()
export class RenewalScene {
  private readonly logger = new Logger(RenewalScene.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly renewalTariffsRepo: RenewalTariffsRepository,
    private readonly userSubscriptionsRepo: UserSubscriptionsRepository,
    private readonly subscriptionsRepo: SubscriptionsRepository,
  ) {}

  /**
   * Scene entry point
   * Shows all available tariffs grouped by subscription
   */
  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: UserContext): Promise<void> {
    const botUserId = ctx.user?.botUserId;
    if (!botUserId) {
      await ctx.reply('Ошибка: пользователь не найден');
      await ctx.scene.leave();
      return;
    }

    try {
      await this.showAllTariffs(ctx, botUserId);
    } catch (error) {
      this.logger.error('Error entering renewal scene:', error);
      const lang = ctx.user?.lang || 'en';
      await ctx.replyWithHTML(getRenewalMessage(lang, 'genericError'));
      await ctx.scene.leave();
    }
  }

  /**
   * Show all available tariffs grouped by subscription
   */
  private async showAllTariffs(
    ctx: UserContext,
    botUserId: number,
  ): Promise<void> {
    const lang = ctx.user?.lang || 'en';

    // Get all active tariffs with subscription info
    const allTariffs = await this.renewalTariffsRepo.findAllWithSubscriptions();

    if (allTariffs.length === 0) {
      await ctx.reply(getRenewalMessage(lang, 'noTariffsAvailable'));
      await ctx.scene.leave();
      return;
    }

    // Get user's active subscriptions
    const userSubscriptions =
      await this.userSubscriptionsRepo.findActiveByBotUserId(botUserId);

    // Group tariffs by subscription
    const subscriptionGroups = new Map<number, typeof allTariffs>();
    for (const tariff of allTariffs) {
      const existing = subscriptionGroups.get(tariff.subscriptionId) || [];
      existing.push(tariff);
      subscriptionGroups.set(tariff.subscriptionId, existing);
    }

    // Build message text with subscription status
    let messageText = getRenewalMessage(lang, 'selectTariffHeader') + '\n\n';

    // Add current subscriptions info
    if (userSubscriptions.length > 0) {
      messageText += getRenewalMessage(lang, 'yourSubscriptions') + '\n';
      for (const userSub of userSubscriptions) {
        const subscription = allTariffs.find(
          (t) => t.subscriptionId === userSub.subscriptionId,
        )?.subscription;
        if (subscription) {
          const status = userSub.isActive ? '✅' : '❌';
          const expiryText = userSub.expiresAt
            ? new Date(userSub.expiresAt).toLocaleDateString(
                lang === 'ru' ? 'ru-RU' : 'en-US',
              )
            : getRenewalMessage(lang, 'noExpiry');
          messageText += `${status} ${subscription.name} - ${getRenewalMessage(lang, 'until')} ${expiryText}\n`;
        }
      }
      messageText += '\n' + getRenewalMessage(lang, 'availableTariffs') + ':';
    } else {
      messageText += getRenewalMessage(lang, 'noActiveSubscriptionsShort');
    }

    // Build tariff buttons grouped by subscription
    const buttons: any[] = [];

    for (const [, tariffs] of subscriptionGroups) {
      const subscription = tariffs[0].subscription;

      // Add subscription header (just visual separator in text above)
      for (const tariff of tariffs) {
        let priceText = '';

        if (tariff.discountPercent) {
          // Calculate original price before discount
          const originalPrice = Math.round(
            tariff.priceStars / (1 - tariff.discountPercent / 100),
          );
          // Show strikethrough original price + discounted price
          const strikethrough = String(originalPrice)
            .split('')
            .map((char) => char + '\u0336')
            .join('');
          priceText = `${strikethrough} ${tariff.priceStars}⭐ 🔥-${tariff.discountPercent}%`;
        } else {
          priceText = `${tariff.priceStars}⭐`;
        }

        const periodText = formatDays(lang, tariff.periodDays);
        const buttonText = `${subscription.name} • ${periodText} • ${priceText}`;

        buttons.push([
          Markup.button.callback(
            buttonText,
            `renew_select_tariff:${botUserId}:${tariff.subscriptionId}:${tariff.id}`,
          ),
        ]);
      }
    }

    buttons.push([
      Markup.button.callback(getRenewalMessage(lang, 'cancel'), 'renew_cancel'),
    ]);

    const keyboard = Markup.inlineKeyboard(buttons);

    if (ctx.callbackQuery) {
      await ctx.reply(messageText, keyboard);
      await ctx.answerCbQuery();
    } else {
      await ctx.reply(messageText, keyboard);
    }
  }

  /**
   * Show tariff selection menu for a specific subscription
   */
  private async showTariffSelection(
    ctx: UserContext,
    userSubscriptionId: number,
    subscriptionName: string,
  ): Promise<void> {
    const lang = ctx.user?.lang || 'en';

    // Get subscription details
    const subscription =
      await this.userSubscriptionsRepo.findById(userSubscriptionId);

    if (!subscription) {
      await ctx.reply(getRenewalMessage(lang, 'subscriptionNotFound'));
      await ctx.scene.leave();
      return;
    }

    // Get available tariffs for this subscription
    const tariffs = await this.renewalTariffsRepo.findBySubscription(
      subscription.subscriptionId,
    );

    if (tariffs.length === 0) {
      await ctx.reply(getRenewalMessage(lang, 'noTariffsAvailable'));
      await ctx.scene.leave();
      return;
    }

    // Calculate current expiry for display
    const currentExpiry = subscription.expiresAt
      ? new Date(subscription.expiresAt)
      : new Date();
    const isExpired = currentExpiry < new Date();

    // Build tariff buttons
    const buttons = tariffs.map((tariff) => {
      return [
        Markup.button.callback(
          getRenewalMessage(
            lang,
            'tariffButton',
            tariff.displayName,
            tariff.priceStars,
          ),
          `renew_select_tariff:${userSubscriptionId}:${tariff.id}`,
        ),
      ];
    });

    buttons.push([
      Markup.button.callback(getRenewalMessage(lang, 'cancel'), 'renew_cancel'),
    ]);

    const currentExpiryText = isExpired
      ? getRenewalMessage(lang, 'subscriptionExpired')
      : getRenewalMessage(
          lang,
          'currentExpiry',
          currentExpiry.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US'),
        );

    const messageText =
      `${getRenewalMessage(lang, 'renewalTitle', subscriptionName)}\n\n` +
      `${currentExpiryText}\n\n` +
      getRenewalMessage(lang, 'selectPeriod');

    const keyboard = Markup.inlineKeyboard(buttons);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(messageText, keyboard);
      await ctx.answerCbQuery();
    } else {
      await ctx.reply(messageText, keyboard);
    }
  }

  /**
   * Handle subscription selection (when user has multiple subscriptions)
   */
  @Action(/^renew_select_sub:(.+)$/)
  async onSelectSubscription(@Ctx() ctx: Context & UserContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const match = (ctx as any).match;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!match || match.length < 2) {
      return;
    }

    const lang = ctx.user?.lang || 'en';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userSubscriptionId = parseInt(match[1]);

    // Get subscription details
    const subscription =
      await this.userSubscriptionsRepo.findById(userSubscriptionId);

    if (!subscription) {
      await ctx.answerCbQuery(getRenewalMessage(lang, 'subscriptionNotFound'));
      return;
    }

    await this.showTariffSelection(
      ctx,
      userSubscriptionId,
      getRenewalMessage(lang, 'subscriptionName', subscription.subscriptionId),
    );
  }

  /**
   * Handle tariff selection
   * Creates payment invoice and sends to user
   */
  @Action(/^renew_select_tariff:(\d+):(\d+):(\d+)$/)
  async onSelectTariff(@Ctx() ctx: Context & UserContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const match = (ctx as any).match;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!match || match.length < 4) {
      return;
    }

    const lang = ctx.user?.lang || 'en';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const botUserId = parseInt(match[1]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const subscriptionId = parseInt(match[2]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const tariffId = parseInt(match[3]);

    if (!ctx.from?.id || ctx.from.id !== botUserId) {
      await ctx.answerCbQuery(getRenewalMessage(lang, 'userNotFound'));
      return;
    }

    try {
      // Delete tariff selection message
      await ctx.deleteMessage();

      // Show processing indicator
      await ctx.answerCbQuery(getRenewalMessage(lang, 'creatingInvoice'));

      // Create invoice
      const { transactionId, invoiceMessageId } =
        await this.paymentService.createRenewalInvoice(
          botUserId,
          subscriptionId,
          tariffId,
        );

      this.logger.log(
        `Created renewal invoice for bot user ${botUserId}, subscription ${subscriptionId}, transaction ${transactionId}, message ${invoiceMessageId}`,
      );

      // Invoice is automatically sent by Telegram
      // User will see "Pay" button in the invoice message

      // Leave scene after creating invoice
      await ctx.scene.leave();
    } catch (error) {
      this.logger.error('Error creating renewal invoice:', error);
      await ctx.reply(getRenewalMessage(lang, 'paymentCreationFailed'));
      await ctx.scene.leave();
    }
  }

  /**
   * Handle renewal cancellation
   */
  @Action('renew_cancel')
  async onCancel(@Ctx() ctx: UserContext): Promise<void> {
    const lang = ctx.user?.lang || 'en';
    await ctx.deleteMessage();
    await ctx.answerCbQuery(getRenewalMessage(lang, 'renewalCancelled'));
    await ctx.scene.leave();
  }
}
