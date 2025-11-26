import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import { Start, Update, Ctx, Message, InjectBot } from '@quantumdeal/telegraf';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
  SplitCommandPipe,
  LLMService,
} from '@quantumdeal/framework';
import {
  CodesRepository,
  UsersRepository,
  SubscriptionsRepository,
  UserSubscriptionsRepository,
} from '@quantumdeal/db';
import {
  isBroadcastSubscription,
  type Subscription,
} from '@quantumdeal/db/schema/subscriptions';
import type { UserContext, UserWithSubscriptions } from '../../interfaces';
import { BotCommandsService } from '../../services/bot-commands.service';
import { TrialService } from '../../services/trial.service';
import {
  OnboardingService,
  type MonthlyStats,
} from '../../services/onboarding.service';
import { langKeyboard } from '../../lang';
import { welcome } from './welcome';
import { getStartMessage } from './start.i18n';
import { MASTERBOT_BOT_NAME } from '@quantumdeal/masterbot/constants';
import telegramifyMarkdown from 'telegramify-markdown';

/**
 * StartUpdate
 *
 * Handles /start command routing and business logic.
 *
 * Features:
 * - Generates personalized welcome messages using LLM
 * - Activates subscription codes if provided via deep linking
 * - Sends activation notifications to managers
 * - Updates bot commands menu based on user's features
 */
@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class StartUpdate {
  private readonly logger = new Logger(StartUpdate.name);

  constructor(
    @InjectBot('QuantumDealBot')
    private readonly bot: Telegraf<UserContext>,
    @InjectBot(MASTERBOT_BOT_NAME)
    private readonly masterbot: Telegraf<UserContext>,
    private readonly llmService: LLMService,
    private readonly usersRepository: UsersRepository,
    private readonly codesRepository: CodesRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly botCommandsService: BotCommandsService,
    private readonly trialService: TrialService,
    private readonly onboardingService: OnboardingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle /start command
   *
   * Supports activation codes via deep linking: /start CODE
   *
   * @param ctx - Telegram context
   * @param args - Command arguments [command, code, extraArgs]
   */
  @Start()
  async onStart(
    @Ctx() ctx: UserContext,
    @Message('text', new SplitCommandPipe())
    args: [string, string | undefined, string[] | undefined] | undefined,
  ): Promise<void> {
    const user = ctx.user;
    if (!user) {
      this.logger.debug('User not found in context');
      return;
    }

    try {
      // Send typing indicator
      await this.bot.telegram
        .sendChatAction(user.telegramId, 'typing')
        .catch((e) => this.logger.error('Error sending chat action', e));

      // Extract activation code from args
      const [, code] = args ?? [];

      // Fetch monthly statistics for onboarding (NEW - Week 3)
      const statistics = await this.onboardingService.getMonthlyStatistics();

      // Process start command
      const { welcomeMessage, codeActivated, trialEligible } =
        await this.handleStart(user, code, statistics);

      // Set personalized commands menu based on user's features and language
      // NOTE: This must be called AFTER handleStart because handleStart may activate
      // a subscription code and update the user's feature flags
      if (!code || codeActivated) {
        // Set commands after processing to reflect updated features
        await this.botCommandsService.setUserCommands(
          user.telegramId,
          user.enabledFeatures,
          user.lang ?? 'en',
        );
      }

      // Format statistics for display (NEW - Week 3)
      const statsText = this.onboardingService.formatStatistics(
        statistics,
        user.lang ?? 'en',
      );

      // Build message with statistics (if available)
      const fullMessage = statsText
        ? `${welcomeMessage}\n\n${statsText}`
        : welcomeMessage;

      // Build inline keyboard
      const keyboard: { text: string; callback_data: string }[][] = [];

      // Add trial button if eligible
      if (trialEligible) {
        // Get trial duration from config for button label
        const trialDuration = this.configService.get<number>(
          'TRIAL_DURATION_DAYS',
          7,
        );

        keyboard.push([
          {
            text: getStartMessage(
              user.lang ?? 'en',
              'tryFreeTrialButton',
              trialDuration,
            ),
            callback_data: 'activate_trial',
          },
        ]);
      }

      // Add "View Plans" and "Change Language" buttons (always shown, on same row)
      keyboard.push([
        {
          text: getStartMessage(user.lang ?? 'en', 'viewPlansButton'),
          callback_data: 'open_renewal_scene',
        },
        {
          text: getStartMessage(user.lang ?? 'en', 'changeLangButton'),
          callback_data: 'change_lang',
        },
      ]);

      // Send welcome message with language selection keyboard
      await ctx.reply(telegramifyMarkdown(fullMessage, 'keep'), {
        parse_mode: 'MarkdownV2',
        ...langKeyboard(2),
        reply_markup:
          keyboard.length > 0
            ? {
                inline_keyboard: keyboard,
              }
            : undefined,
      });
    } catch (error) {
      this.logger.error('Error in /start command', error);
      await ctx.reply(getStartMessage(user.lang ?? 'en', 'genericError'));
    }
  }

  /**
   * Handle start command logic
   *
   * @param user - User object with subscriptions
   * @param code - Optional activation code from /start command
   * @param statistics - Monthly bot statistics (NEW - Week 3)
   * @returns Welcome message text, activation status, and trial eligibility
   */
  private async handleStart(
    user: UserWithSubscriptions,
    code?: string,
    statistics?: MonthlyStats | null,
  ): Promise<{
    welcomeMessage: string;
    codeActivated: boolean;
    trialEligible?: boolean;
  }> {
    // Activate code if provided
    const activationResult = code
      ? await this.activateCode(user, code)
      : { user };

    // Fetch all active subscriptions for the user
    const userSubscriptions =
      await this.userSubscriptionsRepository.findActiveByUserIdWithSubscription(
        user.telegramId,
      );

    // Check trial eligibility
    const trialEligible = await this.trialService.isEligible(user.telegramId);

    // Get trial duration from config for LLM prompt
    const trialDuration = this.configService.get<number>(
      'TRIAL_DURATION_DAYS',
      7,
    );

    // Build prompt data
    const promptData = {
      user: {
        telegramId: activationResult.user.telegramId,
        username: activationResult.user.username,
        firstName: activationResult.user.firstName,
        lastName: activationResult.user.lastName,
        lang: activationResult.user.lang,
      },
      subscriptions: userSubscriptions.map((us) => ({
        name: us.subscription.name,
        type: us.subscription.type,
        activatedAt: us.userSubscription.activatedAt,
        expiresAt: us.userSubscription.expiresAt,
      })),
      justActivated: activationResult.activatedSubscription
        ? {
            name: activationResult.activatedSubscription.subscription.name,
            type: activationResult.activatedSubscription.subscription.type,
            expiresAt: activationResult.activatedSubscription.expiresAt,
          }
        : undefined,
      trialEligible,
      trialDuration, // Pass dynamic trial duration to LLM prompt
      statistics,
    };

    try {
      const welcomeMessage = await this.llmService.generateText({
        model: 'gpt-5-mini',
        systemPrompt: welcome,
        prompt: JSON.stringify(promptData, null, 2),
      });

      return {
        welcomeMessage,
        codeActivated: !!activationResult.activatedSubscription,
        trialEligible,
      };
    } catch (error) {
      this.logger.error('Error generating welcome message with LLM', error);

      // Fallback message if LLM fails
      const lang = user.lang ?? 'en';
      const fallbackMessage = activationResult.activatedSubscription
        ? getStartMessage(lang, 'welcomeWithActivation')
        : userSubscriptions.length > 0
          ? getStartMessage(
              lang,
              'welcomeWithSubscriptions',
              userSubscriptions.length,
            )
          : getStartMessage(lang, 'welcomeNew');

      return {
        welcomeMessage: fallbackMessage,
        codeActivated: !!activationResult.activatedSubscription,
        trialEligible,
      };
    }
  }

  /**
   * Activate subscription code
   *
   * @param user - User activating the code
   * @param code - Activation code
   * @returns Activation result with subscription details
   */
  private async activateCode(
    user: UserWithSubscriptions,
    code: string,
  ): Promise<{
    user: UserWithSubscriptions;
    activatedSubscription?: {
      subscription: Subscription;
      expiresAt: Date;
    };
  }> {
    // Find code (validates userId IS NULL via findByCode)
    const $code = await this.codesRepository.findByCode(code);
    if (!$code) {
      return { user }; // Code not found or already used
    }

    // Get subscription and validate
    const subscription = await this.subscriptionsRepository.findById(
      $code.subscriptionId,
    );
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (!subscription.isActive) {
      throw new Error('This subscription is closed');
    }

    // Mark code as used
    await this.codesRepository.update($code.id, {
      userId: user.telegramId,
      activationDate: new Date(),
    });

    // Calculate expiration (30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Create user subscription entry (unified architecture for ALL types)
    await this.userSubscriptionsRepository.activate(
      user.telegramId,
      subscription.id,
      expirationDate,
    );

    // Send notification to manager about activation
    if ($code.managerId) {
      await this.sendManagerNotification(
        $code.managerId,
        user,
        subscription,
        expirationDate,
        $code.code,
      );
    }

    return {
      user,
      activatedSubscription: {
        subscription,
        expiresAt: expirationDate,
      },
    };
  }

  /**
   * Send activation notification to manager
   *
   * @param managerId - Manager's Telegram ID
   * @param user - User who activated the code
   * @param subscription - Activated subscription
   * @param expirationDate - Subscription expiration date
   * @param code - Activation code
   */
  private async sendManagerNotification(
    managerId: number,
    user: UserWithSubscriptions,
    subscription: Subscription,
    expirationDate: Date,
    code: string,
  ): Promise<void> {
    const subscriptionType = isBroadcastSubscription(subscription.type)
      ? 'broadcast group'
      : 'signals subscription';

    const userName = user.username
      ? `@${user.username}`
      : user.firstName || `User ${user.telegramId}`;

    const expirationText = expirationDate
      ? `until ${expirationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
      : 'permanently';

    const managerMessage =
      `✅ *Subscription Activated*\n\n` +
      `👤 User: ${userName}\n` +
      `📋 Subscription: ${subscription.name}\n` +
      `🏷️ Type: ${subscriptionType}\n` +
      `📅 Valid ${expirationText}\n` +
      `🎫 Code: \`${code}\``;

    try {
      await this.masterbot.telegram.sendMessage(managerId, managerMessage, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      this.logger.error(
        `Failed to send manager notification to ${managerId}`,
        error,
      );
    }
  }
}
