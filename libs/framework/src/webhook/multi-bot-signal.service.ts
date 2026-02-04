import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  SubscriptionsRepository,
  UserSubscriptionFeaturesRepository,
} from '@quantumdeal/db';
import { LocalizationService } from '../localization';
import type { MergedOrder, MessageType } from '@quantumdeal/db/schema';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { BotRegistryService } from './bot-registry.service';
import { NotificationResult, NotificationService } from '../notifications';
import type {
  BroadcastResult,
  BotDeliveryResult,
  MultiBotSignal,
} from './multi-bot-signal.interface';
import type { SignalCapableBot } from './bot-registry.interface';
import {
  MessagePriority,
  QueuedMessageType,
  NotificationUser,
} from '../notifications';
import type { PartnerSettings } from '@quantumdeal/partner-bot';
import { Markup } from 'telegraf';
import {
  SignalBatchingService,
  BatchMessageFormatter,
  DEFAULT_BATCHING_CONFIG,
  type PendingBatch,
} from './batching';

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
export class SignalService implements MultiBotSignal, OnModuleInit {
  private readonly logger = new Logger(SignalService.name);

  constructor(
    private readonly botRegistryService: BotRegistryService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly localizationService: LocalizationService,
    private readonly notificationService: NotificationService,
    private readonly userSubscriptionFeaturesRepository: UserSubscriptionFeaturesRepository,
    private readonly signalBatchingService: SignalBatchingService,
    private readonly batchMessageFormatter: BatchMessageFormatter,
  ) {}

  /**
   * NestJS lifecycle hook: Set up flush callback for batching service.
   * Per Design Doc: When timer fires, SignalBatchingService calls back to deliver messages.
   */
  onModuleInit(): void {
    this.signalBatchingService.setFlushCallback(
      async (botId: number, batches: PendingBatch[]) => {
        await this.flushBotBatches(botId, batches);
      },
    );
    this.logger.log('SignalService initialized with batching callback');
  }

  /**
   * Main method to send notifications for order events.
   * Routes signal delivery through SignalService for multi-bot broadcasting.
   *
   * @param order - The order data with all required fields
   * @param eventType - The signal event type (open, close_plus, close_minus, etc.)
   * @returns Notification result with backward-compatible format
   *
   * @remarks
   * This method delegates to SignalService.broadcastSignal() which:
   * - Delivers signals to ALL active bots with signalsEnabled=true
   * - Uses per-bot rate limiting (28 msg/sec each)
   * - Applies custom filtering per user
   * - Processes all bots in parallel (AC-002)
   * - Provides fault isolation per bot (AC-006)
   */
  async sendOrderNotifications(
    order: MergedOrder,
    eventType: MessageType,
  ): Promise<NotificationResult> {
    try {
      this.logger.debug(
        `Processing ${eventType} notification for order ${order.ticketId} (${order.symbol})`,
      );

      // Route through MultiBotSignalService for multi-bot delivery
      const broadcastResult = await this.broadcastSignal(order, eventType);

      this.logger.log(
        `Multi-bot notification complete: ${broadcastResult.totalSent} sent, ` +
          `${broadcastResult.totalFailed} failed across ${broadcastResult.botsProcessed} bots ` +
          `[${broadcastResult.totalDurationMs}ms]`,
      );

      // Convert BroadcastResult to NotificationResult for backward compatibility
      return {
        success: broadcastResult.success,
        sentCount: broadcastResult.totalSent,
        failedCount: broadcastResult.totalFailed,
        retryCount: 0, // Handled internally by NotificationService
        errors: broadcastResult.perBotResults
          .filter((r) => !r.success && r.error)
          .map((r) => ({
            telegramId: 0, // Bot-level error, not user-level
            error: `Bot ${r.botName}: ${r.error}`,
            retry: false,
          })),
        processedIds: [], // Individual message IDs not exposed at this level
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to process order notifications: ${err.message}`,
        err.stack,
      );

      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        retryCount: 0,
        errors: [
          {
            telegramId: 0,
            error: `System error: ${err.message}`,
            retry: false,
          },
        ],
        processedIds: [],
      };
    }
  }

  /**
   * Get notification statistics (for monitoring/admin purposes)
   * Delegates to NotificationService for queue statistics
   */
  getNotificationStats() {
    return this.notificationService.getQueueStatus();
  }

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
   * Per Design Doc v1.4: Routes through batching when enabled, immediate delivery when disabled.
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
        await this.subscriptionsRepository.findBySectorForBot(
          sector,
          botId ?? 1,
        );

      if (subscriptions.length === 0) {
        this.logger.debug(
          `Bot ${botName}: no subscribers for sector ${sector}`,
        );
        return this.createBotResult(bot, true, 0, 0, startTime);
      }

      // Step 2: Map to NotificationUser format
      const users: NotificationUser[] = subscriptions.map((sub) => ({
        botUserId: sub.botUserId,
        telegramId: Number(sub.userTelegramId),
        botId: sub.botId ?? 0,
        firstName: sub.userFirstName,
        lastName: sub.userLastName,
        username: sub.userUsername,
        lang: sub.userLang,
        subscriptionId: sub.subscriptionId,
        subscriptionExpirationDate: sub.userSubscriptionEndDate,
        hasCustomFiltering: sub.hasCustomFiltering,
        filterSettings: sub.filterSettings,
      }));

      // Step 3: Check batching configuration (FR-007)
      // Access batching config from bot settings (may not exist yet in settings interface)
      const batchingConfig = (
        bot.settings?.features as
          | { batching?: { enabled?: boolean; windowMs?: number } }
          | undefined
      )?.batching;
      const batchingEnabled = batchingConfig?.enabled ?? true; // Default: enabled (opt-out)

      if (batchingEnabled) {
        // Route through batching layer
        return this.deliverToBotWithBatching(
          bot,
          users,
          order,
          eventType,
          startTime,
          batchingConfig,
        );
      }

      // Step 4: Immediate delivery (batching disabled - FR-007)
      return this.deliverToBotImmediate(
        bot,
        users,
        order,
        eventType,
        startTime,
      );
    } catch (error) {
      // AC-006: Fault isolation - catch error and return failed result
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bot ${botName} delivery failed: ${errorMsg}`);
      return this.createBotResult(bot, false, 0, 0, startTime, errorMsg);
    }
  }

  /**
   * Deliver signal via batching layer.
   * Per Design Doc v1.4: Buffer signals for delivery when timer expires.
   *
   * @param bot - The bot
   * @param users - Subscribed users with filterSettings
   * @param order - Order data
   * @param eventType - Signal event type
   * @param startTime - Processing start time
   * @param batchingConfig - Optional batching config from bot settings
   */
  private deliverToBotWithBatching(
    bot: SignalCapableBot,
    users: NotificationUser[],
    order: MergedOrder,
    eventType: MessageType,
    startTime: number,
    batchingConfig?: { enabled?: boolean; windowMs?: number },
  ): BotDeliveryResult {
    const botName = bot.name;
    const botId = bot.botId ?? 1;
    const symbol = order.symbol;

    // Use in-memory filtering (0 additional DB queries)
    const userFilterMap = this.applyCustomFilteringInMemory(users, [symbol]);

    let bufferedCount = 0;

    for (const [botUserId, filteredSymbols] of userFilterMap) {
      if (filteredSymbols.includes(symbol)) {
        const user = users.find((u) => u.botUserId === botUserId);
        if (user) {
          // Buffer signal for user
          this.signalBatchingService.bufferSignalForUser(
            botId,
            {
              botUserId: user.botUserId,
              telegramId: user.telegramId,
              lang: user.lang ?? 'en',
              hasCustomFiltering: user.hasCustomFiltering,
              filterSettings: user.filterSettings,
            },
            order,
            eventType,
            {
              enabled: true,
              windowMs:
                batchingConfig?.windowMs ?? DEFAULT_BATCHING_CONFIG.windowMs,
              maxBatchSize: DEFAULT_BATCHING_CONFIG.maxBatchSize,
            },
          );
          bufferedCount++;
        }
      }
    }

    this.logger.debug(
      `Bot ${botName}: ${bufferedCount} signals buffered for batching [${Date.now() - startTime}ms]`,
    );

    // Return success - actual delivery happens on timer flush
    return this.createBotResult(bot, true, bufferedCount, 0, startTime);
  }

  /**
   * Deliver signal immediately (batching disabled).
   * Per FR-007: Maintain backward compatibility when batching is opted out.
   *
   * @param bot - The bot
   * @param users - Subscribed users
   * @param order - Order data
   * @param eventType - Signal event type
   * @param startTime - Processing start time
   */
  private async deliverToBotImmediate(
    bot: SignalCapableBot,
    users: NotificationUser[],
    order: MergedOrder,
    eventType: MessageType,
    startTime: number,
  ): Promise<BotDeliveryResult> {
    const botName = bot.name;
    const botId = bot.botId;

    // Apply custom filtering (uses DB queries for backward compatibility)
    const filteredUsers = await this.applyCustomFiltering(users, order.symbol);

    if (filteredUsers.length === 0) {
      this.logger.debug(
        `Bot ${botName}: all users filtered out for symbol ${order.symbol}`,
      );
      return this.createBotResult(bot, true, 0, 0, startTime);
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const user of filteredUsers) {
      const buttons = [] as Array<Array<object>>;
      try {
        // Resolve message template for this bot and user's language
        const template = await this.localizationService
          .forBot(botId)
          .lang(user.lang || 'en')
          .t(eventType);

        // todo: need refactor this
        if (
          bot.settings?.features.partnerFlowEnabled &&
          ['close_plus', 'open'].includes(eventType)
        ) {
          const extendTrialButtonText = await this.localizationService
            .forBot(botId)
            .lang(user.lang ?? 'en')
            .t('button_extend_trial');
          const referralUrl = (bot.settings as PartnerSettings).referralUrl;

          // Create trial status button - url if valid referralUrl, otherwise callback
          const trialStatusButton = referralUrl
            ? Markup.button.url(extendTrialButtonText, referralUrl)
            : Markup.button.callback(
                extendTrialButtonText,
                'partner_extend_trial',
              );
          buttons.push([trialStatusButton]);
        }

        // Replace placeholders
        const messageText = this.replacePlaceholders(
          template,
          this.createPlaceholders(order),
        );

        // Send via NotificationService with per-bot limiter
        this.notificationService.sendWithBot(
          bot.limiter,
          user.telegramId,
          user.botId,
          messageText,
          {
            messageType: QueuedMessageType.MARKDOWN,
            priority: MessagePriority.HIGH,
            maxRetries: 3,
            buttons: buttons,
          },
        );

        sentCount++;
      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Bot ${botName}: failed to send to user ${user.telegramId}: ${errorMsg}`,
        );
      }
    }

    this.logger.debug(
      `Bot ${botName}: ${sentCount} sent, ${failedCount} failed [${Date.now() - startTime}ms]`,
    );

    return this.createBotResult(bot, true, sentCount, failedCount, startTime);
  }

  /**
   * Flush all batches for a bot.
   * Called by SignalBatchingService when timer expires.
   *
   * Per Design Doc v1.4:
   * - Use BatchMessageFormatter.formatForDelivery() for template selection
   * - Send via NotificationService.sendWithBot()
   *
   * @param botId - Bot ID being flushed
   * @param batches - Array of pending batches to deliver
   */
  private async flushBotBatches(
    botId: number,
    batches: PendingBatch[],
  ): Promise<void> {
    const bot = this.botRegistryService.getBot(botId);

    for (const batch of batches) {
      try {
        // Format batch messages using BatchMessageFormatter
        const messages = await this.batchMessageFormatter.formatForDelivery(
          batch.signals,
          batch.lang,
          botId,
        );

        // Send each message (may be split if > 4096 chars)
        for (const message of messages) {
          if (bot) {
            // Use per-bot limiter if bot is available
            this.notificationService.sendWithBot(
              bot.limiter,
              batch.userId,
              botId,
              message,
              {
                messageType: QueuedMessageType.MARKDOWN,
                priority: MessagePriority.HIGH,
                maxRetries: 3,
              },
            );
          } else {
            // Fallback to default notification service if bot not found
            this.notificationService.addMessage(batch.userId, botId, message, {
              messageType: QueuedMessageType.MARKDOWN,
              priority: MessagePriority.HIGH,
              maxRetries: 3,
            });
          }
        }

        this.logger.debug(
          `Flushed batch for bot ${botId}, user ${batch.userId}: ${batch.signals.length} signals, ${messages.length} messages`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to flush batch for bot ${botId}, user ${batch.userId}: ${errorMessage}`,
          errorStack,
        );
        // Continue with next batch - don't let one failure stop others
      }
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
        await this.userSubscriptionFeaturesRepository.getBotUserFeatureSettings(
          user.botUserId,
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
   * Apply custom filtering to users using in-memory approach.
   * NO additional DB queries - all data from findBySectorForBot().
   *
   * Per Design Doc v1.4: Use filterSettings from repository extension.
   *
   * @param users - All subscribers with filterSettings
   * @param symbols - Symbols to filter (array for batching support)
   * @returns Map<botUserId, filteredSymbols[]>
   */
  private applyCustomFilteringInMemory(
    users: NotificationUser[],
    symbols: string[],
  ): Map<number, string[]> {
    const result = new Map<number, string[]>();

    for (const user of users) {
      let userSymbols: string[];

      if (!user.hasCustomFiltering || !user.filterSettings) {
        // No filtering - user gets all symbols
        userSymbols = symbols;
      } else {
        const allowedSymbols = user.filterSettings.symbols || [];
        if (allowedSymbols.length === 0) {
          // Empty list means all symbols
          userSymbols = symbols;
        } else {
          // Filter to only allowed symbols
          userSymbols = symbols.filter((s) => allowedSymbols.includes(s));
        }
      }

      if (userSymbols.length > 0) {
        result.set(user.botUserId, userSymbols);
      }
    }

    return result;
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
