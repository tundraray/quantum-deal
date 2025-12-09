import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  UserSubscriptionsRepository,
  BotSettingsRepository,
  BotsRepository,
} from '@quantumdeal/db';
import { LocalizationService } from '@quantumdeal/framework';
import { DynamicTelegrafService } from '@quantumdeal/telegraf';
import {
  PARTNER_FLOW_FEATURE_KEY,
  CALLBACK_DATA,
  BUTTON_KEYS,
} from '../constants';
import { isValidHttpsUrl } from '../utils/url-validation.utils';

/**
 * Statistics returned by processExpiredTrials
 */
export interface ReminderStats {
  sent: number;
  failed: number;
}

/**
 * Overall statistics for processing all bots
 */
export interface AllBotsReminderStats {
  botsProcessed: number;
  totalSent: number;
  totalFailed: number;
  perBot: Record<number, ReminderStats>;
}

/**
 * ReminderSchedulerService
 *
 * Sends daily reminders to users with expired trial subscriptions.
 * Runs at 12:00 UTC via cron job.
 *
 * In multi-bot architecture, this service iterates over ALL bots with
 * partnerFlowEnabled feature flag and processes expired trials for each.
 *
 * Responsibilities:
 * - Query all bots with partnerFlowEnabled feature
 * - Query expired trial subscriptions per bot
 * - Send reminder messages with referral URL using per-bot Telegraf instance
 * - Handle bot blocked errors gracefully
 * - Track statistics for monitoring
 *
 * Implementation Notes:
 * - No duplicate prevention needed (cron runs once daily)
 * - No timestamp tracking needed (per user decision)
 * - Error isolation: failed sends don't block other users
 * - Uses DynamicTelegrafService to get bot instances for sending messages
 */
@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly localizationService: LocalizationService,
    private readonly botSettingsRepository: BotSettingsRepository,
    private readonly botsRepository: BotsRepository,
    private readonly dynamicTelegrafService: DynamicTelegrafService,
  ) {}

  /**
   * Process expired trial subscriptions for ALL bots with partnerFlowEnabled
   *
   * Queries all active dynamic bots, filters those with partnerFlowEnabled,
   * and processes expired trials for each bot.
   *
   * @returns Aggregated statistics for all bots
   */
  async processAllExpiredTrials(): Promise<AllBotsReminderStats> {
    const allStats: AllBotsReminderStats = {
      botsProcessed: 0,
      totalSent: 0,
      totalFailed: 0,
      perBot: {},
    };

    try {
      this.logger.log({
        message: 'Starting expired trial reminder job for all bots',
      });

      // Get all active dynamic bots with settings
      const botsWithSettings = await this.botsRepository.findActiveDynamic();

      // Filter bots with partnerFlowEnabled
      const partnerFlowBots = botsWithSettings.filter((bot) => {
        const features = bot.settings?.features as
          | Record<string, boolean>
          | undefined;
        return features?.[PARTNER_FLOW_FEATURE_KEY] === true;
      });

      this.logger.log({
        message: 'Found bots with partner flow enabled',
        count: partnerFlowBots.length,
        botIds: partnerFlowBots.map((b) => b.id),
      });

      // Process each bot
      for (const bot of partnerFlowBots) {
        const botStats = await this.processExpiredTrials(bot.id);
        allStats.perBot[bot.id] = botStats;
        allStats.totalSent += botStats.sent;
        allStats.totalFailed += botStats.failed;
        allStats.botsProcessed++;
      }

      this.logger.log({
        message: 'Expired trial reminder job completed for all bots',
        stats: allStats,
      });

      return allStats;
    } catch (error) {
      this.logger.error({
        message: 'Reminder job failed for all bots',
        error: (error as Error).message,
      });
      return allStats;
    }
  }

  /**
   * Process expired trial subscriptions and send reminders for a single bot
   *
   * Queries all expired trials for the bot, retrieves partner_trial_expired message,
   * interpolates referral URL, and sends reminder with action buttons.
   *
   * @param botId - Bot ID to process
   * @returns Statistics: { sent, failed }
   */
  async processExpiredTrials(botId: number): Promise<ReminderStats> {
    const stats: ReminderStats = {
      sent: 0,
      failed: 0,
    };

    try {
      this.logger.log({
        message: 'Starting expired trial reminder job',
        botId,
      });

      // Get the bot's Telegraf instance from DynamicTelegrafService
      const botInstance = this.dynamicTelegrafService.getBotInstance(botId);
      if (!botInstance) {
        this.logger.error({
          message: 'Bot instance not found in DynamicTelegrafService',
          botId,
        });
        return stats;
      }

      // Get partner settings for referral URL
      const settingsRecord =
        await this.botSettingsRepository.findByBotId(botId);
      const settings = settingsRecord?.settings as { referralUrl?: string };
      if (!settings?.referralUrl) {
        this.logger.error({
          message: 'Referral URL not configured',
          botId,
        });
        return stats;
      }

      const referralUrl = settings.referralUrl;

      // Query expired trials
      const expiredTrials =
        await this.userSubscriptionsRepository.findExpiredTrials(botId);

      this.logger.log({
        message: 'Found expired trials',
        botId,
        count: expiredTrials.length,
      });

      // Process each expired user
      for (const { botUser } of expiredTrials) {
        try {
          const lang = botUser.lang ?? 'en';
          const l10n = this.localizationService.forBot(botId).lang(lang);

          // Retrieve message with referral URL interpolation
          const message = await l10n.t('partner_trial_expired', {
            referralUrl,
          });

          // Retrieve buttons text
          const extendTrialButtonText = await l10n.t(BUTTON_KEYS.EXTEND_TRIAL);

          const buySubscriptionButtonText = await l10n.t(
            BUTTON_KEYS.BUY_SUBSCRIPTION,
          );

          // Create extend trial button conditionally (url if valid HTTPS, callback_data otherwise)
          const extendTrialButton = isValidHttpsUrl(referralUrl)
            ? { text: extendTrialButtonText, url: referralUrl }
            : {
                text: extendTrialButtonText,
                callback_data: CALLBACK_DATA.EXTEND_TRIAL,
              };

          // Send reminder with action buttons using the bot's Telegraf instance
          await botInstance.bot.telegram.sendMessage(botUser.userId, message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [extendTrialButton],
                [
                  {
                    text: buySubscriptionButtonText,
                    callback_data: CALLBACK_DATA.BUY_SUBSCRIPTION,
                  },
                ],
              ],
            },
          });

          stats.sent++;

          this.logger.debug({
            message: 'Reminder sent',
            userId: botUser.userId,
            botId,
          });
        } catch (error) {
          stats.failed++;

          const errorMessage = (error as Error).message;

          // Handle bot blocked errors gracefully
          if (
            errorMessage.includes('bot was blocked') ||
            errorMessage.includes('user is deactivated')
          ) {
            this.logger.log({
              message: 'User blocked bot or deactivated',
              userId: botUser.userId,
              botId,
            });
          } else {
            this.logger.error({
              message: 'Failed to send reminder',
              userId: botUser.userId,
              botId,
              error: errorMessage,
            });
          }

          // Continue processing other users (error isolation)
          continue;
        }
      }

      this.logger.log({
        message: 'Expired trial reminder job completed',
        botId,
        stats,
      });

      return stats;
    } catch (error) {
      this.logger.error({
        message: 'Reminder job failed',
        botId,
        error: (error as Error).message,
      });
      return stats;
    }
  }

  /**
   * Cron job: Process reminders daily at 12:00 UTC
   *
   * Iterates over ALL bots with partnerFlowEnabled feature flag
   * and sends expired trial reminders for each.
   */
  @Cron('0 12 * * *')
  async handleCron(): Promise<void> {
    this.logger.log('Starting daily expired trial reminder cron job');
    const stats = await this.processAllExpiredTrials();
    this.logger.log({
      message: 'Daily reminder cron job completed',
      botsProcessed: stats.botsProcessed,
      totalSent: stats.totalSent,
      totalFailed: stats.totalFailed,
    });
  }
}
