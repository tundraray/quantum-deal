import { Injectable, Logger } from '@nestjs/common';
import {
  SubscriptionsRepository,
  BotMessagesRepository,
  UserSubscriptionFeaturesRepository,
} from '@quantumdeal/db';
import type { MergedOrder, MessageType } from '@quantumdeal/db/schema';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { BotRegistryService } from './bot-registry.service';
import { NotificationService } from './notification.service';
import type {
  BroadcastResult,
  BotDeliveryResult,
  MultiBotSignal,
} from '../interfaces/multi-bot-signal.interface';
import type { SignalCapableBot } from '../interfaces/bot-registry.interface';
import {
  MessagePriority,
  QueuedMessageType,
  NotificationUser,
} from '../interfaces/notification.interface';

/**
 * MultiBotSignalService
 *
 * Orchestrates signal distribution across all active bots.
 * Implements parallel delivery with fault isolation per ADR-007 Decision 2.
 *
 * Key responsibilities:
 * - Get eligible bots from BotRegistryService
 * - Query per-bot subscribers from SubscriptionsRepository
 * - Apply custom filtering per user
 * - Resolve bot-specific message templates
 * - Coordinate parallel delivery to all bots
 * - Aggregate and return results
 *
 * @remarks
 * - AC-001: Broadcast to all signal-capable bots
 * - AC-002: Parallel processing via Promise.all
 * - AC-006: Fault isolation (one bot failure doesn't block others)
 * - AC-007: Per-bot stats in BroadcastResult
 */
@Injectable()
export class MultiBotSignalService implements MultiBotSignal {
  private readonly logger = new Logger(MultiBotSignalService.name);

  constructor(
    private readonly botRegistryService: BotRegistryService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly notificationService: NotificationService,
    private readonly userSubscriptionFeaturesRepository: UserSubscriptionFeaturesRepository,
  ) {}

  /**
   * Broadcast a signal to all active bots.
   *
   * @param order - The order data with all required fields
   * @param eventType - The signal event type (open, close_plus, close_minus, etc.)
   * @returns Aggregated results from all bots
   *
   * @remarks
   * - Returns empty result if order has no sector
   * - Returns empty result if no signal-capable bots found
   * - Processes all bots in parallel via Promise.all
   * - Each bot's failure is isolated and doesn't affect others
   */
  async broadcastSignal(
    order: MergedOrder,
    eventType: MessageType,
  ): Promise<BroadcastResult> {
    const startTime = Date.now();
    const sector = order.sector;

    // Validate sector exists
    if (!sector) {
      this.logger.warn('Cannot broadcast signal: order has no sector');
      return this.createEmptyResult(startTime);
    }

    this.logger.log(
      `Broadcasting ${eventType} signal for ${order.symbol} (sector: ${sector})`,
    );

    // Get all signal-capable bots
    const bots = this.botRegistryService.getSignalCapableBots();

    if (bots.length === 0) {
      this.logger.warn('No signal-capable bots found');
      return this.createEmptyResult(startTime);
    }

    this.logger.debug(`Found ${bots.length} bots for signal broadcast`);

    // AC-002: Process all bots in parallel
    const deliveryPromises = bots.map((bot) =>
      this.deliverToBot(bot, order, eventType, sector),
    );

    const perBotResults = await Promise.all(deliveryPromises);

    // Aggregate results
    const result = this.aggregateResults(perBotResults, startTime);

    this.logger.log(
      `Broadcast complete: ${result.totalSent} sent, ${result.totalFailed} failed, ` +
        `${result.botsProcessed}/${bots.length} bots [${result.totalDurationMs}ms]`,
    );

    return result;
  }

  /**
   * Get count of bots currently capable of sending signals.
   *
   * @returns Number of signal-capable bots
   */
  getEligibleBotCount(): number {
    const bots = this.botRegistryService.getSignalCapableBots();
    return bots.length;
  }

  /**
   * Deliver signal to a single bot.
   * Isolated error handling ensures one bot's failure doesn't affect others (AC-006).
   *
   * @param bot - The bot to deliver to
   * @param order - The order data
   * @param eventType - The signal event type
   * @param sector - The sector for subscription lookup
   * @returns Bot delivery result
   */
  private async deliverToBot(
    bot: SignalCapableBot,
    order: MergedOrder,
    eventType: MessageType,
    sector: string,
  ): Promise<BotDeliveryResult> {
    const startTime = Date.now();
    const botName = bot.name;
    const botId = bot.botId;

    try {
      // Step 1: Get users subscribed to this specific bot
      const subscriptions =
        await this.subscriptionsRepository.findBySectorForBot(sector, botId);

      if (subscriptions.length === 0) {
        this.logger.debug(
          `Bot ${botName}: no subscribers for sector ${sector}`,
        );
        return this.createBotResult(bot, true, 0, 0, startTime);
      }

      // Step 2: Map to NotificationUser format
      const users: NotificationUser[] = subscriptions.map((sub) => ({
        userId: sub.userId,
        telegramId: Number(sub.userTelegramId),
        firstName: sub.userFirstName,
        lastName: sub.userLastName,
        username: sub.userUsername,
        lang: sub.userLang,
        subscriptionId: sub.subscriptionId,
        subscriptionScope: null,
        subscriptionExpirationDate: sub.userSubscriptionEndDate,
        hasCustomFiltering: sub.hasCustomFiltering,
      }));

      // Step 3: Apply custom filtering
      const filteredUsers = await this.applyCustomFiltering(
        users,
        order.symbol,
      );

      if (filteredUsers.length === 0) {
        this.logger.debug(
          `Bot ${botName}: all users filtered out for symbol ${order.symbol}`,
        );
        return this.createBotResult(bot, true, 0, 0, startTime);
      }

      // Step 4: Send messages to each user
      let sentCount = 0;
      let failedCount = 0;

      for (const user of filteredUsers) {
        try {
          // Resolve message template for this bot and user's language
          const template = await this.botMessagesRepository.resolveMessage(
            botId,
            eventType,
            user.lang || 'en',
          );

          // Replace placeholders
          const messageText = this.replacePlaceholders(
            template,
            this.createPlaceholders(order),
          );

          // Send via NotificationService with per-bot limiter
          this.notificationService.sendWithBot(
            bot.instance,
            bot.limiter,
            user.telegramId,
            messageText,
            {
              messageType: QueuedMessageType.MARKDOWN,
              priority: MessagePriority.HIGH,
              maxRetries: 3,
            },
          );

          sentCount++;
        } catch (error) {
          failedCount++;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Bot ${botName}: failed to send to user ${user.telegramId}: ${errorMsg}`,
          );
        }
      }

      this.logger.debug(
        `Bot ${botName}: ${sentCount} sent, ${failedCount} failed [${Date.now() - startTime}ms]`,
      );

      return this.createBotResult(bot, true, sentCount, failedCount, startTime);
    } catch (error) {
      // AC-006: Fault isolation - catch error and return failed result
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bot ${botName} delivery failed: ${errorMsg}`);
      return this.createBotResult(bot, false, 0, 0, startTime, errorMsg);
    }
  }

  /**
   * Apply custom filtering based on user's symbol whitelist.
   * Reuses existing filtering logic from WebhookProcessorService.
   *
   * @param users - Users to filter
   * @param symbol - The order symbol to check against
   * @returns Filtered list of users who should receive the signal
   */
  private async applyCustomFiltering(
    users: NotificationUser[],
    symbol: string,
  ): Promise<NotificationUser[]> {
    const filterPromises = users.map(async (user) => {
      const shouldSend = await this.shouldSendSignal(user, symbol);
      return shouldSend ? user : null;
    });

    const results = await Promise.all(filterPromises);
    return results.filter((user): user is NotificationUser => user !== null);
  }

  /**
   * Determine if signal should be sent to user based on custom filtering.
   *
   * @param user - The user to check
   * @param symbol - The order symbol
   * @returns true if signal should be sent, false if filtered out
   *
   * @remarks
   * - Returns true if user has no custom filtering enabled
   * - Returns true if feature settings not found or inactive
   * - Returns true if user's symbol list is empty (send all)
   * - Returns true if symbol is in user's whitelist
   * - Fails open (returns true) on errors
   */
  private async shouldSendSignal(
    user: NotificationUser,
    symbol: string,
  ): Promise<boolean> {
    // No custom filtering flag - send to all
    if (!user.hasCustomFiltering) {
      return true;
    }

    try {
      const userFeature =
        await this.userSubscriptionFeaturesRepository.getUserFeatureSettings(
          user.userId,
          FeatureFlag.CUSTOM_USER_FILTERING,
        );

      // No settings or inactive - send to all
      if (!userFeature || !userFeature.isActive) {
        return true;
      }

      const settings = userFeature.settings as { symbols?: string[] };
      const allowedSymbols = settings.symbols || [];

      // Empty list means send all
      if (allowedSymbols.length === 0) {
        return true;
      }

      return allowedSymbols.includes(symbol);
    } catch {
      // Fail open: send signal on error
      return true;
    }
  }

  /**
   * Create placeholder values from order data.
   *
   * @param order - The order data
   * @returns Record of placeholder key-value pairs
   */
  private createPlaceholders(order: MergedOrder): Record<string, string> {
    return {
      symbol: `**\`${order.symbol}\`**`,
      order_type: `#${order.orderType}`,
      lots: order.lots?.toString() || '0',
      close_price: this.formatDecimal(order.closePrice),
      open_price: this.formatDecimal(order.openPrice),
      profit: this.formatDecimal(order.profit),
      old_take_profit: this.formatDecimal(order.oldTakeProfit),
      old_stop_loss: this.formatDecimal(order.oldStopLoss),
      stop_loss: this.formatDecimal(order.stopLoss),
      take_profit: this.formatDecimal(order.takeProfit),
      ticketId: order.ticketId.toString(),
      sector: order.sector || '',
      account: order.account,
      broker: order.broker,
      created_at: this.formatDateTime(order.createdAt),
      close_time: this.formatDateTime(order.closeTime),
    };
  }

  /**
   * Replace placeholders in message template.
   *
   * @param template - The message template with {placeholder} syntax
   * @param placeholders - The placeholder values
   * @returns Message with all placeholders replaced
   */
  private replacePlaceholders(
    template: string,
    placeholders: Record<string, string>,
  ): string {
    let message = template;
    for (const [key, value] of Object.entries(placeholders)) {
      if (value !== undefined && value !== null) {
        message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }
    // Replace any remaining unmatched placeholders with N/A
    return message.replace(/\{[^}]+\}/g, 'N/A');
  }

  /**
   * Format decimal with up to 3 decimal places, removing trailing zeros.
   *
   * @param input - The numeric value to format
   * @returns Formatted string
   */
  private formatDecimal(input: number | string | null | undefined): string {
    if (input === null || input === undefined) return '0';
    const num = typeof input === 'string' ? Number(input) : input;
    if (Number.isNaN(num)) return '0';
    return num.toFixed(3).replace(/\.?0+$/, '');
  }

  /**
   * Format date/time to YYYY.MM.DD HH:mm format.
   *
   * @param input - The date value to format
   * @returns Formatted date string
   */
  private formatDateTime(
    input: Date | string | number | null | undefined,
  ): string {
    if (!input) return '';
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (v: number) => v.toString().padStart(2, '0');
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /**
   * Create a bot delivery result.
   *
   * @param bot - The bot that was processed
   * @param success - Whether the bot processed successfully
   * @param sentCount - Number of messages sent
   * @param failedCount - Number of messages that failed
   * @param startTime - Processing start time for duration calculation
   * @param error - Optional error message if bot failed
   * @returns BotDeliveryResult
   */
  private createBotResult(
    bot: SignalCapableBot,
    success: boolean,
    sentCount: number,
    failedCount: number,
    startTime: number,
    error?: string,
  ): BotDeliveryResult {
    return {
      botId: bot.botId,
      botName: bot.name,
      success,
      sentCount,
      failedCount,
      error,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Create empty broadcast result.
   *
   * @param startTime - Processing start time for duration calculation
   * @returns Empty BroadcastResult with success=false
   */
  private createEmptyResult(startTime: number): BroadcastResult {
    return {
      success: false,
      totalSent: 0,
      totalFailed: 0,
      botsProcessed: 0,
      botsFailed: 0,
      perBotResults: [],
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Aggregate per-bot results into overall result.
   *
   * @param perBotResults - Array of individual bot results
   * @param startTime - Processing start time for duration calculation
   * @returns Aggregated BroadcastResult
   */
  private aggregateResults(
    perBotResults: BotDeliveryResult[],
    startTime: number,
  ): BroadcastResult {
    let totalSent = 0;
    let totalFailed = 0;
    let botsProcessed = 0;
    let botsFailed = 0;

    for (const result of perBotResults) {
      totalSent += result.sentCount;
      totalFailed += result.failedCount;
      if (result.success) {
        botsProcessed++;
      } else {
        botsFailed++;
      }
    }

    return {
      success: botsProcessed > 0,
      totalSent,
      totalFailed,
      botsProcessed,
      botsFailed,
      perBotResults,
      totalDurationMs: Date.now() - startTime,
    };
  }
}
