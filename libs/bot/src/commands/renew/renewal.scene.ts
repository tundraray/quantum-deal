import { Injectable, Logger } from '@nestjs/common';
import { Scene, SceneEnter, Action, Ctx, On } from '@quantumdeal/telegraf';
import { Markup, Context } from 'telegraf';
import type { UserContext } from '../../interfaces';
import { PaymentService } from '../../services/payment.service';
import {
  PromocodeService,
  type DiscountInfo,
} from '../../services/promocode.service';
import {
  RenewalTariffsRepository,
  UserSubscriptionsRepository,
  BotUsersRepository,
} from '@quantumdeal/db';
import {
  getRenewalMessage,
  formatDays,
  getPromocodeErrorMessage,
  type PromocodeErrorCode,
} from './renewal.i18n';

export const RENEWAL_SCENE_ID = 'renewal';

/**
 * Scene state interface for promocode flow
 */
interface RenewalSceneState {
  awaitingPromocode?: boolean;
  discount?: DiscountInfo | null;
  validatedPromocodeId?: number;
}

/**
 * Format discount for display
 */
function formatDiscount(discount: DiscountInfo): string {
  if (discount.type === 'percentage') {
    return `${discount.value}%`;
  }
  return `${discount.value} Stars`;
}

/**
 * Create strikethrough text using Unicode combining characters
 */
function strikethrough(text: string): string {
  return text
    .split('')
    .map((char) => char + '\u0336')
    .join('');
}

/**
 * RenewalScene
 *
 * Handles subscription renewal UI flow:
 * 1. Show all available subscriptions with tariffs
 * 2. User can enter promocode for discount
 * 3. User selects tariff (can be for their current or new subscription)
 * 4. Create and send payment invoice with discount if applicable
 */
@Scene(RENEWAL_SCENE_ID)
@Injectable()
export class RenewalScene {
  private readonly logger = new Logger(RenewalScene.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly promocodeService: PromocodeService,
    private readonly renewalTariffsRepo: RenewalTariffsRepository,
    private readonly userSubscriptionsRepo: UserSubscriptionsRepository,
    private readonly botUsersRepo: BotUsersRepository,
  ) {}

  /**
   * Get scene state with type safety
   */
  private getSceneState(ctx: UserContext): RenewalSceneState {
    // Access scene state through ctx.scene.state
    const sceneCtx = ctx as unknown as { scene: { state: RenewalSceneState } };
    if (!sceneCtx.scene.state) {
      sceneCtx.scene.state = {};
    }
    return sceneCtx.scene.state;
  }

  /**
   * Scene entry point
   * Shows all available tariffs grouped by subscription
   */
  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: UserContext): Promise<void> {
    const botUserId = ctx.user?.botUserId;
    if (!botUserId) {
      await ctx.reply('Error: user not found');
      await ctx.scene.leave();
      return;
    }

    try {
      // Check for existing user discount
      const state = this.getSceneState(ctx);

      // Get first subscription to check for discount
      const allTariffs =
        await this.renewalTariffsRepo.findAllWithSubscriptions();
      if (allTariffs.length > 0) {
        const subscriptionId = allTariffs[0].subscriptionId;
        const existingDiscount =
          await this.promocodeService.getUserActiveDiscount(
            botUserId,
            subscriptionId,
          );

        if (existingDiscount) {
          state.discount =
            this.promocodeService.userDiscountToDiscountInfo(existingDiscount);
        }
      }

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
    const state = this.getSceneState(ctx);

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

    // Add discount info if available
    if (state.discount) {
      messageText +=
        getRenewalMessage(
          lang,
          'activeDiscount',
          formatDiscount(state.discount),
        ) + '\n\n';
    }

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
    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    for (const [, tariffs] of subscriptionGroups) {
      const subscription = tariffs[0].subscription;

      // Add subscription header (just visual separator in text above)
      for (const tariff of tariffs) {
        let priceText = '';
        const discount = state.discount;

        if (discount) {
          // Apply user discount
          const discountedPrice =
            this.promocodeService.calculateDiscountedPrice(
              tariff.priceStars,
              discount,
            );
          const savings = tariff.priceStars - discountedPrice;

          if (savings > 0) {
            // Show strikethrough original price + discounted price
            priceText = `${strikethrough(String(tariff.priceStars))} ${discountedPrice}⭐`;
          } else {
            priceText = `${tariff.priceStars}⭐`;
          }
        } else if (tariff.discountPercent) {
          // Calculate original price before tariff-level discount (for display)
          const originalPrice = Math.round(
            tariff.priceStars / (1 - tariff.discountPercent / 100),
          );
          // Show strikethrough original price + discounted price
          priceText = `${strikethrough(String(originalPrice))} ${tariff.priceStars}⭐ 🔥-${tariff.discountPercent}%`;
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

    // Add promocode button
    buttons.push([
      Markup.button.callback(
        getRenewalMessage(lang, 'enterPromocode'),
        'renew_enter_promocode',
      ),
    ]);

    buttons.push([
      Markup.button.callback(getRenewalMessage(lang, 'cancel'), 'renew_cancel'),
    ]);

    const keyboard = Markup.inlineKeyboard(buttons);

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(messageText, keyboard);
        await ctx.answerCbQuery();
      } catch {
        // Message not modified or deleted, send new one
        await ctx.reply(messageText, keyboard);
        await ctx.answerCbQuery();
      }
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
   * Handle promocode entry button click
   */
  @Action('renew_enter_promocode')
  async onEnterPromocode(@Ctx() ctx: UserContext): Promise<void> {
    const lang = ctx.user?.lang || 'en';
    const state = this.getSceneState(ctx);

    // Set state to await promocode input
    state.awaitingPromocode = true;

    const buttons = [
      [
        Markup.button.callback(
          getRenewalMessage(lang, 'backToTariffs'),
          'renew_back_to_tariffs',
        ),
      ],
    ];

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.editMessageText(
      getRenewalMessage(lang, 'promocodePrompt'),
      keyboard,
    );
    await ctx.answerCbQuery();
  }

  /**
   * Handle back to tariffs button
   */
  @Action('renew_back_to_tariffs')
  async onBackToTariffs(@Ctx() ctx: UserContext): Promise<void> {
    const state = this.getSceneState(ctx);
    state.awaitingPromocode = false;

    const botUserId = ctx.user?.botUserId;
    if (!botUserId) {
      await ctx.answerCbQuery('Error');
      return;
    }

    await this.showAllTariffs(ctx, botUserId);
  }

  /**
   * Handle text input for promocode
   */
  @On('text')
  async onTextInput(@Ctx() ctx: UserContext): Promise<void> {
    const state = this.getSceneState(ctx);

    // Only process if we're awaiting promocode
    if (!state.awaitingPromocode) {
      return;
    }

    const botUserId = ctx.user?.botUserId;
    if (!botUserId) {
      return;
    }

    const lang = ctx.user?.lang || 'en';
    const message = ctx.message;

    if (!message || !('text' in message)) {
      return;
    }

    const code = message.text.trim().toUpperCase();

    // Get bot ID for the user
    const botUser = await this.botUsersRepo.findById(botUserId);
    const botId = botUser?.botId ?? null;

    // Validate promocode
    const validationResult = await this.promocodeService.validatePromocode(
      code,
      botUserId,
      botId,
    );

    if (!validationResult.ok) {
      // Show error and prompt to try again
      const errorMessage = getPromocodeErrorMessage(
        lang,
        validationResult.error as PromocodeErrorCode,
      );

      const buttons = [
        [
          Markup.button.callback(
            getRenewalMessage(lang, 'backToTariffs'),
            'renew_back_to_tariffs',
          ),
        ],
      ];

      await ctx.reply(
        `${errorMessage}\n\n${getRenewalMessage(lang, 'promocodePrompt')}`,
        Markup.inlineKeyboard(buttons),
      );
      return;
    }

    // Promocode valid - store discount info
    const promocode = validationResult.promocode!;
    state.discount = this.promocodeService.promocodeToDiscountInfo(promocode);
    state.validatedPromocodeId = promocode.id;
    state.awaitingPromocode = false;

    // Show success message and return to tariffs
    await ctx.reply(
      getRenewalMessage(
        lang,
        'promocodeSuccess',
        formatDiscount(state.discount),
      ),
    );

    await this.showAllTariffs(ctx, botUserId);
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    const botUserId = parseInt(match[1]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    const subscriptionId = parseInt(match[2]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    const tariffId = parseInt(match[3]);

    if (!ctx.user?.botUserId || ctx.user.botUserId !== botUserId) {
      await ctx.answerCbQuery(getRenewalMessage(lang, 'userNotFound'));
      return;
    }

    const state = this.getSceneState(ctx);

    try {
      // Delete tariff selection message
      await ctx.deleteMessage();

      // Show processing indicator
      await ctx.answerCbQuery(getRenewalMessage(lang, 'creatingInvoice'));

      // Create invoice with discount if available
      const { transactionId, invoiceMessageId } =
        await this.paymentService.createRenewalInvoice(
          botUserId,
          subscriptionId,
          tariffId,
          state.discount ?? undefined,
          state.validatedPromocodeId,
        );

      this.logger.log(
        `Created renewal invoice for bot user ${botUserId}, subscription ${subscriptionId}, transaction ${transactionId}, message ${invoiceMessageId}${state.discount ? ', with discount' : ''}`,
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
