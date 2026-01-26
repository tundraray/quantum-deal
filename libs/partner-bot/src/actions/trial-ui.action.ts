import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { Action, Ctx, Update, RequiresFeature } from '@quantumdeal/telegraf';
import type { PartnerBotContext } from '../interfaces';
import { BotUsersRepository, BotSettingsRepository } from '@quantumdeal/db';
import {
  TelegrafExceptionFilter,
  LocalizationService,
} from '@quantumdeal/framework';
import { PARTNER_FLOW_FEATURE_KEY } from '../constants';
import { isValidHttpsUrl } from '../utils/url-validation.utils';
import { maskUrl } from '../utils/log-masking.utils';
import { PartnerSettings } from '../types/partner-settings';

/**
 * Fallback message when database message is not found
 */
const FALLBACK_COMING_SOON = 'This feature is coming soon!';

/**
 * TrialUIAction
 *
 * Handles trial UI button callbacks:
 * 1. Extend Free Period - Opens referral URL in browser
 * 2. Buy Subscription - Shows coming soon placeholder message
 *
 * This handler is only registered on bots where partnerFlowEnabled = true
 * in bot_settings.features (via @RequiresFeature decorator).
 *
 * Flow:
 * - Extend: Validate HTTPS URL → Send URL button → Log action
 * - Buy: Retrieve message → Send message → Log action
 */
@Update()
@RequiresFeature(PARTNER_FLOW_FEATURE_KEY)
@UseFilters(TelegrafExceptionFilter)
@Injectable()
export class TrialUIAction {
  private readonly logger = new Logger(TrialUIAction.name);

  constructor(
    private readonly localizationService: LocalizationService,
    private readonly botUsersRepository: BotUsersRepository,
    private readonly botSettingsRepository: BotSettingsRepository,
  ) {}

  /**
   * Handle "Extend Free Period" button callback
   * Callback data: 'partner_extend_trial'
   *
   * Opens referral URL from bot settings in user's browser.
   * URL is validated to ensure HTTPS format for security.
   *
   * @param ctx - Telegram context with botId injected by middleware
   */
  @Action('partner_extend_trial')
  async handleExtend(@Ctx() ctx: PartnerBotContext): Promise<void> {
    const userId = ctx.from?.id;
    const botId = ctx.botId;

    if (!userId) {
      this.logger.warn('Missing user context in extend trial callback');
      await ctx.answerCbQuery?.();
      return;
    }

    if (!botId) {
      this.logger.error({
        message: 'botId not available in context',
        userId,
      });
      await ctx.answerCbQuery?.();
      await ctx.reply('Configuration error. Please try again later.');
      return;
    }

    try {
      // Answer callback query immediately
      await ctx.answerCbQuery();

      // Get referral URL from settings
      const referralUrl = await this.getReferralUrl(userId, botId);

      if (!referralUrl) {
        await ctx.reply(
          'Configuration error. Referral URL not found. Please contact support.',
        );
        return;
      }

      // Validate HTTPS
      if (!isValidHttpsUrl(referralUrl)) {
        this.logger.error({
          message: 'Invalid referral URL (not HTTPS)',
          userId,
          botId,
          url: maskUrl(referralUrl),
        });

        await ctx.reply(
          'Configuration error. Invalid referral URL. Please contact support.',
        );
        return;
      }

      // Send URL button
      await ctx.reply(
        'Click the button below to extend your free trial period by referring friends!',
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Open Referral Link',
                  url: referralUrl,
                },
              ],
            ],
          },
        },
      );

      // Log user action
      this.logger.log({
        message: 'Extend trial button clicked',
        userId,
        botId,
        action: 'extend_trial_clicked',
        referralUrl: maskUrl(referralUrl),
      });
    } catch (error) {
      this.logger.error({
        message: 'Error handling extend trial callback',
        userId,
        botId,
        error: (error as Error).message,
      });

      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  /**
   * Handle "Trial Status" button callback
   * Callback data: 'partner_trial_status'
   *
   * Acknowledges the callback query to remove loading indicator.
   * This is an informational button - the status is already displayed on the button text.
   * No additional action needed.
   *
   * @param ctx - Telegram context with botId injected by middleware
   */
  @Action('partner_trial_status')
  async handleTrialStatus(@Ctx() ctx: PartnerBotContext): Promise<void> {
    // Acknowledge callback query (removes loading indicator)
    await ctx.answerCbQuery();

    // Informational button - no additional action needed
    // The status is already displayed on the button
    this.logger.debug({
      message: 'Trial status button clicked',
      userId: ctx.from?.id,
      botId: ctx.botId,
    });
  }

  /**
   * Handle "Buy Subscription" button callback
   * Callback data: 'partner_buy_subscription'
   *
   * Shows coming soon placeholder message.
   * No payment integration in MVP - placeholder only.
   *
   * @param ctx - Telegram context with botId injected by middleware
   */
  @Action('partner_buy_subscription')
  async handleBuy(@Ctx() ctx: PartnerBotContext): Promise<void> {
    const userId = ctx.from?.id;
    const botId = ctx.botId;

    if (!userId) {
      this.logger.warn('Missing user context in buy subscription callback');
      await ctx.answerCbQuery?.();
      return;
    }

    if (!botId) {
      this.logger.error({
        message: 'botId not available in context',
        userId,
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
        userId,
        botId,
        ctx.from?.language_code,
      );

      // Retrieve coming soon message via LocalizationService
      const l10n = this.localizationService.forBot(botId).lang(lang);
      const message = await l10n.t('partner_coming_soon');

      // Send message
      await ctx.reply(message);

      // Log user action
      this.logger.log({
        message: 'Buy subscription button clicked',
        userId,
        botId,
        action: 'buy_subscription_clicked',
      });
    } catch (error) {
      this.logger.error({
        message: 'Error handling buy subscription callback',
        userId,
        botId,
        error: (error as Error).message,
      });

      // Always send fallback message, never crash
      try {
        await ctx.reply(FALLBACK_COMING_SOON);
      } catch {
        // Silently fail if even fallback fails
        this.logger.error({
          message: 'Failed to send fallback message',
          userId,
          botId,
        });
      }
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
   * Get referral URL from bot settings
   * @returns referral URL or null if not configured
   */
  private async getReferralUrl(
    userId: number,
    botId: number,
  ): Promise<string | null> {
    const settingsRecord = await this.botSettingsRepository.findByBotId(botId);

    const settings = settingsRecord?.settings as PartnerSettings | undefined;
    if (!settings?.referralUrl) {
      this.logger.error({
        message: 'Referral URL not configured',
        userId,
        botId,
      });
      return null;
    }

    return settings.referralUrl;
  }
}
