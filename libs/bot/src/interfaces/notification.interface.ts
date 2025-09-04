import { MergedOrder, MessageType } from '@quantumdeal/db/schema';

/**
 * User notification data including subscription and language preferences
 */
export interface NotificationUser {
  telegramId: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  lang: string | null;
  subscriptionId: number;
  subscriptionScope: any; // JSON scope data
  subscriptionExpirationDate: Date | null;
}

/**
 * Prepared message for a specific user
 */
export interface PreparedMessage {
  telegramId: number;
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
 * Notification sending result
 */
export interface NotificationResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: NotificationError[];
}

/**
 * Individual notification error
 */
export interface NotificationError {
  telegramId: number;
  error: string;
  retry?: boolean;
}
