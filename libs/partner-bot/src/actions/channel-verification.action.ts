import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { Action, Ctx, Update, RequiresFeature } from '@quantumdeal/telegraf';
import type { PartnerBotContext } from '../interfaces';
import {
  BotMessagesRepository,
  BotUsersRepository,
  BotSettingsRepository,
} from '@quantumdeal/db';
import type { BotUserState } from '@quantumdeal/db/schema';
import { ChannelVerifierService } from '../services/channel-verifier.service';
import { PartnerFlowService } from '../services/partner-flow.service';
import { TelegrafExceptionFilter } from '@quantumdeal/framework';
import { PARTNER_FLOW_FEATURE_KEY } from '../constants';

/**
 * Partner flow scene data for verification attempts tracking
 */
interface PartnerFlowSceneData extends Record<string, unknown> {
  verificationState?: string;
  verificationAttempts?: number;
  lastVerificationAttempt?: string;
}

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
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly botUsersRepository: BotUsersRepository,
    private readonly botSettingsRepository: BotSettingsRepository,
  ) {}

  /**
   * Handle channel verification callback
   * Callback data: 'partner_verify_subscription'
   *
   * @param ctx - Telegram context with botId injected by middleware
   */
  @Action('partner_verify_subscription')
  async handleVerify(@Ctx() ctx: PartnerBotContext): Promise<void> {
    const botUserId = ctx.user?.botUserId;
    const telegramId = ctx.from?.id;
    const botId = ctx.botId;
    console.log('botUserId', botUserId);
    console.log('telegramId', telegramId);
    console.log('botId', botId);
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
      const channelId = await this.getPartnerChannelId(telegramId, botId, ctx);
      if (!channelId) {
        return;
      }

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
   * Check rate limit and send message if limited
   * @returns true if rate limited (handled), false if not limited
   */
  private async handleRateLimit(
    userId: number,
    botId: number,
    lang: string,
    ctx: PartnerBotContext,
  ): Promise<boolean> {
    const isRateLimited = await this.channelVerifierService.isRateLimited(
      userId,
      botId,
    );

    if (!isRateLimited) {
      return false;
    }

    const rateLimitStatus =
      await this.channelVerifierService.getRateLimitStatus(userId, botId);

    await this.sendRateLimitMessage(botId, lang, rateLimitStatus, ctx);

    this.logger.warn({
      message: 'User verification attempt blocked by rate limit',
      userId,
      botId,
      attempts: rateLimitStatus.attempts,
    });

    return true;
  }

  /**
   * Send rate limit error message
   */
  private async sendRateLimitMessage(
    botId: number,
    lang: string,
    rateLimitStatus: { attempts: number; resetAt: Date | null },
    ctx: PartnerBotContext,
  ): Promise<void> {
    const message = await this.botMessagesRepository.resolveMessage(
      botId,
      'partner_rate_limit',
      lang,
    );

    const minutesRemaining = rateLimitStatus.resetAt
      ? Math.ceil(
          (rateLimitStatus.resetAt.getTime() - Date.now()) / (1000 * 60),
        )
      : 0;

    const interpolatedMessage = message
      .replace('{attempts}', rateLimitStatus.attempts.toString())
      .replace('{minutes}', minutesRemaining.toString());

    await ctx.reply(interpolatedMessage);
  }

  /**
   * Get partner channel ID from settings
   * @returns channel ID or null if not configured
   */
  private async getPartnerChannelId(
    userId: number,
    botId: number,
    ctx: PartnerBotContext,
  ): Promise<string | null> {
    const settingsRecord = await this.botSettingsRepository.findByBotId(botId);

    const settings = settingsRecord?.settings as { channelId?: string };
    if (!settings?.channelId) {
      this.logger.error({
        message: 'Partner configuration missing',
        userId,
        botId,
      });

      await ctx.reply('Configuration error. Please contact support.');
      return null;
    }

    return settings.channelId;
  }

  /**
   * Record verification attempt in user state
   */
  private async recordVerificationAttempt(
    userId: number,
    botId: number,
  ): Promise<void> {
    const botUser = await this.botUsersRepository.findByUserAndBot(
      userId,
      botId,
    );
    const sceneData = botUser?.state?.sceneData as
      | PartnerFlowSceneData
      | undefined;
    const currentAttempts = sceneData?.verificationAttempts ?? 0;

    const updatedState: BotUserState = {
      currentScene: 'partner_flow',
      sceneData: {
        verificationAttempts: currentAttempts + 1,
        lastVerificationAttempt: new Date().toISOString(),
      } as PartnerFlowSceneData,
    };

    await this.botUsersRepository.updateState(userId, botId, updatedState);

    this.logger.debug({
      message: 'Verification attempt recorded',
      userId,
      botId,
      attempts: currentAttempts + 1,
    });
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
    const failureMessage = await this.botMessagesRepository.resolveMessage(
      botId,
      'partner_verification_failed',
      lang,
    );

    await ctx.reply(failureMessage, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Try Again',
              callback_data: 'partner_verify_subscription',
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
    const trialExpiresAt =
      (result as { trialExpiresAt?: Date }).trialExpiresAt ?? new Date();
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
