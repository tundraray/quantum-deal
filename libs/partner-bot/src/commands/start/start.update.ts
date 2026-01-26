import { Injectable, Logger } from '@nestjs/common';
import { Update, Command, Ctx, RequiresFeature } from '@quantumdeal/telegraf';
import { Markup } from 'telegraf';
import {
  BotUsersRepository,
  BotSettingsRepository,
  UserSubscriptionsRepository,
  BotUser,
} from '@quantumdeal/db';
import { LocalizationService } from '@quantumdeal/framework';
import { PartnerFlowService } from '../../services/partner-flow.service';
import type { PartnerBotContext } from '../../interfaces';
import {
  PARTNER_FLOW_FEATURE_KEY,
  CALLBACK_DATA,
  MESSAGE_KEYS,
  BUTTON_KEYS,
} from '../../constants';
import type { PartnerFlowSceneData } from '../../types/scene-data.types';
import { isValidHttpsUrl } from '../../utils/url-validation.utils';
import type { PartnerSettings } from '../../types/partner-settings';

/**
 * Handles /start command for partner bot flow.
 * Sends welcome message and initiates channel subscription prompt flow.
 *
 * This handler is only registered on bots where partnerFlowEnabled = true
 * in bot_settings.features (via @RequiresFeature decorator).
 *
 * Flow:
 * 1. User sends /start command
 * 2. Send partner_welcome message
 * 3. Initialize bot_users.state.verification to 'awaiting_channel_subscription'
 * 4. Call PartnerFlowService.sendChannelPrompt()
 *
 * Integration:
 * - BotMessagesRepository: Resolve partner_welcome message with fallback chain
 * - BotUsersRepository: Update verification state
 * - PartnerFlowService: Send channel subscription prompt
 */
@Update()
@RequiresFeature(PARTNER_FLOW_FEATURE_KEY)
@Injectable()
export class StartCommandUpdate {
  private readonly logger = new Logger(StartCommandUpdate.name);

  constructor(
    private readonly localizationService: LocalizationService,
    private readonly partnerFlowService: PartnerFlowService,
    private readonly botUsersRepository: BotUsersRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly botSettingsRepository: BotSettingsRepository,
  ) {}

  /**
   * Handle /start command
   *
   * @param ctx - Telegram context with botId injected by middleware
   */
  @Command('start')
  async handleStart(@Ctx() ctx: PartnerBotContext): Promise<void> {
    if (!ctx.from) {
      this.logger.debug('No user context found');
      return;
    }

    const userId = ctx.from.id;
    const defaultLang = ctx.from.language_code || 'en';
    const botId = ctx.botId;

    if (!botId) {
      this.logger.error({
        message: 'botId not available in context',
        userId,
      });
      await ctx.reply('Configuration error. Please try again later.');
      return;
    }

    try {
      // Resolve user language from bot_users or fallback
      const lang = await this.botUsersRepository.resolveLanguage(
        userId,
        botId,
        defaultLang,
      );

      // Get botUser from context (populated by middleware)
      const botUser = await this.botUsersRepository.findByUserAndBot(
        userId,
        botId,
      );
      const sceneData = botUser?.state?.sceneData as
        | PartnerFlowSceneData
        | undefined;
      const verificationState = sceneData?.verificationState;

      // State-aware routing (AC-1)
      // 1. If trial_activated with active subscription -> show trial status
      if (verificationState === 'trial_activated' && botUser) {
        const activeSubscriptions =
          await this.userSubscriptionsRepository.findActiveWithExpiredByBotUserId(
            botUser.id,
          );
        if (activeSubscriptions.length > 0) {
          // Show trial status (implementation in TASK-003)
          await this.sendTrialStatus(ctx, botUser, lang);
          return;
        }
        // Trial expired, continue to welcome flow
      }

      await this.partnerFlowService.sendChannelPrompt(
        userId,
        botId,
        lang,
        verificationState,
      );
    } catch (error) {
      this.logger.error({
        message: 'Error in /start command',
        userId,
        botId,
        error: (error as Error).message,
      });

      // Send generic error message to user
      await ctx
        .reply('Sorry, something went wrong. Please try again later.')
        .catch((e) => {
          this.logger.error({
            message: 'Failed to send error message',
            error: (e as Error).message,
          });
        });
    }
  }

  /**
   * Send trial status message with remaining time button
   *
   * Displays current trial status with a button showing remaining time.
   * - >= 1 day: "Trial: X days remaining"
   * - < 1 day: "Trial: Y hours remaining"
   *
   * @param ctx - Telegram context
   * @param botUser - Bot user with trial data
   * @param lang - User language code
   */
  private async sendTrialStatus(
    ctx: PartnerBotContext,
    botUser: BotUser,
    lang: string,
  ): Promise<void> {
    const userId = ctx.from?.id;
    const botId = ctx.botId!;

    // Get active subscription to calculate remaining time
    const subscriptions =
      await this.userSubscriptionsRepository.findActiveWithExpiredByBotUserId(
        botUser.id,
      );

    if (subscriptions.length === 0) {
      // No active subscription, fall back to welcome flow
      this.logger.warn({
        message: 'No active subscription found in sendTrialStatus',
        userId,
        botId,
        botUserId: botUser.id,
      });
      return;
    }

    const subscription = subscriptions[0];
    // Active subscriptions from findActiveByBotUserId always have expiresAt (filtered by SQL)
    if (!subscription.expiresAt) {
      this.logger.warn({
        message: 'Active subscription missing expiresAt',
        userId,
        botId,
        botUserId: botUser.id,
      });
      return;
    }
    const expiresAt = new Date(subscription.expiresAt);

    // Get trial status message via LocalizationService
    const l10n = this.localizationService.forBot(botId).lang(lang);
    const messageContent = await l10n.t(MESSAGE_KEYS.TRIAL_ACTIVATED, {
      expiryDate: expiresAt.toLocaleDateString(lang),
      daysRemaining: Math.max(
        0,
        Math.ceil(
          (expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        ),
      ).toString(),
    });

    // Get button texts via LocalizationService
    const changeLangButtonText = await l10n.t(BUTTON_KEYS.CHANGE_LANGUAGE);
    const buySubscriptionButtonText = await l10n.t(
      BUTTON_KEYS.BUY_SUBSCRIPTION,
    );
    const extendTrialButtonText = await l10n.t(BUTTON_KEYS.EXTEND_TRIAL);

    // Get referralUrl from bot settings for conditional button
    const settingsRecord = await this.botSettingsRepository.findByBotId(
      botId ?? 0,
    );
    const botSettings = settingsRecord?.settings as PartnerSettings;
    const referralUrl = botSettings?.referralUrl;
    const defaultSubscriptionId = botSettings?.defaultSubscriptionId;

    // Create extend trial button conditionally (url if valid HTTPS, callback_data otherwise)
    const extendTrialButton = isValidHttpsUrl(referralUrl ?? '')
      ? Markup.button.url(extendTrialButtonText, referralUrl!)
      : Markup.button.callback(
          extendTrialButtonText,
          CALLBACK_DATA.EXTEND_TRIAL,
        );

    // Send message with inline keyboard buttons
    await ctx.reply(messageContent, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [extendTrialButton],
          [
            Markup.button.callback(changeLangButtonText, 'change_lang'),
            Markup.button.callback(
              buySubscriptionButtonText,
              `renew_now:${subscription.id}:${defaultSubscriptionId}`,
            ),
          ],
        ],
      },
    });
  }
}
