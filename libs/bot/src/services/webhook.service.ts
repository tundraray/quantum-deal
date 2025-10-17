import { Injectable, Logger } from '@nestjs/common';
import {
  SubscriptionsRepository,
  MessagesRepository,
  UserSubscriptionsRepository,
  UserSubscriptionFeaturesRepository,
} from '@quantumdeal/db';
import { MessageType, MergedOrder, FeatureFlag } from '@quantumdeal/db/schema';
import {
  NotificationUser,
  PreparedMessage,
  OrderPlaceholders,
  NotificationResult,
  NotificationError,
  MessagePriority,
  QueuedMessageType,
} from '../interfaces/notification.interface';
import { NotificationService } from './notification.service';

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly notificationService: NotificationService,
    private readonly userSubscriptionFeaturesRepository: UserSubscriptionFeaturesRepository,
  ) {}

  /**
   * Format a date/time value to string in format YYYY.MM.DD HH:mm
   */
  private formatDateTime(
    input: Date | string | number | null | undefined,
  ): string {
    if (!input) return '';
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (value: number) => value.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}.${month}.${day} ${hours}:${minutes}`;
  }

  /**
   * Format a numeric value to string with up to 3 decimal places
   */
  private formatDecimal(input: number | string | null | undefined): string {
    if (input === null || input === undefined) return '0';
    const num = typeof input === 'string' ? Number(input) : input;
    if (Number.isNaN(num)) return '0';
    return num.toFixed(3).replace(/\.?0+$/, '');
  }

  /**
   * Main method to send notifications for order events
   */
  async sendOrderNotifications(
    order: MergedOrder,
    eventType: MessageType,
  ): Promise<NotificationResult> {
    try {
      this.logger.debug(
        `Processing ${eventType} notification for order ${order.ticketId} (${order.symbol})`,
      );

      // Step 1: Get eligible users for this order's sector
      const eligibleUsers = await this.getEligibleUsers(order);

      if (eligibleUsers.length === 0) {
        this.logger.debug(
          `No eligible users found for sector: ${order.sector || 'unknown'}`,
        );
        return {
          success: true,
          sentCount: 0,
          failedCount: 0,
          retryCount: 0,
          errors: [],
          processedIds: [],
        };
      }

      this.logger.debug(
        `Found ${eligibleUsers.length} eligible users for notification`,
      );

      // Step 2: Prepare messages for each user
      const preparedMessages = await this.prepareMessages(
        eligibleUsers,
        eventType,
        order,
      );

      if (preparedMessages.length === 0) {
        this.logger.warn(
          `No message templates found for event type: ${eventType}`,
        );
        return {
          success: true,
          sentCount: 0,
          failedCount: 0,
          retryCount: 0,
          errors: [],
          processedIds: [],
        };
      }

      // Step 3: Send notifications with high priority (webhook notifications)
      const result = this.sendNotifications(preparedMessages);

      this.logger.log(
        `Notification batch completed: ${result.sentCount} sent, ${result.failedCount} failed`,
      );

      return result;
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
   * Determines if signal should be sent to user based on custom filtering settings
   */
  private async shouldSendSignal(
    user: NotificationUser,
    symbol: string,
  ): Promise<boolean> {
    // If user doesn't have custom filtering feature, send all tier signals
    if (!user.hasCustomFiltering) {
      this.logger.debug(
        `User ${user.telegramId} - no custom filtering, sending signal`,
        { symbol },
      );
      return true;
    }

    // User has custom filtering - check if they've configured it
    try {
      const userFeature =
        await this.userSubscriptionFeaturesRepository.getUserFeatureSettings(
          user.userId,
          FeatureFlag.CUSTOM_USER_FILTERING,
        );

      // No custom settings configured - send all tier signals (default behavior)
      if (!userFeature || !userFeature.isActive) {
        this.logger.debug(
          `User ${user.telegramId} has custom filtering but not configured, sending signal`,
          { symbol },
        );
        return true;
      }

      // Check symbol whitelist
      const settings = userFeature.settings as { symbols?: string[] };
      const allowedSymbols = settings.symbols || [];

      // Empty whitelist = send all (not configured yet)
      if (allowedSymbols.length === 0) {
        return true;
      }

      // Check if symbol is in user's whitelist
      const isAllowed = allowedSymbols.includes(symbol);

      this.logger.debug(
        `User ${user.telegramId} custom filtering: symbol ${symbol} ${isAllowed ? 'ALLOWED' : 'BLOCKED'}`,
        { allowedSymbols, symbol },
      );

      return isAllowed;
    } catch (error) {
      // On error, fail open (send signal to avoid missing important signals)
      const err = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error checking custom filtering for user ${user.telegramId}, defaulting to SEND`,
        { error: err, symbol },
      );
      return true;
    }
  }

  /**
   * Filters users based on custom symbol filtering settings
   */
  private async applyCustomFiltering(
    users: NotificationUser[],
    symbol: string,
  ): Promise<NotificationUser[]> {
    const startTime = Date.now();

    this.logger.log(
      `Applying custom filtering for ${users.length} users (symbol: ${symbol})`,
    );

    // Filter users in parallel
    const filterPromises = users.map(async (user) => {
      const shouldSend = await this.shouldSendSignal(user, symbol);
      return shouldSend ? user : null;
    });

    const results = await Promise.all(filterPromises);
    const filteredUsers = results.filter(
      (user): user is NotificationUser => user !== null,
    );

    const elapsed = Date.now() - startTime;
    const blocked = users.length - filteredUsers.length;

    this.logger.log(
      `Custom filtering complete: ${filteredUsers.length}/${users.length} users (${blocked} blocked) [${elapsed}ms]`,
      {
        symbol,
        totalUsers: users.length,
        sentTo: filteredUsers.length,
        blocked,
      },
    );

    return filteredUsers;
  }

  /**
   * Get users eligible for notifications based on order sector
   * Now uses feature flags from findBySector() to enable custom filtering
   */
  private async getEligibleUsers(
    order: MergedOrder,
  ): Promise<NotificationUser[]> {
    if (!order.sector) {
      this.logger.debug('Order has no sector, no notifications will be sent');
      return [];
    }

    try {
      // Find users with subscriptions matching the order's sector
      // This now returns SubscriptionWithFeatures[] with hasCustomFiltering flag
      const subscriptionsWithUsers =
        await this.subscriptionsRepository.findBySector(order.sector);

      this.logger.log(
        `Found ${subscriptionsWithUsers.length} users with ${order.sector} access`,
        { sector: order.sector, symbol: order.symbol },
      );

      if (subscriptionsWithUsers.length === 0) {
        return [];
      }

      // Map to NotificationUser format
      const users: NotificationUser[] = subscriptionsWithUsers.map((sub) => ({
        userId: sub.userId,
        telegramId: Number(sub.userTelegramId),
        firstName: sub.userFirstName,
        lastName: sub.userLastName,
        username: sub.userUsername,
        lang: 'en', // TODO: Get from user preferences
        subscriptionId: sub.subscriptionId,
        subscriptionScope: null, // Deprecated, using feature flags now
        subscriptionExpirationDate: sub.userSubscriptionEndDate,
        hasCustomFiltering: sub.hasCustomFiltering,
      }));

      // Apply custom filtering based on symbol
      const filteredUsers = await this.applyCustomFiltering(
        users,
        order.symbol,
      );

      this.logger.log(
        `Signal will be sent to ${filteredUsers.length} users after custom filtering`,
        {
          sector: order.sector,
          symbol: order.symbol,
          totalUsers: users.length,
          filteredUsers: filteredUsers.length,
          blocked: users.length - filteredUsers.length,
        },
      );

      return filteredUsers;
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      this.logger.error('Error finding eligible users', {
        error: err,
        sector: order.sector,
      });
      return [];
    }
  }

  /**
   * Prepare messages for users based on their language preferences
   */
  private async prepareMessages(
    users: NotificationUser[],
    eventType: MessageType,
    order: MergedOrder,
  ): Promise<PreparedMessage[]> {
    const preparedMessages: PreparedMessage[] = [];
    const placeholders = this.createOrderPlaceholders(order);

    this.logger.debug(
      `Preparing messages ${eventType}`,
      JSON.stringify(placeholders),
    );

    for (const user of users) {
      try {
        // Get a random message template for the user's language
        const messageTemplate = await this.messagesRepository.getReportTemplate(
          eventType,
          user.lang || 'en',
        );

        if (!messageTemplate) {
          this.logger.warn(
            `No message template found for type: ${eventType}, lang: ${user.lang}`,
          );
          continue;
        }

        // Replace placeholders in the message
        const messageText = this.replacePlaceholders(
          messageTemplate,
          placeholders,
        );

        preparedMessages.push({
          telegramId: user.telegramId,
          messageText,
          messageType: eventType,
          order,
        });
      } catch (error) {
        const err = error as Error;
        this.logger.warn(
          `Failed to prepare message for user ${user.telegramId}: ${err.message}`,
        );
      }
    }

    return preparedMessages;
  }

  /**
   * Create placeholder values from order data
   */
  private createOrderPlaceholders(order: MergedOrder): OrderPlaceholders {
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
   * Replace placeholders in message template with actual values
   */
  private replacePlaceholders(
    template: string,
    placeholders: OrderPlaceholders,
  ): string {
    let message = template;

    // Replace each placeholder if value exists
    Object.entries(placeholders).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const placeholder = `{${key}}`;
        const valueString = String(value);
        message = message.replace(new RegExp(placeholder, 'g'), valueString);
      }
    });

    // Remove any remaining placeholders that weren't replaced
    message = message.replace(/\{[^}]+\}/g, 'N/A');

    return message;
  }

  /**
   * Send notifications using NotificationService with HIGH priority
   */
  private sendNotifications(messages: PreparedMessage[]): NotificationResult {
    const errors: NotificationError[] = [];
    let sentCount = 0;
    let failedCount = 0;
    const processedIds: string[] = [];

    // Add all messages to the notification queue with HIGH priority
    for (const message of messages) {
      try {
        const messageId = this.notificationService.addMessage(
          message.telegramId,
          message.messageText,
          {
            messageType: QueuedMessageType.MARKDOWN,
            priority: MessagePriority.HIGH,
            maxRetries: 3,
          },
        );

        sentCount++;
        processedIds.push(messageId);
      } catch (error) {
        failedCount++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        errors.push({
          telegramId: message.telegramId,
          error: errorMessage,
          retry: false, // NotificationService handles retries internally
        });

        this.logger.warn(
          `Failed to queue notification for user ${message.telegramId}: ${errorMessage}`,
        );
      }
    }

    return {
      success: errors.length === 0,
      sentCount,
      failedCount,
      retryCount: 0, // NotificationService handles retries internally
      errors,
      processedIds,
    };
  }

  /**
   * Get notification statistics (for monitoring/admin purposes)
   * Delegates to NotificationService for queue statistics
   */
  getNotificationStats() {
    return this.notificationService.getQueueStatus();
  }
}
