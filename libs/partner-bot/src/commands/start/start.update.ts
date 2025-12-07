import { Injectable, Logger } from '@nestjs/common';
import { Update, Command, Ctx, RequiresFeature } from '@quantumdeal/telegraf';
import { Markup } from 'telegraf';
import {
  BotMessagesRepository,
  BotUsersRepository,
  BotSettingsRepository,
  UserSubscriptionsRepository,
  BotUser,
  BotUserState,
} from '@quantumdeal/db';
import { PartnerFlowService } from '../../services/partner-flow.service';
import type { PartnerBotContext } from '../../interfaces';
import {
  PARTNER_FLOW_FEATURE_KEY,
  CALLBACK_DATA,
  MESSAGE_KEYS,
} from '../../constants';
import type { PartnerFlowSceneData } from '../../types/scene-data.types';
import { calculateRemainingTimeDisplay } from '../../utils/trial-status.utils';
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
    private readonly botMessagesRepository: BotMessagesRepository,
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
          await this.userSubscriptionsRepository.findActiveByBotUserId(
            botUser.id,
          );
        if (activeSubscriptions.length > 0) {
          // Show trial status (implementation in TASK-003)
          await this.sendTrialStatus(ctx, botUser, lang);
          return;
        }
        // Trial expired, continue to welcome flow
      }

      // 2. If awaiting_channel_subscription -> re-send channel prompt (no welcome)
      if (verificationState === 'awaiting_channel_subscription') {
        // Re-show channel prompt without welcome message
        // Preserve existing verification attempt counter (no state reset)
        await this.partnerFlowService.sendChannelPrompt(userId, botId, lang);

        this.logger.log({
          message: '/start command completed (re-sent channel prompt)',
          userId,
          botId,
          lang,
        });
        return;
      }

      // 3. Default flow: No state or trial_expired -> send welcome + channel prompt
      // Retrieve welcome message
      const welcomeMessage = await this.botMessagesRepository.resolveMessage(
        botId,
        'partner_welcome',
        lang,
      );

      // Get change language button text
      /*
      const changeLangButtonText =
        await this.botMessagesRepository.resolveMessage(
          botId,
          'button_change_language',
          lang,
        );
        */
      // Send welcome message with change language button
      await ctx.reply(welcomeMessage, {
        parse_mode: 'HTML',
      });

      // Initialize verification state
      await this.botUsersRepository.updateState(userId, botId, {
        verificationState: 'awaiting_channel_subscription',
        verificationAttempts: 0,
        lastVerificationAttempt: new Date(),
      } as BotUserState);

      // Send channel subscription prompt
      await this.partnerFlowService.sendChannelPrompt(userId, botId, lang);

      this.logger.log({
        message: '/start command completed',
        userId,
        botId,
        lang,
      });
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
    const botId = ctx.botId;

    // Get active subscription to calculate remaining time
    const subscriptions =
      await this.userSubscriptionsRepository.findActiveByBotUserId(botUser.id);

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
    const remainingTime = calculateRemainingTimeDisplay(expiresAt);
    const displayText =
      remainingTime === 'Expired'
        ? 'Trial: 0 hours remaining'
        : `Trial: ${remainingTime} remaining`;

    // Get trial status message from bot_messages with fallback
    let messageContent: string;
    try {
      messageContent = await this.botMessagesRepository.resolveMessage(
        botId ?? 0,
        MESSAGE_KEYS.TRIAL_ACTIVATED,
        lang,
      );
    } catch {
      messageContent =
        'Your trial is active until {expiryDate}. Days remaining: {daysRemaining}.';
    }

    // Format values for message placeholders
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(
      0,
      Math.ceil(remainingMs / (1000 * 60 * 60 * 24)),
    );
    const expiryDateStr = expiresAt.toLocaleDateString(lang);

    // Replace placeholders
    messageContent = messageContent
      .replace('{daysRemaining}', daysRemaining.toString())
      .replace('{expiryDate}', expiryDateStr);

    // Get change language button text
    let changeLangButtonText = '🌐 Change language';
    try {
      changeLangButtonText = await this.botMessagesRepository.resolveMessage(
        botId ?? 0,
        'button_change_language',
        lang,
      );
    } catch {
      // Use fallback text
    }

    // Get referralUrl from bot settings for conditional button
    const settingsRecord = await this.botSettingsRepository.findByBotId(
      botId ?? 0,
    );
    const referralUrl = (settingsRecord?.settings as PartnerSettings)
      ?.referralUrl;

    // Create trial status button - url if valid referralUrl, otherwise callback
    const trialStatusButton = isValidHttpsUrl(referralUrl)
      ? { text: displayText, url: referralUrl }
      : { text: displayText, callback_data: CALLBACK_DATA.TRIAL_STATUS };

    this.logger.log({
      message: 'Showing trial status',
      userId,
      botId,
      botUserId: botUser.id,
      displayText,
    });

    // Send message with inline keyboard buttons
    await ctx.reply(messageContent, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [trialStatusButton],
          [Markup.button.callback(changeLangButtonText, 'change_lang')],
        ],
      },
    });
  }
}
