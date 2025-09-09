import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
    private readonly usersRepository: UsersRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly notificationService: NotificationService,
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

        this.logger.debug(
          `Notification queued successfully for user ${message.telegramId} with messageId ${messageId}`,
        );
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
