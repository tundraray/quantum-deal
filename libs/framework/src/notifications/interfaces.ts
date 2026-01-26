import { MergedOrder, MessageType } from '@quantumdeal/db/schema';

/**
 * User notification data including subscription and language preferences
 */
export interface NotificationUser {
  botUserId: number; // User ID for feature flag queries
  telegramId: number;
  botId: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  lang: string | null;
  subscriptionId: number;
  subscriptionExpirationDate: Date | null;
  hasCustomFiltering: boolean; // Feature flag for custom filtering
}

/**
 * Prepared message for a specific user
 */
export interface PreparedMessage {
  telegramId: number;
  botId: number;
  messageText: string;
  messageType: MessageType;
  order: MergedOrder;
}

/**
 * Notification context containing all relevant order and event data
 */
export interface NotificationContext {
  order: MergedOrder;
  eventType: MessageType;
  placeholders: OrderPlaceholders;
}

/**
 * Order data placeholders for message templates
 */
export interface OrderPlaceholders {
  symbol: string;
  order_type: string;
  lots: string;
  open_price: string;
  close_price?: string;
  stop_loss?: string;
  old_stop_loss?: string;
  take_profit: string;
  old_take_profit?: string;
  profit?: string;
  ticketId: string;
  sector?: string;
  account: string;
  broker: string;
  created_at: string;
  close_time?: string;
}

/**
 * Message priority levels for queue processing
 */
export enum MessagePriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 15,
}

/**
 * Message types for different notification scenarios
 */
export enum QueuedMessageType {
  TEXT = 'text',
  HTML = 'html',
  MARKDOWN = 'markdown',
}

/**
 * Queue message status for tracking
 */
export enum QueueMessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  RETRY = 'retry',
}

/**
 * Queued message interface for the notification system
 */
export interface QueuedMessage {
  id: string;
  telegramId: number;
  botId: number;
  message: string;
  messageType: QueuedMessageType;
  priority: MessagePriority;
  status: QueueMessageStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  scheduledAt?: Date;
  processedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
  buttons?: Array<Array<object>>;
}

/**
 * Message options for sending notifications
 */
export interface MessageOptions {
  messageType?: QueuedMessageType;
  priority?: MessagePriority;
  maxRetries?: number;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
  buttons?: Array<Array<object>>;
}

/**
 * Queue statistics interface
 */
export interface QueueStats {
  totalMessages: number;
  pendingMessages: number;
  processingMessages: number;
  sentMessages: number;
  failedMessages: number;
  retryMessages: number;
}

/**
 * Rate limiting configuration for notifications
 */
export interface RateLimitConfig {
  maxConcurrent: number;
  minTime: number;
  reservoir?: number;
  reservoirRefreshAmount?: number;
  reservoirRefreshInterval?: number;
}

/**
 * Bottleneck configuration for different message types
 */
export interface BottleneckConfig {
  default: RateLimitConfig;
  high?: RateLimitConfig;
  critical?: RateLimitConfig;
}

/**
 * Notification sending result
 */
export interface NotificationResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  retryCount: number;
  errors: NotificationError[];
  processedIds: string[];
}

/**
 * Batch message sending result
 */
export interface BatchSendResult {
  queuedCount: number;
  duplicateCount: number;
  errorCount: number;
  queuedIds: string[];
  errors: string[];
}

/**
 * Individual notification error
 */
export interface NotificationError {
  telegramId: number;
  error: string;
  retry?: boolean;
}
