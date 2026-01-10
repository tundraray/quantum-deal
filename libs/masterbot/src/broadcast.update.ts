import { Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  Action,
  Command,
  Ctx,
  On,
  Update,
  InjectBot,
} from '@quantumdeal/telegraf';
import { Telegraf, Markup } from 'telegraf';

import {
  ResponseTimeInterceptor,
  TelegrafExceptionFilter,
} from '@quantumdeal/framework';
import { SubscriptionsRepository, BotsRepository } from '@quantumdeal/db';

import { MASTERBOT_BOT_NAME } from './constants';
import { MASTERBOT_CONSTANTS } from './constants';
import type { UserContext } from './interfaces';
import { BroadcastService } from './services/broadcast.service';
import { MasterbotService } from './masterbot.service';

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(TelegrafExceptionFilter)
export class BroadcastUpdate {
  private readonly logger = new Logger(BroadcastUpdate.name);

  constructor(
    @InjectBot(MASTERBOT_BOT_NAME)
    private readonly bot: Telegraf<UserContext>,
    private readonly broadcastService: BroadcastService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly botsRepository: BotsRepository,
    private readonly masterbotService: MasterbotService,
  ) {}

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

  // ==================== Command Handler ====================

  /**
   * /broadcast command handler
   * KEY DIFFERENCE: Uses findActiveSubscriptions() to get ALL subscription types (signals + broadcast)
   * instead of getActiveBroadcastSubscriptions() which only gets broadcast type.
   */
  @Command('broadcast')
  async onBroadcastCommand(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      this.ensureSession(ctx);

      // Log manager action
      this.masterbotService.logManagerAction(manager, 'BROADCAST_COMMAND');

      // KEY CHANGE: Use findActiveSubscriptions() to get ALL subscription types
      // This includes both signals and broadcast subscriptions
      const subscriptions =
        await this.subscriptionsRepository.findActiveSubscriptions();

      if (subscriptions.length === 0) {
        await ctx.reply(MASTERBOT_CONSTANTS.ERRORS.NO_ACTIVE_SUBSCRIPTIONS);
        return;
      }

      // Get subscriber counts for each subscription
      const subscriptionsWithCounts = await Promise.all(
        subscriptions.map(async (sub) => ({
          ...sub,
          subscriberCount: await this.broadcastService.countSubscribers(sub.id),
        })),
      );

      // Filter out subscriptions with 0 subscribers
      const activeWithSubscribers = subscriptionsWithCounts.filter(
        (s) => s.subscriberCount > 0,
      );

      if (activeWithSubscribers.length === 0) {
        await ctx.reply('Нет подписок с активными подписчиками.');
        return;
      }

      // Create inline keyboard
      const buttons = activeWithSubscribers.map((sub) => [
        Markup.button.callback(
          `${sub.name} (${sub.subscriberCount} чел.)`,
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}${sub.id}`,
        ),
      ]);
      buttons.push([
        Markup.button.callback(
          '🔙 Отмена',
          MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
        ),
      ]);

      await ctx.reply(
        '📢 *Отправить сообщение*\n\n' + 'Выберите подписку для рассылки:',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(buttons),
        },
      );
    } catch (error) {
      this.logger.error('Error in broadcast command', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.reply(`❌ Ошибка: ${errorMessage}`);
    }
  }

  // ==================== Action Handlers ====================

  @Action(
    new RegExp(
      `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}(\\d+)$`,
    ),
  )
  async onBroadcastSubscriptionSelected(
    @Ctx() ctx: UserContext,
  ): Promise<void> {
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
          `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_PREFIX}(\\d+)$`,
        ),
      );
      if (!match) {
        await ctx.answerCbQuery('Неверный формат');
        return;
      }

      const subscriptionId = parseInt(match[1], 10);

      // Get subscription
      const subscription =
        await this.subscriptionsRepository.findById(subscriptionId);

      if (!subscription) {
        await ctx.editMessageText(
          MASTERBOT_CONSTANTS.ERRORS.SUBSCRIPTION_NOT_FOUND,
        );
        await ctx.answerCbQuery();
        return;
      }

      // Ensure session is initialized
      this.ensureSession(ctx);

      // Set state and save subscription ID
      ctx.session.broadcastSubscriptionId = subscriptionId;
      ctx.session.flowState = 'selecting_status_filter';

      // Initialize filter defaults
      ctx.session.broadcastFilterStatus = null;
      ctx.session.broadcastFilterBotId = null;

      // Show status filter keyboard
      await this.showStatusFilterKeyboard(ctx);

      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in broadcast subscription selected', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.editMessageText(`❌ Ошибка: ${errorMessage}`);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handler for selecting "Active subscribers" filter
   * Sets session state to track active filter and shows bot selection keyboard
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE)
  async onBroadcastFilterActive(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Ensure session is initialized
      this.ensureSession(ctx);

      // Set filter status to active
      ctx.session.broadcastFilterStatus = 'active';
      ctx.session.flowState = 'selecting_bot_filter';

      // Show bot selection keyboard
      await this.showBotFilterKeyboard(ctx);
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in filter active handler', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handler for selecting "Expired subscribers" filter
   * Sets session state to track expired filter and shows bot selection keyboard
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED)
  async onBroadcastFilterExpired(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Ensure session is initialized
      this.ensureSession(ctx);

      // Set filter status to expired
      ctx.session.broadcastFilterStatus = 'expired';
      ctx.session.flowState = 'selecting_bot_filter';

      // Show bot selection keyboard
      await this.showBotFilterKeyboard(ctx);
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in filter expired handler', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handler for selecting "All bots" filter
   * Sets session state to target all bots and proceeds to message input
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL)
  async onBroadcastBotAll(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Ensure session is initialized
      this.ensureSession(ctx);

      // Set bot filter to null (all bots)
      ctx.session.broadcastFilterBotId = null;
      ctx.session.flowState = 'awaiting_broadcast_message';

      // Show message input prompt
      await ctx.editMessageText(
        `📝 *Введите сообщение для рассылки*\n\n` +
          `_Совет: Вы можете использовать форматирование текста_`,
        { parse_mode: 'Markdown' },
      );
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in bot all handler', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handler for selecting a specific bot filter
   * Validates bot exists and sets session state to target specific bot
   */
  @Action(
    new RegExp(
      `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}(\\d+)$`,
    ),
  )
  async onBroadcastBotSelected(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !('data' in callbackQuery)) {
        await ctx.editMessageText('❌ Неверный выбор');
        await ctx.answerCbQuery('Ошибка');
        return;
      }

      // Parse bot ID from callback data
      const match = callbackQuery.data.match(
        new RegExp(
          `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}(\\d+)$`,
        ),
      );

      if (!match) {
        await ctx.editMessageText('❌ Неверный формат выбора бота');
        await ctx.answerCbQuery('Ошибка');
        return;
      }

      const botId = parseInt(match[1], 10);

      if (isNaN(botId)) {
        await ctx.editMessageText('❌ Неверный ID бота');
        await ctx.answerCbQuery('Ошибка');
        return;
      }

      // Validate bot exists
      const bot = await this.botsRepository.findById(botId);
      if (!bot) {
        await ctx.editMessageText('❌ Бот не найден');
        await ctx.answerCbQuery('Бот не найден');
        return;
      }

      // Ensure session is initialized
      this.ensureSession(ctx);

      // Set bot filter
      ctx.session.broadcastFilterBotId = botId;
      ctx.session.flowState = 'awaiting_broadcast_message';

      // Show message input prompt with bot name
      await ctx.editMessageText(
        `📝 *Введите сообщение для рассылки*\n\n` +
          `🤖 Бот: ${bot.name}\n\n` +
          `_Совет: Вы можете использовать форматирование текста_`,
        { parse_mode: 'Markdown' },
      );
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in bot selected handler', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.editMessageText(`❌ Ошибка: ${errorMessage}`);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM)
  async onBroadcastConfirm(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    // Ensure session is initialized
    this.ensureSession(ctx);

    const subscriptionId = ctx.session.broadcastSubscriptionId;
    const message = ctx.session.broadcastMessage;
    const entities = ctx.session.broadcastMessageEntities;

    if (!subscriptionId || !message) {
      await ctx.editMessageText('❌ Ошибка: данные сессии потеряны');
      await ctx.answerCbQuery('Ошибка');
      return;
    }

    try {
      // Send initial status
      await ctx.editMessageText(
        '⏳ *Рассылка запущена*\n\n' +
          'Ваше сообщение отправляется...\n' +
          'Это может занять некоторое время.',
        { parse_mode: 'Markdown' },
      );

      await ctx.answerCbQuery('Рассылка началась...');

      // Get filter values from session (default to active/all bots for backward compatibility)
      const filterStatus = ctx.session.broadcastFilterStatus ?? 'active';
      const filterBotId = ctx.session.broadcastFilterBotId ?? null;

      // Send broadcast with entities and filters
      const result = await this.broadcastService.sendBroadcast(
        subscriptionId,
        message,
        entities || undefined,
        manager.telegramId,
        filterStatus,
        filterBotId,
      );

      // Clear session including filter state
      ctx.session.flowState = null;
      ctx.session.broadcastSubscriptionId = null;
      ctx.session.broadcastMessage = null;
      ctx.session.broadcastMessageEntities = null;
      ctx.session.broadcastFilterStatus = null;
      ctx.session.broadcastFilterBotId = null;

      // Log the action
      this.masterbotService.logManagerAction(manager, 'BROADCAST_SENT', {
        subscriptionId,
        queuedCount: result.queuedCount,
        errorCount: result.errorCount,
        hasFormatting: entities && entities.length > 0,
      });

      // Send completion report
      await ctx.reply(
        `✅ *Рассылка завершена*\n\n` +
          `Поставлено в очередь: ${result.queuedCount} сообщений\n` +
          `Ошибок: ${result.errorCount}\n\n` +
          `_Сообщения доставляются с учетом ограничений Telegram API._`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      // Clear session including filter state
      ctx.session.flowState = null;
      ctx.session.broadcastSubscriptionId = null;
      ctx.session.broadcastMessage = null;
      ctx.session.broadcastMessageEntities = null;
      ctx.session.broadcastFilterStatus = null;
      ctx.session.broadcastFilterBotId = null;

      this.logger.error('Error confirming broadcast', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.reply(`❌ Ошибка при отправке: ${errorMessage}`);
    }
  }

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL)
  async onBroadcastCancel(@Ctx() ctx: UserContext): Promise<void> {
    // Ensure session is initialized
    this.ensureSession(ctx);

    // Clear session including filter state
    ctx.session.flowState = null;
    ctx.session.broadcastSubscriptionId = null;
    ctx.session.broadcastMessage = null;
    ctx.session.broadcastMessageEntities = null;
    ctx.session.broadcastFilterStatus = null;
    ctx.session.broadcastFilterBotId = null;

    await ctx.editMessageText('❌ Рассылка отменена.');
    await ctx.answerCbQuery('Отменено');
  }

  // ==================== Text Handler ====================

  @On('text')
  async onText(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      return; // Ignore messages from non-managers
    }

    // Ensure session is initialized
    this.ensureSession(ctx);

    const flowState = ctx.session.flowState;

    // Only handle broadcast message input if in the correct flow state
    if (flowState === 'awaiting_broadcast_message') {
      await this.handleBroadcastMessageInput(ctx);
    }
    // Other text states are not handled by BroadcastUpdate
  }

  // ==================== Private Helper Methods ====================

  /**
   * Shows inline keyboard for selecting subscription status filter (Active/Expired)
   */
  private async showStatusFilterKeyboard(ctx: UserContext): Promise<void> {
    await ctx.editMessageText(
      `📊 *Выберите тип подписчиков*\n\n` +
        `Выберите, каких подписчиков включить в рассылку:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              '🟢 Активные подписчики',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
            ),
            Markup.button.callback(
              '🔴 Истекшие подписки',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
            ),
          ],
          [
            Markup.button.callback(
              '❌ Отмена',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
            ),
          ],
        ]),
      },
    );
  }

  /**
   * Shows inline keyboard for selecting bot filter (All bots / Specific bot)
   * Fetches active bots from repository and displays them as options
   */
  private async showBotFilterKeyboard(ctx: UserContext): Promise<void> {
    // Fetch active bots
    const activeBots = await this.botsRepository.findAllActive();

    // Build bot selection buttons
    const botButtons = activeBots.map((bot) => [
      Markup.button.callback(
        bot.name,
        `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}${bot.id}`,
      ),
    ]);

    await ctx.editMessageText(
      `🤖 *Выберите бота*\n\n` +
        `Выберите, подписчикам какого бота отправить рассылку:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              '📱 Все боты',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL,
            ),
          ],
          ...botButtons,
          [
            Markup.button.callback(
              '❌ Отмена',
              MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
            ),
          ],
        ]),
      },
    );
  }

  /**
   * Handles broadcast message input from user
   * Validates message and shows preview with confirm/cancel buttons
   */
  private async handleBroadcastMessageInput(ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      return;
    }

    // Ensure session is initialized
    this.ensureSession(ctx);

    const message =
      ctx.message && 'text' in ctx.message ? ctx.message.text : null;
    const entities =
      ctx.message && 'entities' in ctx.message
        ? ctx.message.entities
        : undefined;
    const subscriptionId = ctx.session.broadcastSubscriptionId;

    if (!message || !subscriptionId) {
      return;
    }

    // Validate message
    const validation = this.broadcastService.validateMessage(message);
    if (!validation.valid) {
      await ctx.reply(`❌ ${validation.error}`);
      return;
    }

    try {
      // Get subscription
      const subscription =
        await this.subscriptionsRepository.findById(subscriptionId);

      if (!subscription) {
        ctx.session.flowState = null;
        ctx.session.broadcastSubscriptionId = null;
        await ctx.reply(MASTERBOT_CONSTANTS.ERRORS.SUBSCRIPTION_NOT_FOUND);
        return;
      }

      // Get filter values from session (default to active/all bots for backward compatibility)
      const filterStatus = ctx.session.broadcastFilterStatus ?? 'active';
      const filterBotId = ctx.session.broadcastFilterBotId ?? null;

      // Count subscribers with filters
      const subscriberCount = await this.broadcastService.countSubscribers(
        subscriptionId,
        filterStatus,
        filterBotId,
      );

      // Build filter description labels for preview
      const filterStatusLabel =
        filterStatus === 'expired'
          ? 'Истекшие подписки'
          : 'Активные подписчики';

      // Get bot name if specific bot is selected
      let botLabel = 'Все боты';
      if (filterBotId != null) {
        const bot = await this.botsRepository.findById(filterBotId);
        botLabel = bot?.name || 'Неизвестный бот';
      }

      // Save message and entities to session
      ctx.session.broadcastMessage = message;
      ctx.session.broadcastMessageEntities = entities || null;
      ctx.session.flowState = 'confirming_broadcast';

      // Show preview with confirmation
      // If entities exist, show formatted message by copying the original message
      if (entities && entities.length > 0) {
        await ctx.reply(
          `📊 *Предпросмотр рассылки*\n\n` +
            `📋 Подписка: ${subscription.name}\n` +
            `🎯 Цель: ${filterStatusLabel}\n` +
            `🤖 Бот: ${botLabel}\n` +
            `👥 Получателей: ${subscriberCount} пользователей\n\n` +
            `*Сообщение (с форматированием):*`,
          { parse_mode: 'Markdown' },
        );

        // Forward or copy the formatted message to show preview
        await ctx.telegram.sendMessage(ctx.chat!.id, message, {
          entities: entities,
        });

        // Show confirmation buttons
        await ctx.reply(`Отправить это сообщение?`, {
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                '✅ Отправить',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
              ),
            ],
            [
              Markup.button.callback(
                '❌ Отмена',
                MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
              ),
            ],
          ]),
        });
      } else {
        // No entities, show plain text preview
        await ctx.reply(
          `📊 *Предпросмотр рассылки*\n\n` +
            `📋 Подписка: ${subscription.name}\n` +
            `🎯 Цель: ${filterStatusLabel}\n` +
            `🤖 Бот: ${botLabel}\n` +
            `👥 Получателей: ${subscriberCount} пользователей\n\n` +
            `*Сообщение:*\n${message}\n\n` +
            `Отправить это сообщение?`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  '✅ Отправить',
                  MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CONFIRM,
                ),
              ],
              [
                Markup.button.callback(
                  '❌ Отмена',
                  MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
                ),
              ],
            ]),
          },
        );
      }
    } catch (error) {
      ctx.session.flowState = null;
      ctx.session.broadcastSubscriptionId = null;
      ctx.session.broadcastMessageEntities = null;
      this.logger.error('Error handling broadcast message input', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.reply(`❌ Ошибка: ${errorMessage}`);
    }
  }
}
