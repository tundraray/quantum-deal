import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { Action, Ctx, Update, RequiresFeature } from '@quantumdeal/telegraf';
import type { PartnerBotContext } from '../interfaces';
import { BotUsersRepository, BotSettingsRepository } from '@quantumdeal/db';
import { ChannelVerifierService } from '../services/channel-verifier.service';
import { PartnerFlowService } from '../services/partner-flow.service';
import {
  TelegrafExceptionFilter,
  LocalizationService,
} from '@quantumdeal/framework';
import {
  PARTNER_FLOW_FEATURE_KEY,
  CALLBACK_DATA,
  MESSAGE_KEYS,
} from '../constants';
import { resolveChannelInfo } from '../utils/channel.utils';

/**
 * ChannelVerificationAction
 *
 * Handles "I subscribed" button callback for channel membership verification.
 * Coordinates rate limiting, channel verification, and trial activation flow.
 *
 * This handler is only registered on bots where partnerFlowEnabled = true
 * in bot_settings.features (via @RequiresFeature decorator).
 *
 * Flow:
 * 1. Check rate limit (10 attempts per hour)
 * 2. Increment verification attempt counter
 * 3. Verify channel membership
 * 4. If verified: Activate trial and send trial UI
 * 5. If not verified: Send failure message with retry button
 */
@Update()
@RequiresFeature(PARTNER_FLOW_FEATURE_KEY)
@UseFilters(TelegrafExceptionFilter)
@Injectable()
export class ChannelVerificationAction {
  private readonly logger = new Logger(ChannelVerificationAction.name);

  constructor(
    private readonly channelVerifierService: ChannelVerifierService,
    private readonly partnerFlowService: PartnerFlowService,
    private readonly localizationService: LocalizationService,
    private readonly botUsersRepository: BotUsersRepository,
    private readonly botSettingsRepository: BotSettingsRepository,
  ) {}

  /**
   * Handle channel verification callback
   * Callback data: 'partner_verify_subscription'
   *
   * @param ctx - Telegram context with botId injected by middleware
   */
  @Action(CALLBACK_DATA.VERIFY_SUBSCRIPTION)
  async handleVerify(@Ctx() ctx: PartnerBotContext): Promise<void> {
    const botUserId = ctx.user?.botUserId;
    const telegramId = ctx.from?.id;
    const botId = ctx.botId;

    if (!botUserId || !telegramId) {
      this.logger.warn('Missing user context in verification callback');
      await ctx.answerCbQuery?.();
      return;
    }

    if (!botId) {
      this.logger.error({
        message: 'botId not available in context',
        userId: telegramId,
      });
      await ctx.answerCbQuery?.();
      await ctx.reply('Configuration error. Please try again later.');
      return;
    }

    try {
      // Answer callback query immediately
      await ctx.answerCbQuery();

      // Get user language
      const lang = await this.getUserLanguage(
        telegramId,
        botId,
        ctx.from?.language_code,
      );

      // Get partner channel ID
      const channelId = await this.getPartnerChannelId(telegramId, botId);
      if (channelId) {
        // Verify channel membership
        const isMember = await this.channelVerifierService.verifyMembership(
          channelId,
          telegramId,
          botId,
        );

        if (!isMember) {
          await this.sendVerificationFailedMessage(
            telegramId,
            botId,
            lang,
            channelId,
            ctx,
          );
          return;
        }
      }

      // Handle successful verification and trial activation
      await this.handleSuccessfulVerification(telegramId, botId, lang, ctx);
    } catch (error) {
      this.logger.error({
        message: 'Error during channel verification',
        userId: telegramId,
        botId,
        error: (error as Error).message,
      });

      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  /**
   * Get user language with fallback
   */
  private async getUserLanguage(
    userId: number,
    botId: number,
    languageCode?: string,
  ): Promise<string> {
    return this.botUsersRepository.resolveLanguage(
      userId,
      botId,
      languageCode ?? 'en',
    );
  }

  /**
   * Get partner channel ID from settings
   * @returns channel ID or null if not configured
   */
  private async getPartnerChannelId(
    userId: number,
    botId: number,
  ): Promise<string | null> {
    const settingsRecord = await this.botSettingsRepository.findByBotId(botId);

    const settings = settingsRecord?.settings as { channelId?: string };
    if (!settings?.channelId) {
      this.logger.error({
        message: 'Partner configuration missing',
        userId,
        botId,
      });

      return null;
    }

    return settings.channelId;
  }

  /**
   * Send verification failed message with retry button
   */
  private async sendVerificationFailedMessage(
    userId: number,
    botId: number,
    lang: string,
    channelId: string,
    ctx: PartnerBotContext,
  ): Promise<void> {
    // Get localization context
    const l10n = this.localizationService.forBot(botId).lang(lang);

    // Calculate channel name and URL for interpolation
    const channel = resolveChannelInfo(channelId);
    const failureMessage = await l10n.t(MESSAGE_KEYS.VERIFICATION_FAILED, {
      channelName: channel.name,
      channelUrl: channel.url,
    });

    await ctx.reply(failureMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Try Again',
              callback_data: CALLBACK_DATA.VERIFY_SUBSCRIPTION,
            },
          ],
        ],
      },
    });

    this.logger.debug({
      message: 'Channel verification failed',
      userId,
      botId,
      channelId,
    });
  }

  /**
   * Handle successful verification and activate trial
   */
  private async handleSuccessfulVerification(
    userId: number,
    botId: number,
    lang: string,
    ctx: PartnerBotContext,
  ): Promise<void> {
    const result = await this.partnerFlowService.handleVerificationRequest(
      userId,
      botId,
    );

    if (!result.verified) {
      await ctx.reply(
        result.error ?? 'Verification failed. Please try again later.',
      );

      this.logger.error({
        message: 'Verification request handling failed',
        userId,
        botId,
        error: result.error,
      });

      return;
    }

    // Send trial UI
    const trialExpiresAt = result.trialExpiresAt ?? new Date();
    await this.partnerFlowService.sendTrialUI(
      userId,
      botId,
      lang,
      trialExpiresAt,
    );

    this.logger.log({
      message: 'Channel verification and trial activation successful',
      userId,
      botId,
      expiresAt: trialExpiresAt,
    });
  }
}
