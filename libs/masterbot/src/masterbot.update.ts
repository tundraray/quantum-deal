import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  Start,
  Update,
  Ctx,
  Command,
  Action,
  InjectBot,
} from 'nestjs-telegraf';
import { randomBytes } from 'crypto';

import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
} from '@quantumdeal/framework';
import { SubscriptionsRepository, CodesRepository } from '@quantumdeal/db';
import { MasterbotService } from './masterbot.service';
import type { UserContext } from './interfaces';
import { MASTERBOT_CONSTANTS } from './constants';
import { Telegraf } from 'telegraf';
import { BotName } from '@quantumdeal/bot';

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class MasterbotUpdate {
  private readonly logger = new Logger(MasterbotUpdate.name);

  constructor(
    @InjectBot(BotName)
    private readonly bot: Telegraf<UserContext>,
    private readonly masterbotService: MasterbotService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly codesRepository: CodesRepository,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      this.logger.debug('Manager not found in context');
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Show typing indicator
      await ctx.sendChatAction('typing');

      const welcomeMessage = this.masterbotService.onStart(manager);

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      this.logger.error('Error in start command', error);
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.ERROR_GENERIC);
    }
  }

  @Command('stats')
  async onStats(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      this.logger.debug('Manager not found in context');
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Show typing indicator
      await ctx.sendChatAction('typing');

      // Log manager action
      this.masterbotService.logManagerAction(manager, 'STATS_COMMAND');

      this.logger.log(
        `Stats command requested by manager ${manager.telegramId}`,
      );

      // Get user statistics
      const stats = await this.masterbotService.getUserStatistics();
      const formattedMessage = this.masterbotService.formatUserStatistics(stats);

      await ctx.reply(formattedMessage, {
        parse_mode: 'Markdown',
        reply_markup: this.createBackToMenuKeyboard(),
      });
    } catch (error) {
      this.logger.error('Error in stats command', error);
      await ctx.reply(
        '❌ Failed to retrieve statistics. Please try again later.',
      );
    }
  }

  @Command('help')
  async onHelp(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    // Log manager action
    this.masterbotService.logManagerAction(manager, 'HELP_COMMAND');

    const helpMessage =
      `🔧 *Master Bot Commands*\n\n` +
      `Available commands for managers:\n\n` +
      `• /start - Initialize the admin panel\n` +
      `• /stats - View user and subscription statistics\n` +
      `• /code - Generate subscription codes\n` +
      `• /help - Show this help message\n\n` +
      `This bot provides administrative tools for monitoring the QuantumDeal bot ecosystem.\n\n` +
      `_Logged in as: ${manager.username || manager.firstName || `Manager ${manager.telegramId}`}_`;

    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown',
      reply_markup: this.createBackToMenuKeyboard(),
    });
  }

  @Command('code')
  async onCode(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Show typing indicator
      await ctx.sendChatAction('typing');

      // Log manager action
      this.masterbotService.logManagerAction(manager, 'CODE_COMMAND');

      this.logger.log(
        `Code command requested by manager ${manager.telegramId}`,
      );

      // Get all subscriptions except id=1
      const subscriptions = await this.subscriptionsRepository.findAll();
      const availableSubscriptions = subscriptions.filter(
        (sub) => sub.id !== 1,
      );

      if (availableSubscriptions.length === 0) {
        await ctx.reply('❌ No subscriptions available for code generation.');
        return;
      }

      // Create inline keyboard with subscription options
      const subscriptionButtons = availableSubscriptions.map((subscription) => [
        {
          text: subscription.name,
          callback_data: `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_PREFIX}${subscription.id}`,
        },
      ]);

      // Add back to menu button
      subscriptionButtons.push([
        {
          text: '🔙 Back to Menu',
          callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.MENU_MAIN,
        },
      ]);

      const keyboard = {
        inline_keyboard: subscriptionButtons,
      };

      await ctx.reply(
        '🎫 *Select your subscription option*\n\nChoose a subscription plan to generate a code for:',
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      this.logger.error('Error in code command', error);
      await ctx.reply(
        '❌ Failed to load subscription options. Please try again later.',
      );
    }
  }

  // Helper method to generate random alphanumeric code
  private generateCode(length: number = 15): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const randomBytesArray = randomBytes(length);

    for (let i = 0; i < length; i++) {
      result += characters.charAt(randomBytesArray[i] % characters.length);
    }

    return result;
  }

  // Helper method to create back to menu keyboard
  private createBackToMenuKeyboard() {
    return {
      inline_keyboard: [
        [
          {
            text: '🔙 Back to Menu',
            callback_data: MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.MENU_MAIN,
          },
        ],
      ],
    };
  }

  @Action(/^subscription_(\d+)$/)
  async onSubscriptionSelected(@Ctx() ctx: UserContext): Promise<void> {
    const me = await this.bot.telegram.getMe();
    console.log(me);

    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Extract subscription ID from callback data
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !('data' in callbackQuery)) {
        await ctx.reply('❌ Invalid selection.');
        return;
      }

      const callbackData = callbackQuery.data;

      const subscriptionIdStr = callbackData.replace(
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_PREFIX,
        '',
      );
      const subscriptionId = parseInt(subscriptionIdStr, 10);

      if (isNaN(subscriptionId)) {
        await ctx.reply('❌ Invalid subscription selection.');
        return;
      }

      // Verify subscription exists
      const subscription =
        await this.subscriptionsRepository.findById(subscriptionId);
      if (!subscription) {
        await ctx.reply('❌ Subscription not found.');
        return;
      }

      // Generate unique code
      let code: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        code = this.generateCode();
        const existingCode = await this.codesRepository.findByCode(code);
        if (!existingCode) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        await ctx.reply('❌ Failed to generate unique code. Please try again.');
        return;
      }

      // Save code to database
      await this.codesRepository.create({
        code: code!,
        subscriptionId,
        managerId: manager.telegramId,
      });

      // Log the action
      this.masterbotService.logManagerAction(manager, 'CODE_GENERATED', {
        subscriptionId,
        subscriptionName: subscription.name,
        generatedCode: code!,
      });

      const codeUrl = `https://t.me/${me.username}?start=${code!}`;

      // Reply with the generated code
      const successMessage =
        `✅ *Code Generated Successfully*\n\n` +
        `📋 **Subscription:** ${subscription.name}\n` +
        `📅 **Generated:** ${new Date().toLocaleString()}\n\n` +
        `🎫 **Code URL:**\n \`${codeUrl}\``;

      await ctx.sendMessage(successMessage, {
        parse_mode: 'Markdown',
        reply_markup: this.createBackToMenuKeyboard(),
      });

      // Answer the callback query to stop the loading indicator
      await ctx.answerCbQuery('Code generated successfully! ✅');
    } catch (error) {
      this.logger.error('Error generating code', error);
      await ctx.reply('❌ Failed to generate code. Please try again later.');

      // Answer the callback query even on error
      try {
        await ctx.answerCbQuery('❌ Error generating code');
      } catch (cbError) {
        this.logger.error('Error answering callback query', cbError);
      }
    }
  }

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.MENU_STATS)
  async onMenuStats(@Ctx() ctx: UserContext): Promise<void> {
    await ctx.answerCbQuery('Loading statistics...');
    await this.onStats(ctx);
  }

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.MENU_CODE)
  async onMenuCode(@Ctx() ctx: UserContext): Promise<void> {
    await ctx.answerCbQuery('Loading code generator...');
    await this.onCode(ctx);
  }

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.MENU_HELP)
  async onMenuHelp(@Ctx() ctx: UserContext): Promise<void> {
    await ctx.answerCbQuery('Loading help...');
    await this.onHelp(ctx);
  }

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.MENU_MAIN)
  async onMenuMain(@Ctx() ctx: UserContext): Promise<void> {
    await ctx.answerCbQuery('Loading main menu...');
    await this.onStart(ctx);
  }
}
