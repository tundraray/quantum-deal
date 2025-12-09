import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  UserSubscriptionsRepository,
  SubscriptionsRepository,
  Subscription,
  UserSubscription,
  BotUser,
  BotsRepository,
  BotMessagesRepository,
  BotSettingsRepository,
  BotWithSettings,
} from '@quantumdeal/db';
import { LLMService, QuotaExceededException } from '@quantumdeal/framework';
import { NotificationService } from '@quantumdeal/framework/notifications';
import {
  MessagePriority,
  QueuedMessageType,
} from '@quantumdeal/framework/notifications';
import {
  ExpirationMessages,
  FALLBACK_MESSAGES,
  formatFallbackMessage,
  ExpirationNotificationData,
  expirationMessagesSchema,
} from './subscription-expiration.schemas';
import {
  createExpirationSystemPrompt,
  createExpirationPrompt,
} from './subscription-expiration.prompts';
import {
  BUTTON_KEYS,
  CALLBACK_DATA,
  EXPIRATION_WARNING_DAYS_FEATURE_KEY,
  PARTNER_FLOW_FEATURE_KEY,
  PartnerSettings,
} from '@quantumdeal/partner-bot';
import { isValidHttpsUrl } from '@quantumdeal/partner-bot/utils';

/**
 * Result of processing expiration notifications
 */
interface NotificationResult {
  readonly success: boolean;
  readonly totalUsers: number;
  readonly notificationsSent: number;
  readonly notificationsSkipped: number;
  readonly errors: Array<{
    readonly userId: number;
    readonly error: string;
  }>;
}

/**
 * Service for sending subscription expiration notifications
 * Uses LLM to generate personalized, multilingual messages
 * Implements cron scheduling
 */
@Injectable()
export class SubscriptionExpirationService {
  private readonly logger = new Logger(SubscriptionExpirationService.name);

  constructor(
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly botSettingsRepository: BotSettingsRepository,
    private readonly llmService: LLMService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly botsRepository: BotsRepository,
  ) {}

  /**
   * Initialize cron job on module startup
   */
  onModuleInit(): void {
    const enabled = this.configService.get<boolean>(
      'EXPIRATION_CHECK_ENABLED',
      true,
    );
    const cronExpression = this.configService.get<string>(
      'EXPIRATION_CHECK_CRON',
      '0 0 10 * * *',
    );
    const timezone = this.configService.get<string>(
      'EXPIRATION_CHECK_TIMEZONE',
      'Europe/Moscow',
    );

    if (enabled) {
      try {
        const job = new CronJob(
          cronExpression,
          () => this.checkExpiringSubscriptions(),
          null,
          false,
          timezone,
        );

        this.schedulerRegistry.addCronJob(
          'partner-subscription-expiration',
          job,
        );
        job.start();

        this.logger.log(
          `Subscription expiration check scheduled: ${cronExpression} (${timezone})`,
        );
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed to register expiration check cron '${cronExpression}': ${err.message}`,
          err.stack,
        );
      }
    } else {
      this.logger.log(
        'Subscription expiration check disabled via EXPIRATION_CHECK_ENABLED',
      );
    }
  }

  /**
   * Main method: Check for expiring subscriptions and send notifications
   * Runs on cron schedule
   */
  async checkExpiringSubscriptions(): Promise<void> {
    this.logger.log('Starting subscription expiration check');

    try {
      const botsWithSettings = await this.botsRepository.findActiveDynamic();

      const partnerFlowBots = botsWithSettings.filter((bot) => {
        const features = bot.settings?.features as
          | Record<string, boolean>
          | undefined;
        return features?.[PARTNER_FLOW_FEATURE_KEY] === true;
      });

      let totalSent = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const bot of partnerFlowBots) {
        const warningDaysConfig =
          (bot.settings?.[EXPIRATION_WARNING_DAYS_FEATURE_KEY] as
            | string
            | undefined) || '0,-1,-2,-3,-4,-5,-6,-7,-14,-30';

        const warningDays = warningDaysConfig
          .split(',')
          .map((d) => parseInt(d.trim(), 10))
          .filter((d) => !isNaN(d));
        for (const days of warningDays) {
          const result = await this.processExpirationDay(days, bot);
          totalSent += result.notificationsSent;
          totalSkipped += result.notificationsSkipped;
          totalErrors += result.errors.length;

          if (result.errors.length > 0) {
            result.errors.forEach((err) => {
              this.logger.warn(
                `Failed to send notification to user ${err.userId}: ${err.error}`,
              );
            });
          }
        }
      }

      this.logger.log(
        `Expiration check completed: ${totalSent} sent, ${totalSkipped} skipped, ${totalErrors} errors`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Subscription expiration check failed: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Process notifications for a specific expiration day threshold
   */
  private async processExpirationDay(
    daysFromNow: number,
    bot: BotWithSettings,
  ): Promise<NotificationResult> {
    this.logger.debug(
      `Processing users with subscriptions expiring in ${daysFromNow} days`,
    );

    try {
      // Find user-subscription pairs expiring in N days (signals only)
      const expiringSubscriptions =
        await this.userSubscriptionsRepository.findExpiring(
          daysFromNow,
          'signals', // Only signals subscriptions (broadcast subscriptions handled separately)
          bot.id,
        );

      if (expiringSubscriptions.length === 0) {
        this.logger.debug(`No users found expiring in ${daysFromNow} days`);
        return {
          success: true,
          totalUsers: 0,
          notificationsSent: 0,
          notificationsSkipped: 0,
          errors: [],
        };
      }

      // Extract users from results
      const users = expiringSubscriptions.map((result) => result.botUser);

      this.logger.log(
        `Found ${users.length} users with subscriptions expiring in ${daysFromNow} days`,
      );

      // Generate and send notifications
      const result = await this.sendNotificationsToUsers(
        users,
        daysFromNow,
        expiringSubscriptions,
        bot,
      );

      this.logger.log(
        `Processed ${daysFromNow}-day notifications: ${result.notificationsSent} sent, ${result.notificationsSkipped} skipped`,
      );

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to process ${daysFromNow}-day expiration: ${err.message}`,
        err.stack,
      );

      return {
        success: false,
        totalUsers: 0,
        notificationsSent: 0,
        notificationsSkipped: 0,
        errors: [{ userId: 0, error: err.message }],
      };
    }
  }

  /**
   * Send notifications to multiple users
   * Generates messages via LLM for all languages in one request
   */
  private async sendNotificationsToUsers(
    users: BotUser[],
    daysFromNow: number,
    expiringSubscriptions: Array<{
      botUser: BotUser;
      subscription: Subscription;
      userSubscription: UserSubscription;
    }>,
    bot: BotWithSettings,
  ): Promise<NotificationResult> {
    const errors: Array<{ userId: number; error: string }> = [];
    let notificationsSent = 0;
    let notificationsSkipped = 0;

    try {
      // Collect unique languages
      const languages = [
        ...new Set(
          users.map((u) => u.lang).filter((lang): lang is string => !!lang),
        ),
      ];

      // Ensure English is always included as fallback
      if (!languages.includes('en')) {
        languages.push('en');
      }

      this.logger.debug(
        `Generating messages for languages: ${languages.join(', ')}`,
      );

      // Get subscription from the expiring results (all users have same subscription in signals)
      const subscription = expiringSubscriptions[0]?.subscription || null;

      const subscriptionName = subscription?.name || 'Subscription';

      // Generate messages via LLM
      const expirationDate =
        expiringSubscriptions[0]?.userSubscription.expiresAt || new Date();
      const messages = await this.generateNotificationMessages(
        subscriptionName,
        daysFromNow,
        expirationDate,
        languages,
        bot,
      );

      // Create a map for fast lookup of userSubscriptionId and subscriptionId by userId
      const userSubscriptionMap = new Map(
        expiringSubscriptions.map((item) => [
          item.botUser.id,
          {
            userSubscriptionId: item.userSubscription.id,
            subscriptionId: item.subscription.id,
          },
        ]),
      );

      // Send notifications to each user
      const results = await Promise.allSettled(
        users.map((user) =>
          this.sendNotificationToUser(
            user,
            daysFromNow,
            messages,
            userSubscriptionMap.get(user.id)?.userSubscriptionId,
            userSubscriptionMap.get(user.id)?.subscriptionId,
          ),
        ),
      );

      // Process results
      results.forEach((result, index) => {
        const user = users[index];

        if (result.status === 'fulfilled' && result.value) {
          notificationsSent++;
        } else if (result.status === 'fulfilled' && !result.value) {
          notificationsSkipped++;
        } else {
          const error =
            result.status === 'rejected'
              ? (result.reason as Error).message
              : 'Unknown error';
          errors.push({ userId: user.userId, error });
        }
      });

      return {
        success: errors.length === 0,
        totalUsers: users.length,
        notificationsSent,
        notificationsSkipped,
        errors,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send notifications: ${err.message}`,
        err.stack,
      );

      return {
        success: false,
        totalUsers: users.length,
        notificationsSent,
        notificationsSkipped,
        errors: [{ userId: 0, error: err.message }],
      };
    }
  }

  /**
   * Generate notification messages for multiple languages using LLM
   * Falls back to template if LLM fails
   */
  private async generateNotificationMessages(
    subscriptionName: string,
    daysRemaining: number,
    expirationDate: Date,
    languages: string[],
    bot: BotWithSettings,
  ): Promise<ExpirationMessages> {
    const data: ExpirationNotificationData = {
      subscriptionName,
      daysRemaining,
      expirationDate: expirationDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };

    try {
      const model = this.configService.get<string>(
        'EXPIRATION_LLM_MODEL',
        'gpt-5-mini',
      );

      // Schema returns 'any' to match LLMService.generateObject interface

      const prompt = createExpirationPrompt(data, languages, bot.name);
      const systemPrompt = createExpirationSystemPrompt(bot.name);
      this.logger.debug(`Generating messages with ${model}`);

      // LLM Service returns generic type, typed explicitly via <ExpirationMessages>

      const messages = await this.llmService.generateObject<ExpirationMessages>(
        {
          model,

          schema: expirationMessagesSchema,
          prompt,
          systemPrompt,
          temperature: 0.7,
        },
      );

      return messages;
    } catch (error) {
      if (error instanceof QuotaExceededException) {
        this.logger.warn('LLM quota exceeded, using fallback templates');
      } else {
        this.logger.error(
          'LLM generation failed, using fallback templates',
          error as Error,
        );
      }

      // Use fallback templates
      return this.getFallbackMessages(data, daysRemaining, languages);
    }
  }

  /**
   * Get fallback messages when LLM is unavailable
   * Always includes English as fallback for unsupported languages
   */
  private getFallbackMessages(
    data: ExpirationNotificationData,
    daysRemaining: number,
    languages: string[],
  ): ExpirationMessages {
    const messages: ExpirationMessages = {};
    const fallback = FALLBACK_MESSAGES[daysRemaining] || FALLBACK_MESSAGES[0];

    // Ensure English template exists
    if (!fallback['en']) {
      this.logger.error(
        `English fallback message not found for ${daysRemaining} days`,
      );
      throw new Error('English fallback message is required');
    }

    languages.forEach((lang) => {
      // Use language-specific template if available, otherwise fallback to English
      const template = fallback[lang] || fallback['en'];
      messages[lang] = formatFallbackMessage(template, data);
    });

    // Ensure English is always present in output
    if (!messages['en']) {
      messages['en'] = formatFallbackMessage(fallback['en'], data);
    }

    return messages;
  }

  /**
   * Send notification to a single user
   * Uses user's language if available, otherwise defaults to English
   */
  private async sendNotificationToUser(
    user: BotUser,
    daysFromNow: number,
    messages: ExpirationMessages,
    userSubscriptionId?: number,
    subscriptionId?: number,
  ): Promise<boolean> {
    try {
      // Get message in user's language (fallback to English)
      const userLang = user.lang || 'en';
      const message = messages[userLang] || messages['en'];

      const settingsRecord = await this.botSettingsRepository.findByBotId(
        user.botId,
      );
      const settings = settingsRecord?.settings as PartnerSettings | undefined;
      const referralUrl = settings?.referralUrl;

      if (!message) {
        this.logger.error(
          `No message available for user ${user.userId}. User lang: ${userLang}, Available languages: ${Object.keys(messages).join(', ')}`,
        );
        throw new Error(
          `No message available for language: ${userLang} and English fallback is missing`,
        );
      }

      // Determine if this is a trial subscription
      let isTrial = false;
      if (subscriptionId) {
        isTrial =
          await this.subscriptionsRepository.isTrialSubscription(
            subscriptionId,
          );
      }

      // Create renewal button for expiration notifications (multi-language)
      // For trial subscriptions: Use 'open_renewal_scene' to show all plans
      // For regular subscriptions: Use 'renew_now' callback for one-click renewal
      let callbackData = 'open_renewal_scene'; // Default for trial or missing IDs
      let buttonTextKey: 'choosePlanButton' | 'renewButton' =
        'choosePlanButton'; // Default for trial

      if (userSubscriptionId && subscriptionId && !isTrial) {
        // Regular (non-trial) subscription with valid IDs - use one-click renewal
        callbackData = `renew_now:${userSubscriptionId}:${subscriptionId}`;
        buttonTextKey = 'renewButton';
      }

      const extendTrialButtonText = await this.botMessagesRepository
        .resolveMessage(user.botId, BUTTON_KEYS.EXTEND_TRIAL, user.lang ?? 'en')
        .catch(() => 'Extend Free Period 🎁');

      const changePlanButtonText = await this.botMessagesRepository
        .resolveMessage(
          user.botId,
          BUTTON_KEYS.BUY_SUBSCRIPTION,
          user.lang ?? 'en',
        )
        .catch(() => 'Buy Subscription 💳');

      // Create extend trial button conditionally (url if valid HTTPS, callback_data otherwise)
      const extendTrialButton = isValidHttpsUrl(referralUrl ?? '')
        ? { text: extendTrialButtonText, url: referralUrl as string }
        : {
            text: extendTrialButtonText,
            callback_data: CALLBACK_DATA.EXTEND_TRIAL,
          };

      const renewalButton = [
        [
          extendTrialButton,
          {
            text: changePlanButtonText,
            callback_data: callbackData,
          },
        ],
      ];

      // Send notification with renewal button
      // Note: NotificationService needs to support buttons parameter
      this.notificationService.addMessage(user.userId, user.botId, message, {
        messageType: QueuedMessageType.MARKDOWN,
        priority: MessagePriority.HIGH,
        buttons: renewalButton,
      });

      this.logger.debug(
        `Sent ${daysFromNow}-day expiration notification to user ${user.userId} (trial: ${isTrial}, button: ${buttonTextKey})`,
      );

      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send notification to user ${user.userId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}
