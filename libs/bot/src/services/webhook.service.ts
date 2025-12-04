import { Injectable, Logger } from '@nestjs/common';
import { MessageType, MergedOrder } from '@quantumdeal/db/schema';
import { NotificationResult } from '../interfaces/notification.interface';
import { NotificationService } from './notification.service';
import { MultiBotSignalService } from './multi-bot-signal.service';

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly multiBotSignalService: MultiBotSignalService,
  ) {}

  /**
   * Main method to send notifications for order events.
   * Routes signal delivery through MultiBotSignalService for multi-bot broadcasting.
   *
   * @param order - The order data with all required fields
   * @param eventType - The signal event type (open, close_plus, close_minus, etc.)
   * @returns Notification result with backward-compatible format
   *
   * @remarks
   * This method delegates to MultiBotSignalService.broadcastSignal() which:
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
      const broadcastResult = await this.multiBotSignalService.broadcastSignal(
        order,
        eventType,
      );

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
}
