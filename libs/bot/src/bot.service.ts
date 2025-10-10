import { Injectable } from '@nestjs/common';
import { LLMService } from '@quantumdeal/framework';
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
import { welcome } from './promts/welcome';
import { UserContext, UserWithSubscriptions } from './interfaces';
import { NotificationService } from './services/notification.service';
import {
  MessagePriority,
  QueuedMessageType,
} from './interfaces/notification.interface';
import { MASTERBOT_BOT_NAME } from '@quantumdeal/masterbot';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotService {
  constructor(
    private readonly llmService: LLMService,
    private readonly usersRepository: UsersRepository,
    private readonly codesRepository: CodesRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    @InjectBot(MASTERBOT_BOT_NAME)
    private readonly masterbot: Telegraf<UserContext>,
  ) {}

  async onStart(user: UserWithSubscriptions, code?: string) {
    // Activate code if provided
    const activationResult = code
      ? await this.activateCode(user, code)
      : { user };

    // Fetch all active subscriptions for the user
    const userSubscriptions =
      await this.userSubscriptionsRepository.findActiveByUserIdWithSubscription(
        user.telegramId,
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
    };

    const welcomeMessage = await this.llmService.generateText({
      model: 'gpt-5-mini',
      systemPrompt: welcome,
      prompt: JSON.stringify(promptData, null, 2),
    });

    return welcomeMessage;
  }

  async onLang(ctx: UserContext, code?: string) {
    const [, , message] = await Promise.all([
      this.usersRepository.update(ctx.user!.telegramId, {
        lang: code,
      }),
      await ctx.telegram.answerCbQuery(ctx.callbackQuery?.id ?? ''),
      await this.llmService.generateText({
        model: 'gpt-5-nano',
        prompt: `You are telegram bot assistant. Send short, friendly message about language change to ${code}. The message in ${code} language.`,
      }),
    ]);

    await ctx.reply(message);
  }

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
        `🎫 Code: \`${$code.code}\``;

      this.masterbot.telegram.sendMessage($code.managerId, managerMessage, {
        parse_mode: 'Markdown',
      });
    }

    return {
      user,
      activatedSubscription: {
        subscription,
        expiresAt: expirationDate,
      },
    };
  }
}
