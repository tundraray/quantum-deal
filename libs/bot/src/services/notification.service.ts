import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import Bottleneck from 'bottleneck';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/nestjs';
import telegramifyMarkdown from 'telegramify-markdown';
import {
  QueuedMessage,
  MessageOptions,
  MessagePriority,
  QueuedMessageType,
  QueueMessageStatus,
  QueueStats,
  BatchSendResult,
} from '../interfaces/notification.interface';
import type { UserContext } from '../interfaces';

/**
 * Production-ready notification service with rate limiting
 * Uses Bottleneck for both Telegram API rate limiting and message queuing with priority support
 */
@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);

  // Single Bottleneck instance with priority support for direct message queuing
  private limiter: Bottleneck;

  // Message tracking for statistics (minimal overhead)
  private messageStats = {
    totalScheduled: 0,
    successCount: 0,
    failureCount: 0,
    retryCount: 0,
  };

  // Configuration for single Bottleneck with priority
  private readonly bottleneckConfig = {
    maxConcurrent: 1, // Process one message at a time
    minTime: 1000, // 1 second between messages (Telegram limit)
    reservoir: 30, // 30 messages per minute
    reservoirRefreshAmount: 30,
    reservoirRefreshInterval: 60 * 1000, // 1 minute
    strategy: Bottleneck.strategy.LEAK, // Use priority strategy
  };

  constructor(
    @InjectBot('QuantumDealBot')
    private readonly bot: Telegraf<UserContext>,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing NotificationService...');
    this.initializeLimiter();
    this.logger.log('NotificationService initialized successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down NotificationService...');
    await this.closeLimiter();
    this.logger.log('NotificationService shut down successfully');
  }

  /**
   * Schedule a single message directly with Bottleneck
   */
  addMessage(
    userId: number,
    message: string,
    options: MessageOptions = {},
  ): string {
    try {
      const messageId = uuidv4();
      const queuedMessage: QueuedMessage = {
        id: messageId,
        userId,
        message,
        messageType: options.messageType ?? QueuedMessageType.TEXT,
        priority: options.priority ?? MessagePriority.NORMAL,
        status: QueueMessageStatus.PENDING,
        retryCount: 0,
        maxRetries: options.maxRetries ?? 3,
        createdAt: new Date(),
        scheduledAt: options.scheduledAt,
        metadata: options.metadata,
      };

      // Schedule message directly with Bottleneck (non-blocking)
      try {
        this.scheduleMessage(queuedMessage);
      } catch (error) {
        this.logger.error(
          `Failed to initiate scheduling for message ${messageId}:`,
          error,
        );
      }
      this.messageStats.totalScheduled++;

      this.logger.debug(`Message scheduled: ${messageId} for user ${userId}`);

      // Track message scheduling in Sentry
      Sentry.addBreadcrumb({
        message: 'Message scheduled with Bottleneck',
        data: {
          messageId,
          userId,
          priority: queuedMessage.priority,
          messageType: queuedMessage.messageType,
        },
        level: 'info',
      });

      return messageId;
    } catch (error) {
      this.logger.error('Error scheduling message', error);
      Sentry.captureException(error, {
        tags: { userId, service: 'notification' },
      });
      throw error;
    }
  }

  /**
   * Add multiple messages to the queue
   */
  addMessages(
    messages: Array<{
      userId: number;
      message: string;
      options?: MessageOptions;
    }>,
  ): BatchSendResult {
    const result: BatchSendResult = {
      queuedCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      queuedIds: [],
      errors: [],
    };

    for (const msg of messages) {
      try {
        const messageId = this.addMessage(msg.userId, msg.message, msg.options);
        result.queuedCount++;
        result.queuedIds.push(messageId);
      } catch (error) {
        result.errorCount++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`User ${msg.userId}: ${errorMessage}`);
      }
    }

    this.logger.log(
      `Batch queued: ${result.queuedCount} messages, ${result.errorCount} errors`,
    );
    return result;
  }

  /**
   * Schedule a message with Bottleneck with retry logic
   */
  private scheduleMessage(message: QueuedMessage): void {
    // Check if message is scheduled for later
    const delay = message.scheduledAt
      ? Math.max(0, message.scheduledAt.getTime() - Date.now())
      : 0;

    if (delay > 0) {
      // Handle scheduled messages with setTimeout
      setTimeout(() => {
        this.scheduleMessage({ ...message, scheduledAt: undefined });
      }, delay);
      return;
    }

    // Convert our priority enum to Bottleneck priority (higher is better)
    const bottleneckPriority = this.convertToBotleneckPriority(
      message.priority,
    );

    // Schedule with Bottleneck immediately
    this.limiter
      .schedule({ priority: bottleneckPriority }, () =>
        this.processMessageWithRetry(message),
      )
      .catch((error) => {
        this.logger.error(`Failed to schedule message ${message.id}:`, error);
        this.messageStats.failureCount++;
        Sentry.captureException(error, {
          tags: {
            service: 'notification',
            messageId: message.id,
            userId: message.userId.toString(),
          },
        });
      });
  }

  /**
   * Process a message with built-in retry logic
   */
  private async processMessageWithRetry(message: QueuedMessage): Promise<void> {
    try {
      message.status = QueueMessageStatus.PROCESSING;
      message.processedAt = new Date();

      await this.sendTelegramMessage(message);

      // Success
      message.status = QueueMessageStatus.SENT;
      this.messageStats.successCount++;
      this.logger.debug(`Message sent successfully: ${message.id}`);
    } catch (error) {
      this.logger.error(
        `Error sending message ${message.id} to user ${message.userId}:`,
        error,
      );

      // Check if this is a permanent error that shouldn't be retried
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const isPermanentError = this.isPermanentError(errorMessage);

      // Check if we should retry (skip retry for permanent errors)
      if (!isPermanentError && message.retryCount < message.maxRetries) {
        message.retryCount++;
        message.status = QueueMessageStatus.RETRY;
        this.messageStats.retryCount++;

        this.logger.debug(
          `Message ${message.id} scheduled for retry (${message.retryCount}/${message.maxRetries})`,
        );

        // Schedule retry with exponential backoff
        const retryDelay = Math.min(
          1000 * Math.pow(2, message.retryCount - 1),
          30000,
        );
        setTimeout(() => {
          this.scheduleMessage(message);
        }, retryDelay);
      } else {
        // Max retries reached or permanent error
        message.status = QueueMessageStatus.FAILED;
        message.error = errorMessage;
        this.messageStats.failureCount++;

        if (isPermanentError) {
          this.logger.warn(
            `Message ${message.id} failed with permanent error (no retry): ${errorMessage}`,
          );
        } else {
          this.logger.error(
            `Message ${message.id} failed after ${message.maxRetries} retries: ${errorMessage}`,
          );
        }
      }

      // Report to Sentry
      Sentry.captureException(error, {
        tags: {
          service: 'notification',
          userId: message.userId.toString(),
          messageId: message.id,
        },
        extra: {
          retryCount: message.retryCount,
          maxRetries: message.maxRetries,
          priority: message.priority,
        },
      });

      // Re-throw if no more retries
      if (message.retryCount >= message.maxRetries) {
        throw error;
      }
    }
  }

  /**
   * Get queue statistics from Bottleneck and internal counters
   */
  getQueueStatus(): QueueStats {
    const counts = this.limiter.counts();

    return {
      totalMessages: this.messageStats.totalScheduled,
      pendingMessages: counts.QUEUED || 0,
      processingMessages: counts.RUNNING || 0,
      sentMessages: this.messageStats.successCount,
      failedMessages: this.messageStats.failureCount,
      retryMessages: this.messageStats.retryCount,
    };
  }

  /**
   * Clear the Bottleneck queue and reset statistics
   */
  async clearQueue(): Promise<void> {
    this.logger.warn('Clearing Bottleneck queue and resetting statistics');

    // Stop all jobs and clear the queue
    await this.limiter.stop({ dropWaitingJobs: true });

    // Reset statistics
    this.messageStats = {
      totalScheduled: 0,
      successCount: 0,
      failureCount: 0,
      retryCount: 0,
    };

    // Reinitialize the limiter
    this.initializeLimiter();

    Sentry.addBreadcrumb({
      message: 'Bottleneck queue cleared and statistics reset',
      level: 'warning',
    });
  }

  /**
   * Initialize single Bottleneck limiter with priority support
   */
  private initializeLimiter(): void {
    this.limiter = new Bottleneck(this.bottleneckConfig);

    // Add error handlers
    this.limiter.on('error', (error) => {
      this.logger.error('Bottleneck error:', error);
      Sentry.captureException(error, {
        tags: { service: 'notification' },
      });
    });

    this.limiter.on(
      'failed',
      (error: unknown, jobInfo: Record<string, unknown>) => {
        this.logger.warn('Job failed:', {
          error,
          jobInfo,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          priority: (jobInfo as any)?.options?.priority,
        });
        // Note: Failure tracking is handled in processMessageWithRetry
      },
    );

    // Log when queue is depleted
    this.limiter.on('depleted', () => {
      this.logger.debug('Bottleneck queue depleted');
    });

    // Log when hitting rate limits
    this.limiter.on('dropped', (dropped) => {
      this.logger.warn('Message dropped due to overflow:', dropped);
    });
  }

  /**
   * Close Bottleneck limiter
   */
  private async closeLimiter(): Promise<void> {
    if (this.limiter) {
      await this.limiter.stop({ dropWaitingJobs: false });
    }
  }

  /**
   * Convert our MessagePriority enum to Bottleneck priority
   * Higher values get processed first in Bottleneck
   */
  private convertToBotleneckPriority(priority: MessagePriority): number {
    switch (priority) {
      case MessagePriority.CRITICAL:
        return 5; // Highest priority
      case MessagePriority.HIGH:
        return 3;
      case MessagePriority.NORMAL:
        return 1;
      case MessagePriority.LOW:
        return 0; // Lowest priority
      default:
        return 1;
    }
  }

  /**
   * Check if an error is permanent and shouldn't be retried
   */
  private isPermanentError(errorMessage: string): boolean {
    const permanentErrors = [
      'chat not found',
      'bot was blocked by the user',
      'user is deactivated',
      'bot was kicked from the group chat',
      'bot was kicked from the supergroup chat',
      'chat was deleted',
      'group chat was upgraded to a supergroup',
      'bot is not a member of the supergroup chat',
      'bot is not a member of the channel chat',
      'user not found',
      'invalid user_id specified',
      "forbidden: bot can't send messages to the user",
      'forbidden: bot was blocked by the user',
    ];

    const lowerErrorMessage = errorMessage.toLowerCase();
    return permanentErrors.some((permanentError) =>
      lowerErrorMessage.includes(permanentError),
    );
  }

  /**
   * Send message via Telegram API
   */
  private async sendTelegramMessage(message: QueuedMessage): Promise<void> {
    let messageText = message.message;
    let parseMode: 'HTML' | 'MarkdownV2' | undefined;

    if (message.messageType === QueuedMessageType.HTML) {
      parseMode = 'HTML';
    } else if (message.messageType === QueuedMessageType.MARKDOWN) {
      parseMode = 'MarkdownV2';
      // Use telegramify-markdown to properly escape text for Telegram
      // This library handles all edge cases including hashtags, mentions, etc.
      messageText = telegramifyMarkdown(messageText, 'escape');
    }

    await this.bot.telegram.sendMessage(message.userId, messageText, {
      parse_mode: parseMode,
    });
  }
}
