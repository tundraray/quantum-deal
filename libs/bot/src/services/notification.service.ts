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
import {
  QueuedMessage,
  MessageOptions,
  MessagePriority,
  QueuedMessageType,
  QueueMessageStatus,
  QueueStats,
  NotificationResult,
  BatchSendResult,
  BottleneckConfig,
} from '../interfaces/notification.interface';
import type { UserContext } from '../interfaces';

/**
 * Production-ready notification service with queue system and rate limiting
 * Uses Bottleneck for Telegram API rate limiting and in-memory queue for message processing
 */
@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);

  // In-memory message queue (can be replaced with Redis/DB for persistence)
  private messageQueue: Map<string, QueuedMessage> = new Map();

  // Bottleneck instances for different priority levels
  private limiters: Map<MessagePriority, Bottleneck> = new Map();

  // Processing state
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly bottleneckConfig: BottleneckConfig = {
    default: {
      maxConcurrent: 1,
      minTime: 1000, // 1 second between requests
      reservoir: 30, // 30 messages per minute
      reservoirRefreshAmount: 30,
      reservoirRefreshInterval: 60 * 1000, // 1 minute
    },
    high: {
      maxConcurrent: 2,
      minTime: 500, // 500ms between requests for high priority
      reservoir: 50,
      reservoirRefreshAmount: 50,
      reservoirRefreshInterval: 60 * 1000,
    },
    critical: {
      maxConcurrent: 3,
      minTime: 300, // 300ms between requests for critical
      reservoir: 100,
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 60 * 1000,
    },
  };

  constructor(
    @InjectBot('QuantumDealBot')
    private readonly bot: Telegraf<UserContext>,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing NotificationService...');
    this.initializeLimiters();
    this.startQueueProcessor();
    this.logger.log('NotificationService initialized successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down NotificationService...');
    this.stopQueueProcessor();
    await this.closeLimiters();
    this.logger.log('NotificationService shut down successfully');
  }

  /**
   * Add a single message to the queue
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

      this.messageQueue.set(messageId, queuedMessage);

      this.logger.debug(`Message queued: ${messageId} for user ${userId}`);

      // Track queue addition in Sentry
      Sentry.addBreadcrumb({
        message: 'Message added to queue',
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
      this.logger.error('Error adding message to queue', error);
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
   * Process the message queue
   */
  async processQueue(): Promise<NotificationResult> {
    if (this.isProcessing) {
      this.logger.debug('Queue processing already in progress');
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        retryCount: 0,
        errors: [],
        processedIds: [],
      };
    }

    this.isProcessing = true;
    const result: NotificationResult = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      retryCount: 0,
      errors: [],
      processedIds: [],
    };

    try {
      const pendingMessages = this.getPendingMessages();

      // Only log if there are messages to process
      if (pendingMessages.length > 0) {
        this.logger.debug(
          `Processing ${pendingMessages.length} pending messages`,
        );
      }

      for (const message of pendingMessages) {
        try {
          // Check if message is scheduled for later
          if (message.scheduledAt && message.scheduledAt > new Date()) {
            continue;
          }

          // Update status to processing
          message.status = QueueMessageStatus.PROCESSING;
          message.processedAt = new Date();

          // Get appropriate limiter based on priority
          const limiter = this.getLimiterForPriority(message.priority);

          // Send message through bottleneck
          await limiter.schedule(() => this.sendTelegramMessage(message));

          // Mark as sent
          message.status = QueueMessageStatus.SENT;
          result.sentCount++;
          result.processedIds.push(message.id);

          this.logger.debug(`Message sent successfully: ${message.id}`);
        } catch (error) {
          this.handleMessageError(message, error, result);
        }
      }

      // Clean up sent messages
      this.cleanupSentMessages();

      // Only log if there was actual activity
      if (
        result.sentCount > 0 ||
        result.failedCount > 0 ||
        result.retryCount > 0
      ) {
        this.logger.log(
          `Queue processing completed: ${result.sentCount} sent, ${result.failedCount} failed, ${result.retryCount} retries`,
        );
      }
    } catch (error) {
      this.logger.error('Error during queue processing', error);
      Sentry.captureException(error, {
        tags: { service: 'notification', operation: 'processQueue' },
      });
      result.success = false;
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Get queue statistics
   */
  getQueueStatus(): QueueStats {
    const stats: QueueStats = {
      totalMessages: this.messageQueue.size,
      pendingMessages: 0,
      processingMessages: 0,
      sentMessages: 0,
      failedMessages: 0,
      retryMessages: 0,
    };

    for (const message of this.messageQueue.values()) {
      switch (message.status) {
        case QueueMessageStatus.PENDING:
          stats.pendingMessages++;
          break;
        case QueueMessageStatus.PROCESSING:
          stats.processingMessages++;
          break;
        case QueueMessageStatus.SENT:
          stats.sentMessages++;
          break;
        case QueueMessageStatus.FAILED:
          stats.failedMessages++;
          break;
        case QueueMessageStatus.RETRY:
          stats.retryMessages++;
          break;
      }
    }

    return stats;
  }

  /**
   * Clear the entire queue
   */
  clearQueue(): void {
    this.logger.warn('Clearing message queue');
    this.messageQueue.clear();

    Sentry.addBreadcrumb({
      message: 'Message queue cleared',
      level: 'warning',
    });
  }

  /**
   * Remove a specific message from the queue
   */
  removeMessage(messageId: string): boolean {
    const removed = this.messageQueue.delete(messageId);
    if (removed) {
      this.logger.debug(`Message removed from queue: ${messageId}`);
    }
    return removed;
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): QueuedMessage | undefined {
    return this.messageQueue.get(messageId);
  }

  /**
   * Initialize Bottleneck limiters for different priority levels
   */
  private initializeLimiters(): void {
    // Default limiter for normal and low priority
    this.limiters.set(
      MessagePriority.LOW,
      new Bottleneck(this.bottleneckConfig.default),
    );
    this.limiters.set(
      MessagePriority.NORMAL,
      new Bottleneck(this.bottleneckConfig.default),
    );

    // High priority limiter
    this.limiters.set(
      MessagePriority.HIGH,
      new Bottleneck(this.bottleneckConfig.high),
    );

    // Critical priority limiter
    this.limiters.set(
      MessagePriority.CRITICAL,
      new Bottleneck(this.bottleneckConfig.critical),
    );

    // Add error handlers
    for (const [priority, limiter] of this.limiters) {
      limiter.on('error', (error) => {
        this.logger.error(`Bottleneck error for priority ${priority}:`, error);
        Sentry.captureException(error, {
          tags: { service: 'notification', priority: priority.toString() },
        });
      });

      limiter.on('failed', (error: unknown, jobInfo: unknown) => {
        this.logger.warn(`Job failed for priority ${priority}:`, {
          error,
          jobInfo,
        });
      });
    }
  }

  /**
   * Start the automatic queue processor
   */
  private startQueueProcessor(): void {
    // Process queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        this.logger.error('Error in automatic queue processing', error);
      });
    }, 5000);
  }

  /**
   * Stop the automatic queue processor
   */
  private stopQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Close all Bottleneck limiters
   */
  private async closeLimiters(): Promise<void> {
    const closePromises = Array.from(this.limiters.values()).map((limiter) =>
      limiter.stop({ dropWaitingJobs: false }),
    );
    await Promise.all(closePromises);
  }

  /**
   * Get pending messages sorted by priority and creation time
   */
  private getPendingMessages(): QueuedMessage[] {
    return Array.from(this.messageQueue.values())
      .filter(
        (msg) =>
          msg.status === QueueMessageStatus.PENDING ||
          msg.status === QueueMessageStatus.RETRY,
      )
      .sort((a, b) => {
        // Sort by priority first (higher priority first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Then by creation time (older first)
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  /**
   * Get appropriate limiter for message priority
   */
  private getLimiterForPriority(priority: MessagePriority): Bottleneck {
    return (
      this.limiters.get(priority) || this.limiters.get(MessagePriority.NORMAL)!
    );
  }

  /**
   * Send message via Telegram API
   */
  private async sendTelegramMessage(message: QueuedMessage): Promise<void> {
    const parseMode =
      message.messageType === QueuedMessageType.HTML
        ? 'HTML'
        : message.messageType === QueuedMessageType.MARKDOWN
          ? 'MarkdownV2'
          : undefined;

    await this.bot.telegram.sendMessage(message.userId, message.message, {
      parse_mode: parseMode,
    });
  }

  /**
   * Handle message sending errors
   */
  private handleMessageError(
    message: QueuedMessage,
    error: unknown,
    result: NotificationResult,
  ): void {
    this.logger.error(
      `Error sending message ${message.id} to user ${message.userId}:`,
      error,
    );

    // Check if we should retry
    if (message.retryCount < message.maxRetries) {
      message.retryCount++;
      message.status = QueueMessageStatus.RETRY;
      result.retryCount++;

      this.logger.debug(
        `Message ${message.id} scheduled for retry (${message.retryCount}/${message.maxRetries})`,
      );
    } else {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      message.status = QueueMessageStatus.FAILED;
      message.error = errorMessage;
      result.failedCount++;

      result.errors.push({
        telegramId: message.userId,
        error: errorMessage,
        retry: false,
      });
    }

    result.processedIds.push(message.id);

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
  }

  /**
   * Clean up sent messages (remove from queue after successful sending)
   */
  private cleanupSentMessages(): void {
    const sentMessages = Array.from(this.messageQueue.entries()).filter(
      ([, message]) => message.status === QueueMessageStatus.SENT,
    );

    for (const [messageId] of sentMessages) {
      this.messageQueue.delete(messageId);
    }

    if (sentMessages.length > 0) {
      this.logger.debug(`Cleaned up ${sentMessages.length} sent messages`);
    }
  }
}
