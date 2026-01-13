import {
  Injectable,
  Logger,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import {
  Action,
  Command,
  Ctx,
  On,
  Update,
  InjectBot,
  Next,
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
@Injectable()
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
        broadcastSubscriptionIds: null,
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
   * NEW FLOW: Shows bot selection first (instead of subscription list)
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

      // Clear previous broadcast session state for clean start
      ctx.session.broadcastSubscriptionIds = [];
      ctx.session.broadcastFilterBotId = null;
      ctx.session.broadcastFilterStatus = null;
      ctx.session.broadcastMessage = null;
      ctx.session.broadcastMessageEntities = null;

      // Set flow state to selecting bot filter (first step in new flow)
      ctx.session.flowState = 'selecting_bot_filter';

      // Log manager action
      this.masterbotService.logManagerAction(manager, 'BROADCAST_COMMAND');
      this.logger.log('Broadcast flow started');

      // Show bot selection keyboard first
      await this.showBotSelectionKeyboardReply(ctx);
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

      // Set state and save subscription ID to array
      ctx.session.broadcastSubscriptionIds = [subscriptionId];
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
      ctx.session.flowState = 'awaiting_broadcast_message';

      // Show message input prompt
      await ctx.editMessageText(
        `📝 *Введите сообщение для рассылки*\n\n` +
          `_Совет: Вы можете использовать форматирование текста_`,
        { parse_mode: 'Markdown' },
      );
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
      ctx.session.flowState = 'awaiting_broadcast_message';

      // Show message input prompt
      await ctx.editMessageText(
        `📝 *Введите сообщение для рассылки*\n\n` +
          `_Совет: Вы можете использовать форматирование текста_`,
        { parse_mode: 'Markdown' },
      );
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

      // Set bot filter and initialize subscription selection array
      ctx.session.broadcastFilterBotId = botId;
      ctx.session.broadcastSubscriptionIds = [];
      ctx.session.flowState = 'selecting_subscriptions';

      // Show subscription toggle keyboard for multi-selection
      await this.showSubscriptionToggleKeyboard(ctx, bot.name);
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in bot selected handler', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.editMessageText(`❌ Ошибка: ${errorMessage}`);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handler for toggling individual subscription selection
   * Adds or removes subscription ID from the selection array and refreshes keyboard
   */
  @Action(
    new RegExp(
      `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_TOGGLE_PREFIX}(\\d+)$`,
    ),
  )
  async onBroadcastSubscriptionToggle(@Ctx() ctx: UserContext): Promise<void> {
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
          `^${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_TOGGLE_PREFIX}(\\d+)$`,
        ),
      );
      if (!match) {
        await ctx.answerCbQuery('Неверный формат');
        return;
      }

      const subscriptionId = parseInt(match[1], 10);

      // Ensure session is initialized
      this.ensureSession(ctx);

      const selectedIds = ctx.session.broadcastSubscriptionIds || [];
      const index = selectedIds.indexOf(subscriptionId);

      if (index > -1) {
        // Remove if already selected
        selectedIds.splice(index, 1);
      } else {
        // Add if not selected
        selectedIds.push(subscriptionId);
      }

      ctx.session.broadcastSubscriptionIds = selectedIds;

      this.logger.log(
        `Toggled subscription ${subscriptionId}, selected: [${selectedIds.join(', ')}]`,
      );

      // Get bot name for keyboard refresh
      const botId = ctx.session.broadcastFilterBotId;
      let botName = 'Все боты';
      if (botId != null) {
        const bot = await this.botsRepository.findById(botId);
        botName = bot?.name || 'Неизвестный бот';
      }

      // Refresh keyboard to show updated checkmarks
      await this.showSubscriptionToggleKeyboard(ctx, botName);
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in subscription toggle handler', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handler for selecting/deselecting all subscriptions
   * If all are selected, deselects all; otherwise selects all displayed subscriptions
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_SELECT_ALL)
  async onBroadcastSelectAll(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Ensure session is initialized
      this.ensureSession(ctx);

      const botId = ctx.session.broadcastFilterBotId;

      // Fetch active subscriptions
      const subscriptions =
        await this.subscriptionsRepository.findActiveSubscriptions();

      // Get same filtered list as keyboard shows
      const subsWithCounts = await Promise.all(
        subscriptions.map(async (sub) => ({
          id: sub.id,
          count: await this.broadcastService.countSubscribers(
            sub.id,
            'active',
            botId,
          ),
        })),
      );

      // Filter out subscriptions with 0 subscribers (unless ALL are 0)
      const nonEmpty = subsWithCounts.filter((s) => s.count > 0);
      const displaySubs = nonEmpty.length > 0 ? nonEmpty : subsWithCounts;
      const allDisplayedIds = displaySubs.map((s) => s.id);

      const selectedIds = ctx.session.broadcastSubscriptionIds || [];

      // Check if all are already selected
      const allSelected =
        allDisplayedIds.length > 0 &&
        allDisplayedIds.every((id) => selectedIds.includes(id));

      if (allSelected) {
        // Deselect all
        ctx.session.broadcastSubscriptionIds = [];
        this.logger.log('Deselected all subscriptions');
      } else {
        // Select all displayed subscriptions
        ctx.session.broadcastSubscriptionIds = [...allDisplayedIds];
        this.logger.log(
          `Selected all subscriptions: [${allDisplayedIds.join(', ')}]`,
        );
      }

      // Get bot name for keyboard refresh
      let botName = 'Все боты';
      if (botId != null) {
        const bot = await this.botsRepository.findById(botId);
        botName = bot?.name || 'Неизвестный бот';
      }

      // Refresh keyboard with updated checkmarks
      await this.showSubscriptionToggleKeyboard(ctx, botName);
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in select all handler', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handler for "Done" button in subscription selection
   * Validates at least one subscription is selected, then proceeds to status filter
   */
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_DONE)
  async onBroadcastSubscriptionsDone(@Ctx() ctx: UserContext): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      await ctx.answerCbQuery(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
      return;
    }

    try {
      // Ensure session is initialized
      this.ensureSession(ctx);

      const selectedIds = ctx.session.broadcastSubscriptionIds || [];

      if (selectedIds.length === 0) {
        // Show warning - no selection
        await ctx.answerCbQuery('Выберите хотя бы одну подписку', {
          show_alert: true,
        });
        return;
      }

      this.logger.log(
        `Subscriptions selected: [${selectedIds.join(', ')}], proceeding to status filter`,
      );

      // Proceed to status filter
      ctx.session.flowState = 'selecting_status_filter';
      await this.showStatusFilterKeyboard(ctx);
      await ctx.answerCbQuery();
    } catch (error) {
      this.logger.error('Error in subscriptions done handler', error);
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

    // Get subscription IDs from session (multi-subscription support)
    const subscriptionIds = ctx.session.broadcastSubscriptionIds || [];
    const message = ctx.session.broadcastMessage;
    const entities = ctx.session.broadcastMessageEntities;
    const filterStatus = ctx.session.broadcastFilterStatus || 'active';
    const filterBotId = ctx.session.broadcastFilterBotId ?? null;
    const managerId = manager.telegramId;

    if (!message || subscriptionIds.length === 0) {
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

      // Send broadcast to multiple subscriptions with deduplication
      const result = await this.broadcastService.sendBroadcastMulti(
        subscriptionIds,
        message,
        entities || undefined,
        managerId,
        filterStatus,
        filterBotId,
      );

      // Display delivery report
      const reportText = this.buildDeliveryReport(
        result,
        subscriptionIds.length,
      );
      await ctx.reply(reportText, { parse_mode: 'Markdown' });

      // Log completion
      this.logger.log(
        `Broadcast multi: ${subscriptionIds.length} subs, ${result.queuedCount} unique users queued`,
      );

      // Log the action
      this.masterbotService.logManagerAction(manager, 'BROADCAST_SENT', {
        subscriptionIds,
        queuedCount: result.queuedCount,
        errorCount: result.errorCount,
        hasFormatting: entities && entities.length > 0,
      });
    } catch (error) {
      this.logger.error('Broadcast failed', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.reply(`❌ Ошибка при отправке: ${errorMessage}`);
    } finally {
      // Clear session state
      this.clearBroadcastSession(ctx);
    }
  }

  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL)
  async onBroadcastCancel(@Ctx() ctx: UserContext): Promise<void> {
    // Ensure session is initialized
    this.ensureSession(ctx);

    // Clear session state
    this.clearBroadcastSession(ctx);

    await ctx.editMessageText('❌ Рассылка отменена.');
    await ctx.answerCbQuery('Отменено');
  }

  // ==================== Text Handler ====================

  @On('text')
  async onText(
    @Ctx() ctx: UserContext,
    @Next() next: () => Promise<void>,
  ): Promise<void> {
    const manager = ctx.manager;
    if (!manager) {
      return next(); // Pass to next handler for non-managers
    }

    // Ensure session is initialized
    this.ensureSession(ctx);

    const flowState = ctx.session.flowState;

    // Only handle broadcast message input if in the correct flow state
    if (flowState === 'awaiting_broadcast_message') {
      await this.handleBroadcastMessageInput(ctx);
      return; // Don't call next() - we handled this message
    }

    // Pass to next handler if not our flow state
    return next();
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
   * Shows inline keyboard for selecting bot (using reply, for initial command)
   * Used as the FIRST step in the new broadcast flow
   */
  private async showBotSelectionKeyboardReply(ctx: UserContext): Promise<void> {
    // Fetch active bots
    const activeBots = await this.botsRepository.findAllActive();

    // Build bot selection buttons
    const botButtons = activeBots.map((bot) => [
      Markup.button.callback(
        bot.name,
        `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}${bot.id}`,
      ),
    ]);

    await ctx.reply(
      `📢 *Отправить сообщение*\n\n` + `🤖 Выберите бота для рассылки:`,
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
   * Shows inline keyboard for selecting subscriptions with toggle UI
   * Displays subscriptions filtered by selected bot with subscriber counts
   * Uses checkmarks to indicate selection state
   *
   * @param ctx - User context
   * @param botName - Name of the selected bot to display
   */
  private async showSubscriptionToggleKeyboard(
    ctx: UserContext,
    botName: string,
  ): Promise<void> {
    const botId = ctx.session.broadcastFilterBotId;

    // Fetch active subscriptions
    const subscriptions =
      await this.subscriptionsRepository.findActiveSubscriptions();

    // Get subscriber counts for each subscription filtered by bot
    const subsWithCounts = await Promise.all(
      subscriptions.map(async (sub) => ({
        ...sub,
        count: await this.broadcastService.countSubscribers(
          sub.id,
          'active',
          botId,
        ),
      })),
    );

    // Filter out subscriptions with 0 subscribers (unless ALL are 0 - fallback behavior)
    const nonEmpty = subsWithCounts.filter((s) => s.count > 0);
    const displaySubs = nonEmpty.length > 0 ? nonEmpty : subsWithCounts;

    const selectedIds = ctx.session.broadcastSubscriptionIds || [];

    this.logger.log(
      `Subscription toggle: showing ${displaySubs.length} subscriptions for bot ${botName}`,
    );

    // Build toggle buttons for each subscription
    const buttons = displaySubs.map((sub) => {
      const isSelected = selectedIds.includes(sub.id);
      const checkmark = isSelected ? '[✓]' : '[ ]';
      return [
        Markup.button.callback(
          `${checkmark} ${sub.name} (${sub.count} users)`,
          `${MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_TOGGLE_PREFIX}${sub.id}`,
        ),
      ];
    });

    // Add Select All button
    buttons.push([
      Markup.button.callback(
        '☑️ Выбрать все',
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_SELECT_ALL,
      ),
    ]);

    // Add Done and Cancel buttons
    buttons.push([
      Markup.button.callback(
        'Готово ➜',
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_SUB_DONE,
      ),
      Markup.button.callback(
        '❌ Отмена',
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
      ),
    ]);

    await ctx.editMessageText(
      `📋 *Выберите подписки для рассылки*\n\n` +
        `🤖 Бот: ${botName}\n\n` +
        `_Выберите одну или несколько подписок:_`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      },
    );
  }

  /**
   * Handles broadcast message input from user
   * Validates message and shows preview with confirm/cancel buttons
   *
   * NEW: Shows breakdown by subscription with unique user count (deduplicated)
   * Uses getUniqueUserCount() for multi-subscription broadcasts
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

    // Use broadcastSubscriptionIds array for multi-subscription support
    const subscriptionIds = ctx.session.broadcastSubscriptionIds || [];

    if (!message || subscriptionIds.length === 0) {
      return;
    }

    // Validate message
    const validation = this.broadcastService.validateMessage(message);
    if (!validation.valid) {
      await ctx.reply(`❌ ${validation.error}`);
      return;
    }

    try {
      // Get filter values from session (default to active/all bots for backward compatibility)
      const filterStatus = ctx.session.broadcastFilterStatus ?? 'active';
      const filterBotId = ctx.session.broadcastFilterBotId ?? null;

      // NEW: Get unique user count with breakdown using getUniqueUserCount
      const { total, breakdown } =
        await this.broadcastService.getUniqueUserCount(
          subscriptionIds,
          filterStatus,
          filterBotId,
        );

      // Calculate overlap (users in multiple subscriptions)
      const sumOfCounts = breakdown.reduce((sum, b) => sum + b.count, 0);
      const overlap = sumOfCounts - total;

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

      // Build subscriptions breakdown text
      let subscriptionsText = '';
      for (const item of breakdown) {
        subscriptionsText += `  • ${item.name}: ${item.count} пользователей\n`;
      }

      // Build overlap text (only show if there are overlapping users)
      const overlapText =
        overlap > 0
          ? `_(${overlap} пользователей в нескольких подписках)_\n`
          : '';

      // Save message and entities to session
      ctx.session.broadcastMessage = message;
      ctx.session.broadcastMessageEntities = entities || null;
      ctx.session.flowState = 'confirming_broadcast';

      // Show preview with confirmation
      // If entities exist, show formatted message by copying the original message
      if (entities && entities.length > 0) {
        await ctx.reply(
          `📊 *Предпросмотр рассылки*\n\n` +
            `🤖 Бот: ${botLabel}\n` +
            `🎯 Цель: ${filterStatusLabel}\n` +
            `📋 Подписки:\n${subscriptionsText}\n` +
            `👥 Всего получателей: *${total}* уникальных пользователей\n` +
            overlapText +
            `\n*Сообщение (с форматированием):*`,
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
            `🤖 Бот: ${botLabel}\n` +
            `🎯 Цель: ${filterStatusLabel}\n` +
            `📋 Подписки:\n${subscriptionsText}\n` +
            `👥 Всего получателей: *${total}* уникальных пользователей\n` +
            overlapText +
            `\n*Сообщение:*\n${message}\n\n` +
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
      ctx.session.broadcastSubscriptionIds = [];
      ctx.session.broadcastMessageEntities = null;
      this.logger.error('Error handling broadcast message input', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      await ctx.reply(`❌ Ошибка: ${errorMessage}`);
    }
  }

  /**
   * Build delivery report text for broadcast completion
   *
   * Shows:
   * - Number of subscriptions targeted
   * - Number of unique messages queued (deduplicated)
   * - Error count (if any)
   * - Note about deduplication
   *
   * @param result - Broadcast result from sendBroadcastMulti
   * @param subCount - Number of subscriptions targeted
   * @returns Formatted report text (Markdown)
   */
  private buildDeliveryReport(
    result: { queuedCount: number; errorCount: number },
    subCount: number,
  ): string {
    let report = `✅ *Рассылка завершена!*\n\n`;
    report += `📋 Подписок: ${subCount}\n`;
    report += `📬 Сообщений в очереди: ${result.queuedCount}\n`;
    if (result.errorCount > 0) {
      report += `❌ Ошибок: ${result.errorCount}\n`;
    }
    report += `\n_(Пользователи в нескольких подписках получили сообщение один раз)_`;
    return report;
  }

  /**
   * Clear all broadcast-related session state
   *
   * Called after broadcast completion or cancellation to ensure
   * clean state for next broadcast flow
   *
   * @param ctx - User context with session
   */
  private clearBroadcastSession(ctx: UserContext): void {
    ctx.session.broadcastSubscriptionIds = null;
    ctx.session.broadcastFilterBotId = null;
    ctx.session.broadcastFilterStatus = null;
    ctx.session.broadcastMessage = null;
    ctx.session.broadcastMessageEntities = null;
    ctx.session.flowState = null;
    ctx.session.commandContext = null;
  }
}
