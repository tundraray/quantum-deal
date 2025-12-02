import { Injectable, Logger } from '@nestjs/common';
import {
  BotMessagesRepository,
  BotSettingsRepository,
  BotUsersRepository,
} from '@quantumdeal/db';
import type { BotUserState } from '@quantumdeal/db/schema';
import { DynamicTelegrafService } from '@quantumdeal/telegraf';
import { TrialService, BotCommandsService } from '@quantumdeal/bot';
import { ChannelVerifierService } from './channel-verifier.service';
import type { VerificationResult } from '../types/partner-settings';
import { FeatureFlag } from '@quantumdeal/db/schema';

/**
 * Partner settings structure from bot_settings
 */
interface PartnerSettings {
  channelId?: string;
}

/**
 * User state structure for partner flow (extends BotUserState via sceneData)
 *
 * Note: Partner flow state is stored in the generic sceneData field since
 * the BotUserState interface is shared across all bots. This allows partner-specific
 * state without modifying the shared schema.
 */
interface PartnerFlowSceneData extends Record<string, unknown> {
  verificationState?: string;
  verificationAttempts?: number;
  lastVerificationAttempt?: Date | string;
  trialActivatedAt?: Date | string;
  trialExpiresAt?: Date | string;
}

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
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly botSettingsRepository: BotSettingsRepository,
    private readonly botUsersRepository: BotUsersRepository,
    private readonly trialService: TrialService,
    private readonly botCommandsService: BotCommandsService,
    private readonly channelVerifierService: ChannelVerifierService,
    private readonly dynamicTelegrafService: DynamicTelegrafService,
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

      // Retrieve message
      const messageTemplate = await this.botMessagesRepository.resolveMessage(
        botId,
        'partner_channel_prompt',
        lang,
      );

      // Interpolate variables
      const channelName = channelId.startsWith('@')
        ? channelId.substring(1)
        : channelId;
      const channelUrl = channelId.startsWith('@')
        ? `https://t.me/${channelName}`
        : `https://t.me/${channelId}`;

      const message = this.interpolateVariables(messageTemplate, {
        channelUrl,
        channelName,
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

      // Send message with inline keyboard
      await bot.telegram.sendMessage(userId, message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'I subscribed ✅',
                callback_data: 'partner_verify_subscription',
              },
            ],
          ],
        },
      });

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

      // Check rate limit
      const isRateLimited = await this.channelVerifierService.isRateLimited(
        userId,
        botId,
      );
      if (isRateLimited) {
        this.logger.warn({
          message: 'User is rate limited',
          userId,
          botId,
        });
        return {
          verified: false,
          error: 'Too many verification attempts. Please try again later.',
        };
      }

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

        // Send failure message
        const failureMessage = await this.botMessagesRepository.resolveMessage(
          botId,
          'partner_verification_failed',
          lang,
        );
        await bot.telegram.sendMessage(userId, failureMessage, {
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

      // Activate trial
      const activationResult = await this.trialService.activate(userId);

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
        message: 'Trial activated successfully',
        userId,
        botId,
        expiresAt: activationResult.expiresAt,
      });

      return {
        verified: true,
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
      // Retrieve message
      const messageTemplate = await this.botMessagesRepository.resolveMessage(
        botId,
        'partner_trial_activated',
        lang,
      );

      // Calculate days remaining
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Interpolate variables
      const message = this.interpolateVariables(messageTemplate, {
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

      // Send message with inline keyboard
      await bot.telegram.sendMessage(userId, message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Extend Free Period 🎁',
                callback_data: 'partner_extend_trial',
              },
            ],
            [
              {
                text: 'Buy Subscription 💳',
                callback_data: 'partner_buy_subscription',
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

  /**
   * Interpolate variables in message template
   *
   * Simple string replacement using provided variable map.
   *
   * @param template - Message template with {variable} placeholders
   * @param variables - Map of variable names to values
   * @returns Interpolated message string
   */
  private interpolateVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(`{${key}}`, value);
    }
    return result;
  }
}
