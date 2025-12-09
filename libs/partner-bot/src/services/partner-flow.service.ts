import { Injectable, Logger } from '@nestjs/common';
import {
  BotSettingsRepository,
  BotUsersRepository,
  UserSubscriptionsRepository,
} from '@quantumdeal/db';
import { LocalizationService } from '@quantumdeal/framework';
import type { BotUserState } from '@quantumdeal/db/schema';
import { DynamicTelegrafService } from '@quantumdeal/telegraf';
import { TrialService, BotCommandsService } from '@quantumdeal/bot';
import { ChannelVerifierService } from './channel-verifier.service';
import type { VerificationResult } from '../types/partner-settings';
import { FeatureFlag } from '@quantumdeal/db/schema';
import type {
  PartnerFlowSceneData,
  VerificationStateValue,
} from '../types/scene-data.types';
import { resolveChannelInfo } from '../utils/channel.utils';
import { isValidHttpsUrl } from '../utils/url-validation.utils';
import { CALLBACK_DATA, MESSAGE_KEYS, BUTTON_KEYS } from '../constants';
import type { PartnerSettings } from '../types/partner-settings';
/**
 * PartnerFlowService
 *
 * Orchestrates the entire partner bot flow:
 * 1. Message sending with variable interpolation
 * 2. Channel verification coordination
 * 3. Trial activation via TrialService wrapper pattern
 *
 * State Transition Flow:
 * undefined → awaiting_channel_subscription → channel_verified → trial_activated
 *
 * Responsibilities:
 * - Send channel subscription prompt with interpolated variables
 * - Handle verification requests with rate limiting
 * - Activate trial subscriptions after successful verification
 * - Send trial UI with command menu setup
 */
@Injectable()
export class PartnerFlowService {
  private readonly logger = new Logger(PartnerFlowService.name);

  constructor(
    private readonly localizationService: LocalizationService,
    private readonly botSettingsRepository: BotSettingsRepository,
    private readonly botUsersRepository: BotUsersRepository,
    private readonly trialService: TrialService,
    private readonly botCommandsService: BotCommandsService,
    private readonly channelVerifierService: ChannelVerifierService,
    private readonly dynamicTelegrafService: DynamicTelegrafService,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
  ) {}

  /**
   * Send channel subscription prompt to user
   *
   * Retrieves partner_channel_prompt message, interpolates channel variables,
   * and sends with inline keyboard for user to confirm subscription.
   *
   * @param userId - Telegram user ID
   * @param botId - Bot ID
   * @param lang - User's language code
   */
  async sendChannelPrompt(
    userId: number,
    botId: number,
    lang: string,
    state?: VerificationStateValue,
  ): Promise<void> {
    try {
      // Get partner settings
      const settingsRecord =
        await this.botSettingsRepository.findByBotId(botId);
      const settings = settingsRecord?.settings as PartnerSettings | undefined;
      if (!settings?.channelId) {
        this.logger.error({
          message: 'channelId configuration missing',
          userId,
          botId,
        });
        throw new Error('Partner configuration not found');
      }

      const channelId: string = settings.channelId;

      // Get localization context
      const l10n = this.localizationService.forBot(botId).lang(lang);

      // Retrieve channel info and message
      const channel = resolveChannelInfo(channelId, settings.channelName);
      const message = await l10n.t(MESSAGE_KEYS.CHANNEL_PROMPT, {
        channelUrl: channel.url,
        channelName: channel.name,
      });

      // Get bot instance for sending message
      const bot = this.dynamicTelegrafService.getBot(botId);
      if (!bot) {
        this.logger.error({
          message: 'Bot not found for sending channel prompt',
          botId,
          userId,
        });
        throw new Error(`Bot with ID ${botId} not found`);
      }
      const iSubscribedButtonText = await l10n.t(BUTTON_KEYS.I_SUBSCRIBED);
      const changeLangButtonText = await l10n.t(BUTTON_KEYS.CHANGE_LANGUAGE);

      if (state === 'awaiting_channel_subscription') {
        // Send message with inline keyboard
        await bot.telegram.sendMessage(userId, message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: iSubscribedButtonText,
                  callback_data: CALLBACK_DATA.VERIFY_SUBSCRIPTION,
                },
              ],
            ],
          },
        });
      } else {
        // 3. Default flow: No state or trial_expired -> send welcome + channel prompt
        // Retrieve welcome messages via LocalizationService
        const welcomeMessage = await l10n.t('partner_welcome', {
          channelName: channel.name,
          channelUrl: channel.url,
        });

        const welcomeMessageLang = await l10n.t('partner_welcome_lang');
        // Send welcome message with change language button
        await bot.telegram.sendMessage(userId, welcomeMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: iSubscribedButtonText,
                  callback_data: CALLBACK_DATA.VERIFY_SUBSCRIPTION,
                },
              ],
            ],
          },
        });

        await bot.telegram.sendMessage(userId, welcomeMessageLang, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: changeLangButtonText,
                  callback_data: CALLBACK_DATA.CHANGE_LANGUAGE as string,
                },
              ],
            ],
          },
        });
      }

      // Retrieve buttons text

      // Update state (store partner flow data in sceneData)
      const initialState: BotUserState = {
        currentScene: 'partner_flow',
        sceneData: {
          verificationState: 'awaiting_channel_subscription',
          verificationAttempts: 0,
          lastVerificationAttempt: new Date().toISOString(),
        } as PartnerFlowSceneData,
      };
      await this.botUsersRepository.updateState(userId, botId, initialState);

      this.logger.log({
        message: 'Channel subscription prompt sent',
        userId,
        botId,
        channelId,
      });
    } catch (error) {
      this.logger.error({
        message: 'Failed to send channel prompt',
        userId,
        botId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Handle verification request from user
   *
   * Coordinates the verification process:
   * 1. Check rate limit
   * 2. Verify channel membership
   * 3. If verified: activate trial and update state
   * 4. If not verified: send failure message
   *
   * @param userId - Telegram user ID
   * @param botId - Bot ID
   * @returns Verification result with success status
   */
  async handleVerificationRequest(
    userId: number,
    botId: number,
  ): Promise<VerificationResult> {
    try {
      // Get user language for messages
      const lang = await this.botUsersRepository.resolveLanguage(
        userId,
        botId,
        'en',
      );

      // Get partner channel ID
      const settingsRecord =
        await this.botSettingsRepository.findByBotId(botId);
      const settings = settingsRecord?.settings as PartnerSettings | undefined;
      if (!settings?.channelId) {
        this.logger.error({
          message: 'Partner configuration missing',
          userId,
          botId,
        });
        return {
          verified: false,
          error: 'Configuration error',
        };
      }

      const channelId: string = settings.channelId;

      // Get current verification attempts
      const botUser = await this.botUsersRepository.findByUserAndBot(
        userId,
        botId,
      );
      const sceneData = botUser?.state?.sceneData as
        | PartnerFlowSceneData
        | undefined;
      const currentAttempts = sceneData?.verificationAttempts ?? 0;

      // Verify membership
      const isMember = await this.channelVerifierService.verifyMembership(
        channelId,
        userId,
        botId,
      );

      if (!isMember) {
        // Update attempts counter
        const updateState: BotUserState = {
          currentScene: 'partner_flow',
          sceneData: {
            verificationState: 'awaiting_channel_subscription',
            verificationAttempts: currentAttempts + 1,
            lastVerificationAttempt: new Date().toISOString(),
          } as PartnerFlowSceneData,
        };
        await this.botUsersRepository.updateState(userId, botId, updateState);

        // Get bot instance for sending failure message
        const bot = this.dynamicTelegrafService.getBot(botId);
        if (!bot) {
          this.logger.error({
            message: 'Bot not found for sending failure message',
            botId,
            userId,
          });
          return {
            verified: false,
            error: `Bot with ID ${botId} not found`,
          };
        }

        // Get localization context and retrieve texts
        const l10n = this.localizationService.forBot(botId).lang(lang);
        const tryAgainButtonText = await l10n.t(BUTTON_KEYS.TRY_AGAIN);

        // Get failure message with interpolated channel info
        const channel = resolveChannelInfo(channelId, settings.channelName);
        const failureMessage = await l10n.t(MESSAGE_KEYS.VERIFICATION_FAILED, {
          channelName: channel.name,
          channelUrl: channel.url,
        });

        await bot.telegram.sendMessage(userId, failureMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: tryAgainButtonText,
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
          attempts: currentAttempts + 1,
        });

        return {
          verified: false,
          error: 'Not subscribed to channel',
        };
      }

      // User is verified, update state to channel_verified
      const verifiedState: BotUserState = {
        currentScene: 'partner_flow',
        sceneData: {
          verificationState: 'channel_verified',
          verificationAttempts: currentAttempts + 1,
          lastVerificationAttempt: new Date().toISOString(),
        } as PartnerFlowSceneData,
      };
      await this.botUsersRepository.updateState(userId, botId, verifiedState);

      this.logger.log({
        message: 'Channel verification successful',
        userId,
        botId,
      });

      // Use botUser fetched earlier (line 210) for trial activation
      if (!botUser) {
        this.logger.warn({
          message: 'Failed to resolve botUser for trial activation',
          userId,
          botId,
        });
        return { verified: false, error: 'User context not found' };
      }

      this.logger.debug({
        message: 'Resolved botUserId for trial activation',
        userId,
        botId,
        botUserId: botUser.id,
      });

      // Use botUser.id (bot_users.id) instead of userId (telegramId)
      const activationResult = await this.trialService.activate(
        botUser.id,
        settings?.defaults?.trialDays,
      );

      if (!activationResult.success) {
        // Revert state to channel_verified
        const revertState: BotUserState = {
          currentScene: 'partner_flow',
          sceneData: {
            verificationState: 'channel_verified',
          } as PartnerFlowSceneData,
        };
        await this.botUsersRepository.updateState(userId, botId, revertState);

        this.logger.error({
          message: 'Trial activation failed',
          userId,
          botId,
          error: activationResult.error,
        });

        return {
          verified: false,
          error: activationResult.error ?? 'Trial activation failed',
        };
      }

      // Update state to trial_activated
      const activatedState: BotUserState = {
        currentScene: 'partner_flow',
        sceneData: {
          verificationState: 'trial_activated',
          trialActivatedAt: new Date().toISOString(),
          trialExpiresAt: activationResult.expiresAt?.toISOString(),
        } as PartnerFlowSceneData,
      };
      await this.botUsersRepository.updateState(userId, botId, activatedState);

      this.logger.log({
        message: 'Trial activated with botUserId',
        userId,
        botId,
        botUserId: botUser.id,
        expiresAt: activationResult.expiresAt,
      });

      return {
        verified: true,
        trialExpiresAt: activationResult.expiresAt,
      };
    } catch (error) {
      this.logger.error({
        message: 'Verification request failed',
        userId,
        botId,
        error: (error as Error).message,
      });
      return {
        verified: false,
        error: 'Verification failed due to an error',
      };
    }
  }

  /**
   * Send trial UI with command menu setup
   *
   * Retrieves partner_trial_activated message, interpolates expiry variables,
   * builds inline keyboard with Extend and Buy buttons, and sets user commands.
   *
   * @param userId - Telegram user ID
   * @param botId - Bot ID
   * @param lang - User's language code
   * @param expiresAt - Trial expiration date
   */
  async sendTrialUI(
    userId: number,
    botId: number,
    lang: string,
    expiresAt: Date,
  ): Promise<void> {
    try {
      // Get localization context
      const l10n = this.localizationService.forBot(botId).lang(lang);

      // Calculate days remaining
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Retrieve message with interpolation
      const message = await l10n.t(MESSAGE_KEYS.TRIAL_ACTIVATED, {
        expiryDate: expiresAt.toISOString().split('T')[0],
        daysRemaining: daysRemaining.toString(),
      });

      // Get bot instance for sending trial UI
      const bot = this.dynamicTelegrafService.getBot(botId);
      if (!bot) {
        this.logger.error({
          message: 'Bot not found for sending trial UI',
          botId,
          userId,
        });
        throw new Error(`Bot with ID ${botId} not found`);
      }

      // Get referral URL from settings
      const settingsRecord =
        await this.botSettingsRepository.findByBotId(botId);
      const settings = settingsRecord?.settings as PartnerSettings | undefined;
      const referralUrl = settings?.referralUrl;
      const defaultSubscriptionId = settings?.defaultSubscriptionId;

      const subscriptions =
        await this.userSubscriptionsRepository.findActiveByBotAndTelegramId(
          botId,
          userId,
        );

      // Retrieve buttons text via LocalizationService
      const extendTrialButtonText = await l10n.t(BUTTON_KEYS.EXTEND_TRIAL);
      const buySubscriptionButtonText = await l10n.t(
        BUTTON_KEYS.BUY_SUBSCRIPTION,
      );

      const callbackData = `renew_now:${subscriptions[0].userSubscription.id}:${defaultSubscriptionId}`;

      // Create extend trial button conditionally (url if valid HTTPS, callback_data otherwise)
      const extendTrialButton = isValidHttpsUrl(referralUrl ?? '')
        ? { text: extendTrialButtonText, url: referralUrl as string }
        : {
            text: extendTrialButtonText,
            callback_data: CALLBACK_DATA.EXTEND_TRIAL,
          };

      // Send message with inline keyboard
      await bot.telegram.sendMessage(userId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [extendTrialButton],
            [
              {
                text: buySubscriptionButtonText,
                callback_data: callbackData,
              },
            ],
          ],
        },
      });

      // Set user commands
      const enabledFeatures = new Set<FeatureFlag>([
        FeatureFlag.CUSTOM_USER_FILTERING,
      ]);
      await this.botCommandsService.setUserCommands(
        userId,
        enabledFeatures,
        lang,
      );

      this.logger.log({
        message: 'Trial UI sent successfully',
        userId,
        botId,
        expiresAt,
      });
    } catch (error) {
      this.logger.error({
        message: 'Failed to send trial UI',
        userId,
        botId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
