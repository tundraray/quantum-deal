import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import Bottleneck from 'bottleneck';
import { Context, Telegraf } from 'telegraf';
import {
  UsersRepository,
  SubscriptionsRepository,
  MessagesRepository,
  users,
} from '@quantumdeal/db';
import { MessageType, MergedOrder } from '@quantumdeal/db/schema';
import {
  NotificationUser,
  PreparedMessage,
  OrderPlaceholders,
  RateLimitConfig,
  NotificationResult,
  NotificationError,
} from '../interfaces/notification.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly rateLimiter: Bottleneck;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly messagesRepository: MessagesRepository,
  ) {
    // Configure rate limiting for Telegram API
    // Telegram allows 30 messages per second to different chats
    const rateLimitConfig: RateLimitConfig = {
      maxConcurrent: 5, // Maximum concurrent requests
      minTime: 100, // Minimum time between requests (10 per second)
      reservoir: 30, // Initial number of tokens
      reservoirRefreshAmount: 30, // Tokens to add per interval
      reservoirRefreshInterval: 1000, // Refresh every second
    };

    this.rateLimiter = new Bottleneck({
      maxConcurrent: rateLimitConfig.maxConcurrent,
      minTime: rateLimitConfig.minTime,
      reservoir: rateLimitConfig.reservoir,
      reservoirRefreshAmount: rateLimitConfig.reservoirRefreshAmount,
      reservoirRefreshInterval: rateLimitConfig.reservoirRefreshInterval,
    });

    // Log rate limiter events
    this.rateLimiter.on('failed', (error: Error, jobInfo) => {
      this.logger.warn(
        `Rate limiter job failed: ${error.message}. Job info: ${JSON.stringify(jobInfo)}`,
      );
    });

    // Retry events are handled automatically by Bottleneck
    // this.rateLimiter.on('retry', (error: Error, jobInfo) => {
    //   this.logger.log(`Retrying notification job: ${JSON.stringify(jobInfo)}`);
    // });
  }

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
   * Main method to send notifications for order events
   */
  async sendOrderNotifications(
    order: MergedOrder,
    eventType: MessageType,
    bot: Telegraf<Context>,
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
          errors: [],
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
          errors: [],
        };
      }

      // Step 3: Send notifications with rate limiting
      const result = await this.sendNotifications(preparedMessages, bot);

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
        errors: [
          {
            telegramId: 0,
            error: `System error: ${err.message}`,
            retry: false,
          },
        ],
      };
    }
  }

  /**
   * Get users eligible for notifications based on order sector
   */
  private async getEligibleUsers(
    order: MergedOrder,
  ): Promise<NotificationUser[]> {
    if (!order.sector) {
      this.logger.debug('Order has no sector, no notifications will be sent');
      return [];
    }

    try {
      // Find subscriptions that match the order's sector
      const matchingSubscriptions =
        await this.subscriptionsRepository.findBySector(order.sector);

      if (matchingSubscriptions.length === 0) {
        return [];
      }

      const subscriptionIds = matchingSubscriptions.map((sub) => sub.id);

      // Find users with active subscriptions
      const eligibleUsers: NotificationUser[] = [];
      const now = new Date();

      for (const subscriptionId of subscriptionIds) {
        const usersWithSubscription = await this.usersRepository.findBy(
          eq(users.subscribeId, subscriptionId),
        );

        for (const user of usersWithSubscription) {
          // Check if subscription is still active
          if (
            user.subscribeExpirationDate &&
            user.subscribeExpirationDate > now
          ) {
            const subscription = matchingSubscriptions.find(
              (sub) => sub.id === subscriptionId,
            );

            if (subscription) {
              eligibleUsers.push({
                telegramId: user.telegramId,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                lang: user.lang || 'en', // Default to English
                subscriptionId: subscription.id,
                subscriptionScope: subscription.scope,
                subscriptionExpirationDate: user.subscribeExpirationDate,
              });
            }
          }
        }
      }

      return eligibleUsers;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error fetching eligible users: ${err.message}`,
        err.stack,
      );
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

    for (const user of users) {
      try {
        // Get a random message template for the user's language
        const messageTemplate = await this.messagesRepository.findByTypeAndLang(
          eventType,
          user.lang || 'en',
        );

        if (!messageTemplate || !messageTemplate.message) {
          this.logger.warn(
            `No message template found for type: ${eventType}, lang: ${user.lang}`,
          );
          continue;
        }

        // Replace placeholders in the message
        const messageText = this.replacePlaceholders(
          messageTemplate.message,
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
      symbol: `#${order.symbol}`,
      order_type: `#${order.orderType}`,
      lots: order.lots?.toString() || '0',
      close_price: order.closePrice?.toString(),
      open_price: order.openPrice?.toString(),
      profit: order.profit?.toString(),
      old_take_profit: order.oldTakeProfit?.toString(),
      old_stop_loss: order.oldStopLoss?.toString(),
      stop_loss: order.stopLoss?.toString() || '0',
      take_profit: order.takeProfit?.toString() || '0',
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
   * Send notifications with rate limiting and retry logic
   */
  private async sendNotifications(
    messages: PreparedMessage[],
    bot: Telegraf<Context>,
  ): Promise<NotificationResult> {
    const errors: NotificationError[] = [];
    let sentCount = 0;
    let failedCount = 0;

    // Process messages with rate limiting
    const sendPromises = messages.map((message) =>
      this.rateLimiter.schedule(
        { id: `notification_${message.telegramId}` },
        () => this.sendSingleNotification(message, bot),
      ),
    );

    const results = await Promise.allSettled(sendPromises);

    // Process results
    results.forEach((result, index) => {
      const message = messages[index];

      if (result.status === 'fulfilled' && result.value.success) {
        sentCount++;
        this.logger.debug(
          `Notification sent successfully to user ${message.telegramId}`,
        );
      } else {
        failedCount++;
        const error =
          result.status === 'rejected'
            ? (result.reason as Error)?.message || 'Unknown error'
            : result.value.error;

        errors.push({
          telegramId: message.telegramId,
          error: error || 'Unknown error',
          retry: this.shouldRetry(error || 'Unknown error'),
        });

        this.logger.warn(
          `Failed to send notification to user ${message.telegramId}: ${error}`,
        );
      }
    });

    return {
      success: errors.length === 0,
      sentCount,
      failedCount,
      errors,
    };
  }

  /**
   * Send a single notification to a user
   */
  private async sendSingleNotification(
    message: PreparedMessage,
    bot: Telegraf<Context>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await bot.telegram.sendMessage(message.telegramId, message.messageText, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });

      return { success: true };
    } catch (error) {
      const err = error as { code?: number; message?: string };

      // Handle specific Telegram API errors
      if (err.code === 403) {
        return {
          success: false,
          error: 'User blocked the bot or deleted their account',
        };
      }

      if (err.code === 400) {
        return {
          success: false,
          error: 'Invalid message or user not found',
        };
      }

      if (err.code === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded, will retry',
        };
      }

      return {
        success: false,
        error: err.message || 'Unknown error',
      };
    }
  }

  /**
   * Determine if a failed notification should be retried
   */
  private shouldRetry(error: string): boolean {
    // Retry on rate limits and temporary network issues
    return (
      error.includes('Rate limit') ||
      error.includes('Network') ||
      error.includes('timeout') ||
      error.includes('ECONNRESET')
    );
  }

  /**
   * Get notification statistics (for monitoring/admin purposes)
   */
  getNotificationStats(): {
    rateLimiterStats: any;
    queuedJobs: number;
  } {
    return {
      rateLimiterStats: {
        running: this.rateLimiter.running(),
        queued: this.rateLimiter.queued(),
        done: this.rateLimiter.done(),
      },
      queuedJobs: this.rateLimiter.queued(),
    };
  }
}
