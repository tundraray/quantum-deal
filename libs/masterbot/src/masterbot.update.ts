import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  Start,
  Update,
  Ctx,
  Command,
  Action,
  InjectBot,
  On,
} from '@quantumdeal/telegraf';
import { randomBytes } from 'crypto';

import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
} from '@quantumdeal/framework';
import { SubscriptionsRepository, CodesRepository } from '@quantumdeal/db';
import { MasterbotService } from './masterbot.service';
import type { UserContext } from './interfaces';
import { MASTERBOT_CONSTANTS } from './constants';
import { Telegraf, Markup } from 'telegraf';
import { BotName } from '@quantumdeal/bot';
import { SubscriptionManagementService } from './services/subscription-management.service';

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
    private readonly subscriptionManagementService: SubscriptionManagementService,
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
      const formattedMessage =
        this.masterbotService.formatUserStatistics(stats);

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
      `• /subscription - Manage subscriptions (create, close)\n` +
      `• /broadcast - Send message to subscribers\n` +
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

      // Get all active subscriptions (including signals and broadcast subscriptions)
      const activeSubscriptions =
        await this.subscriptionsRepository.findActiveSubscriptions();

      if (activeSubscriptions.length === 0) {
        await ctx.reply(
          '❌ Нет активных подписок. Создайте подписку с помощью /create_subscription',
        );
        return;
      }

      // Create inline keyboard with subscription options
      const subscriptionButtons = activeSubscriptions.map((subscription) => [
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

  // ==================== Subscription Broadcast Feature ====================

  /**
   * Ensures session is initialized with default values
   * This is a defensive measure to prevent undefined session errors
   */
  private ensureSession(ctx: UserContext): void {
    if (!ctx.session) {
      ctx.session = {
        flowState: null,
        commandContext: null,
        broadcastSubscriptionId: null,
        broadcastMessage: null,
        broadcastMessageEntities: null,
        broadcastFilterStatus: null,
        broadcastFilterBotId: null,
      } as UserContext['session'];
    }
  }

  @Command('subscription')
  async onSubscriptionMenu(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Log manager action
      this.masterbotService.logManagerAction(manager, 'SUBSCRIPTION_COMMAND');

      await ctx.reply('📋 *Управление подписками*\n\nВыберите действие:', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              '➕ Создать подписку',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_CREATE,
            ),
          ],
          [
            Markup.button.callback(
              '🔒 Закрыть подписку',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_CLOSE,
            ),
          ],
        ]),
      });
    } catch (error) {
      this.logger.error('Error in subscription menu command', error);
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.ERROR_GENERIC);
    }
  }

  // ==================== Create Subscription Flow ====================

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_CREATE)
  async onCreateSubscription(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Ensure session is initialized
      this.ensureSession(ctx);

      // Set state to await name input
      ctx.session.flowState = 'awaiting_subscription_name';

      await ctx.editMessageText(
        '📝 *Создание подписки*\n\n' +
          'Введите название подписки:\n\n' +
          '_Пример: Premium Market Analysis_',
        { parse_mode: 'Markdown' },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in create subscription action', error);
      await ctx.answerCbQuery('Ошибка при создании подписки');
    }
  }

  // ==================== Close Subscription Flow ====================

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.SUBSCRIPTION_CLOSE)
  async onCloseSubscription(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Get active broadcast subscriptions
      const subscriptions =
        await this.subscriptionManagementService.getActiveBroadcastSubscriptions();

      if (subscriptions.length === 0) {
        await ctx.editMessageText(
          MASTERBOT_CONSTANTS.ERRORS.NO_ACTIVE_SUBSCRIPTIONS,
        );
        await ctx.answerCbQuery();
        return;
      }

      // Create inline keyboard with subscription buttons
      const buttons = subscriptions.map((sub) => [
        Markup.button.callback(
          sub.name,
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_PREFIX}${sub.id}`,
        ),
      ]);
      buttons.push([
        Markup.button.callback(
          '🔙 Отмена',
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_CANCEL,
        ),
      ]);

      await ctx.editMessageText(
        '🔒 *Закрыть подписку*\n\n' + 'Выберите подписку для закрытия:',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(buttons),
        },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in close subscription action', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.editMessageText(`❌ Ошибка: ${errorMessage}`);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  @Action(
    new RegExp(
      `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_PREFIX}(\\d+)$`,
    ),
  )
  async onCloseSubscriptionSelected(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !('data' in callbackQuery)) {
        await ctx.answerCbQuery('Неверный выбор');
        return;
      }

      const match = callbackQuery.data.match(
        new RegExp(
          `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_PREFIX}(\\d+)$`,
        ),
      );
      if (!match) {
        await ctx.answerCbQuery('Неверный формат');
        return;
      }

      const subscriptionId = parseInt(match[1], 10);

      // Get subscription details
      const subscription =
        await this.subscriptionManagementService.getSubscriptionById(
          subscriptionId,
        );

      if (!subscription) {
        await ctx.editMessageText(
          MASTERBOT_CONSTANTS.ERRORS.SUBSCRIPTION_NOT_FOUND,
        );
        await ctx.answerCbQuery();
        return;
      }

      // Show confirmation
      await ctx.editMessageText(
        `⚠️ *Подтвердите закрытие*\n\n` +
          `Вы уверены, что хотите закрыть подписку *${subscription.name}*?\n\n` +
          `• Новые пользователи не смогут присоединиться\n` +
          `• Существующие подписчики сохранят доступ\n` +
          `• Это действие можно отменить позже`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                '✅ Да, закрыть',
                `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_CONFIRM}${subscriptionId}`,
              ),
            ],
            [
              Markup.button.callback(
                '❌ Отмена',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_CANCEL,
              ),
            ],
          ]),
        },
      );

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in close subscription selected', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.editMessageText(`❌ Ошибка: ${errorMessage}`);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  @Action(
    new RegExp(
      `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_CONFIRM}(\\d+)$`,
    ),
  )
  async onConfirmCloseSubscription(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !('data' in callbackQuery)) {
        await ctx.answerCbQuery('Неверный выбор');
        return;
      }

      const match = callbackQuery.data.match(
        new RegExp(
          `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_CONFIRM}(\\d+)$`,
        ),
      );
      if (!match) {
        await ctx.answerCbQuery('Неверный формат');
        return;
      }

      const subscriptionId = parseInt(match[1], 10);

      await this.subscriptionManagementService.closeSubscription(
        subscriptionId,
        manager.telegramId,
      );

      // Log the action
      this.masterbotService.logManagerAction(manager, 'SUBSCRIPTION_CLOSED', {
        subscriptionId,
      });

      await ctx.editMessageText(
        '✅ *Подписка закрыта*\n\n' +
          'Новые пользователи не смогут присоединиться к этой подписке.',
        { parse_mode: 'Markdown' },
      );

      await ctx.answerCbQuery('Подписка закрыта');
    } catch (error) {
      this.logger.error('Error confirming close subscription', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.editMessageText(`❌ Ошибка: ${errorMessage}`);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.CLOSE_SUB_CANCEL)
  async onCancelCloseSubscription(@Ctx() ctx: UserContext): Promise<void> {
    await ctx.editMessageText('❌ Закрытие подписки отменено.');
    await ctx.answerCbQuery('Отменено');
  }

  // ==================== Text Message Handler ====================

  @On('text')
  async onText(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      return; // Ignore messages from non-managers
    }

    // Ensure session is initialized
    this.ensureSession(ctx);

    const flowState = ctx.session.flowState;

    if (flowState === 'awaiting_subscription_name') {
      await this.handleSubscriptionNameInput(ctx);
    }
    // Broadcast message handling is done by BroadcastUpdate
  }

  // ==================== Private Helper Methods ====================

  private async handleSubscriptionNameInput(ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      return;
    }

    const name = ctx.message && 'text' in ctx.message ? ctx.message.text : null;

    if (!name) {
      return;
    }

    // Validate name
    if (!this.subscriptionManagementService.validateSubscriptionName(name)) {
      await ctx.reply(MASTERBOT_CONSTANTS.ERRORS.INVALID_NAME);
      return;
    }

    try {
      // Ensure session is initialized
      this.ensureSession(ctx);

      const managerId = manager.telegramId;

      // Create subscription
      const result =
        await this.subscriptionManagementService.createSubscription(
          name,
          managerId,
        );

      // Clear state
      ctx.session.flowState = null;

      // Log the action
      this.masterbotService.logManagerAction(manager, 'SUBSCRIPTION_CREATED', {
        subscriptionId: result.subscription.id,
        subscriptionName: result.subscription.name,
      });

      // Send success message
      await ctx.reply(
        '✅ *Подписка создана!*\n\n' +
          `📋 Название: ${result.subscription.name}\n` +
          `🆔 ID: ${result.subscription.id}\n` +
          `📅 Создана: ${result.subscription.createdAt.toLocaleString('ru-RU')}\n\n` +
          '💡 Для генерации кодов используйте команду /code',
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      ctx.session.flowState = null;
      this.logger.error('Error creating subscription', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.reply(`❌ Ошибка при создании подписки: ${errorMessage}`);
    }
  }
}
