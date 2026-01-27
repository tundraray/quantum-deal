import { Injectable, Logger } from '@nestjs/common';
import {
  Scene,
  SceneEnter,
  Action,
  Ctx,
  RequiresFeature,
} from '@quantumdeal/telegraf';
import { Markup, Context } from 'telegraf';
import type { PartnerBotContext } from '../../interfaces';
import { PaymentService } from '@quantumdeal/bot/services/payment.service';
import {
  RenewalTariffsRepository,
  UserSubscriptionsRepository,
} from '@quantumdeal/db';
import { formatDays, RENEWAL_I18N_NAMESPACE } from '../../i18n/renewal.i18n';
import { PARTNER_FLOW_FEATURE_KEY } from '../../constants';
import {
  LocalizationService,
  ILocalizationContext,
} from '@quantumdeal/framework';

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
@RequiresFeature(PARTNER_FLOW_FEATURE_KEY)
@Injectable()
export class RenewalScene {
  private readonly logger = new Logger(RenewalScene.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly renewalTariffsRepo: RenewalTariffsRepository,
    private readonly userSubscriptionsRepo: UserSubscriptionsRepository,
    private readonly localizationService: LocalizationService,
  ) {}

  /**
   * Get localization context for the current request
   */
  private getL10n(ctx: PartnerBotContext): ILocalizationContext {
    const botId = ctx.botId ?? null;
    const lang = ctx.user?.lang ?? 'en';
    return this.localizationService
      .forBot(botId)
      .use(RENEWAL_I18N_NAMESPACE)
      .lang(lang);
  }

  /**
   * Scene entry point
   * Shows all available tariffs grouped by subscription
   */
  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: PartnerBotContext): Promise<void> {
    const botUserId = ctx.user?.botUserId;
    if (!botUserId) {
      const l10n = this.getL10n(ctx);
      this.logger.error(
        `User ${ctx.from?.id} is not authorized to renew subscription for user ${botUserId}`,
      );
      await ctx.reply(await l10n.t('renewal_error_userNotFound'));

      await ctx.scene.leave();
      return;
    }

    try {
      await this.showAllTariffs(ctx, botUserId);
    } catch (error) {
      this.logger.error('Error entering renewal scene:', error);
      const l10n = this.getL10n(ctx);
      await ctx.replyWithHTML(await l10n.t('renewal_error_genericError'));
      await ctx.scene.leave();
    }
  }

  /**
   * Show all available tariffs grouped by subscription
   */
  private async showAllTariffs(
    ctx: PartnerBotContext,
    botUserId: number,
  ): Promise<void> {
    const lang = ctx.user?.lang ?? 'en';
    const l10n = this.getL10n(ctx);

    // Get all active tariffs with subscription info
    const allTariffs = await this.renewalTariffsRepo.findAllWithSubscriptions();

    if (allTariffs.length === 0) {
      await ctx.reply(await l10n.t('renewal_error_noTariffsAvailable'));
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
    let messageText =
      (await l10n.t('renewal_text_selectTariffHeader')) + '\n\n';

    // Add current subscriptions info
    if (userSubscriptions.length > 0) {
      messageText += (await l10n.t('renewal_text_yourSubscriptions')) + '\n';
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
            : await l10n.t('renewal_text_noExpiry');
          const untilText = await l10n.t('renewal_text_until');
          messageText += `${status} ${subscription.name} - ${untilText} ${expiryText}\n`;
        }
      }
      messageText +=
        '\n' + (await l10n.t('renewal_text_availableTariffs')) + ':';
    } else {
      messageText += await l10n.t('renewal_text_noActiveSubscriptionsShort');
    }

    // Build tariff buttons grouped by subscription
    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

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

    const cancelButtonText = await l10n.t('renewal_button_cancel');
    buttons.push([Markup.button.callback(cancelButtonText, 'renew_cancel')]);

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
    ctx: PartnerBotContext,
    userSubscriptionId: number,
    subscriptionName: string,
  ): Promise<void> {
    const lang = ctx.user?.lang ?? 'en';
    const l10n = this.getL10n(ctx);

    // Get subscription details
    const subscription =
      await this.userSubscriptionsRepo.findById(userSubscriptionId);

    if (!subscription) {
      await ctx.reply(await l10n.t('renewal_error_subscriptionNotFound'));
      await ctx.scene.leave();
      return;
    }

    // Get available tariffs for this subscription
    const tariffs = await this.renewalTariffsRepo.findBySubscription(
      subscription.subscriptionId,
    );

    if (tariffs.length === 0) {
      await ctx.reply(await l10n.t('renewal_error_noTariffsAvailable'));
      await ctx.scene.leave();
      return;
    }

    // Calculate current expiry for display
    const currentExpiry = subscription.expiresAt
      ? new Date(subscription.expiresAt)
      : new Date();
    const isExpired = currentExpiry < new Date();

    // Build tariff buttons
    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];
    for (const tariff of tariffs) {
      const buttonText = await l10n.t('renewal_button_tariff', {
        displayName: tariff.displayName,
        stars: tariff.priceStars,
      });
      buttons.push([
        Markup.button.callback(
          buttonText,
          `renew_select_tariff:${userSubscriptionId}:${tariff.id}`,
        ),
      ]);
    }

    const cancelButtonText = await l10n.t('renewal_button_cancel');
    buttons.push([Markup.button.callback(cancelButtonText, 'renew_cancel')]);

    const currentExpiryText = isExpired
      ? await l10n.t('renewal_text_subscriptionExpired')
      : await l10n.t('renewal_text_currentExpiry', {
          date: currentExpiry.toLocaleDateString(
            lang === 'ru' ? 'ru-RU' : 'en-US',
          ),
        });

    const renewalTitle = await l10n.t('renewal_text_renewalTitle', {
      subscriptionName,
    });
    const selectPeriod = await l10n.t('renewal_text_selectPeriod');
    const messageText = `${renewalTitle}\n\n${currentExpiryText}\n\n${selectPeriod}`;

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
  async onSelectSubscription(
    @Ctx() ctx: Context & PartnerBotContext,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const match = (ctx as any).match;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!match || match.length < 2) {
      return;
    }

    const l10n = this.getL10n(ctx);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userSubscriptionId = parseInt(match[1]);

    // Get subscription details
    const subscription =
      await this.userSubscriptionsRepo.findById(userSubscriptionId);

    if (!subscription) {
      await ctx.answerCbQuery(
        await l10n.t('renewal_error_subscriptionNotFound'),
      );
      return;
    }

    const subscriptionName = await l10n.t('renewal_text_subscriptionName', {
      subscriptionId: subscription.subscriptionId,
    });

    await this.showTariffSelection(ctx, userSubscriptionId, subscriptionName);
  }

  /**
   * Handle tariff selection
   * Creates payment invoice and sends to user
   */
  @Action(/^renew_select_tariff:(\d+):(\d+):(\d+)$/)
  async onSelectTariff(@Ctx() ctx: Context & PartnerBotContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const match = (ctx as any).match;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!match || match.length < 4) {
      return;
    }

    const l10n = this.getL10n(ctx);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const botUserId = parseInt(match[1]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const subscriptionId = parseInt(match[2]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const tariffId = parseInt(match[3]);

    if (!ctx.user?.botUserId || ctx.user.botUserId !== botUserId) {
      this.logger.error(
        `User with botUserId ${ctx.user?.botUserId} is not authorized to renew subscription for botUserId ${botUserId}`,
      );
      await ctx.answerCbQuery(await l10n.t('renewal_error_userNotFound'));

      return;
    }

    try {
      // Delete tariff selection message
      await ctx.deleteMessage();

      // Show processing indicator
      await ctx.answerCbQuery(await l10n.t('renewal_text_creatingInvoice'));

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
      await ctx.reply(await l10n.t('renewal_error_paymentCreationFailed'));
      await ctx.scene.leave();
    }
  }

  /**
   * Handle renewal cancellation
   */
  @Action('renew_cancel')
  async onCancel(@Ctx() ctx: PartnerBotContext): Promise<void> {
    const l10n = this.getL10n(ctx);
    await ctx.deleteMessage();
    await ctx.answerCbQuery(await l10n.t('renewal_text_renewalCancelled'));
    await ctx.scene.leave();
  }
}
