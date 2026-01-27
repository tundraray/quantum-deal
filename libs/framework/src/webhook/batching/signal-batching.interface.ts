/**
 * Signal Batching Interface Definitions
 *
 * Type contracts for signal batching module per ADR-011.
 * Defines in-memory buffer structures with per-bot independent timers.
 *
 * @module signal-batching.interface
 * @version 1.0.0
 * @see docs/design/signal-batching-design.md v1.4
 * @see docs/adr/ADR-011-signal-batching.md
 */

import type { MergedOrder, MessageType } from '@quantumdeal/db/schema';

/**
 * Configuration for signal batching per bot.
 * Stored in BotSettings.features.batching JSONB field.
 *
 * @property enabled - Whether batching is enabled for this bot. Default: true (opt-out)
 * @property windowMs - Batch window duration in milliseconds. Default: 5000 (5 seconds). Range: 1000-60000
 * @property maxBatchSize - Maximum signals per batch before forced flush. Default: 10. Safety valve per FR-008
 */
export interface BatchingConfig {
  /** Whether batching is enabled for this bot. Default: true (opt-out) */
  enabled: boolean;
  /** Batch window duration in milliseconds. Default: 5000 (5 seconds). Range: 1000-60000 */
  windowMs: number;
  /** Maximum signals per batch before forced flush. Default: 10 */
  maxBatchSize?: number;
}

/**
 * Default batching configuration per Design Doc.
 * Used when bot has no explicit batching config.
 */
export const DEFAULT_BATCHING_CONFIG: BatchingConfig = {
  enabled: true,
  windowMs: 5000,
  maxBatchSize: 10,
};

/**
 * A single signal waiting to be batched.
 * Stores original order data, event type, and timestamp for chronological ordering.
 *
 * @property order - Original MT5 order data
 * @property eventType - Signal event type ('open', 'close_plus', 'close_minus', etc.)
 * @property bufferedAt - Timestamp when signal was buffered (for chronological ordering per FR-004-b)
 */
export interface BufferedSignal {
  /** Original MT5 order data */
  order: MergedOrder;
  /** Signal event type (open, close_plus, close_minus, position_sltp_update, etc.) */
  eventType: MessageType;
  /** Timestamp when signal was buffered (epoch ms for chronological ordering) */
  bufferedAt: number;
}

/**
 * A pending batch for a specific user on a specific bot.
 * Key format: `${botId}:${userId}`
 *
 * @property botId - Bot database ID
 * @property userId - User's Telegram ID
 * @property botUserId - User's bot-specific ID for message delivery
 * @property lang - User's preferred language
 * @property signals - Signals waiting to be delivered (chronologically ordered)
 * @property windowStartTime - Timestamp when first signal was buffered
 */
export interface PendingBatch {
  /** Bot database ID */
  botId: number;
  /** User's Telegram ID */
  userId: number;
  /** User's bot-specific ID for message delivery */
  botUserId: number;
  /** User's preferred language */
  lang: string;
  /** Signals waiting to be delivered (chronologically ordered) */
  signals: BufferedSignal[];
  /** Timestamp when first signal was buffered */
  windowStartTime: number;
}

/**
 * Result of flushing batches for a single bot.
 *
 * @property botId - Bot ID that was flushed
 * @property usersDelivered - Number of users who received batched messages
 * @property signalsDelivered - Total signals delivered across all users
 * @property failures - Number of delivery failures
 * @property durationMs - Processing duration in milliseconds
 */
export interface BatchFlushResult {
  /** Bot ID that was flushed */
  botId: number;
  /** Number of users who received batched messages */
  usersDelivered: number;
  /** Total signals delivered across all users */
  signalsDelivered: number;
  /** Number of delivery failures */
  failures: number;
  /** Processing duration in milliseconds */
  durationMs: number;
}

/**
 * Statistics for monitoring batching behavior.
 * Used for logging, debugging, and health checks.
 *
 * @property pendingSignals - Total signals currently buffered
 * @property pendingBatches - Number of active user batches
 * @property activeTimers - Number of bots with active timers
 * @property totalBatched - Total signals batched since startup
 * @property totalImmediate - Total immediate deliveries (batching disabled)
 * @property avgBatchSize - Average batch size
 */
export interface BatchingStats {
  /** Total signals currently buffered */
  pendingSignals: number;
  /** Number of active user batches */
  pendingBatches: number;
  /** Number of bots with active timers */
  activeTimers: number;
  /** Total signals batched since startup */
  totalBatched: number;
  /** Total immediate deliveries (batching disabled) */
  totalImmediate: number;
  /** Average batch size */
  avgBatchSize: number;
}

/**
 * User info needed for batch delivery.
 * Subset of NotificationUser focused on batching needs.
 * Includes filterSettings from extended findBySectorForBot() query for zero additional DB queries.
 *
 * @property telegramId - User's Telegram ID
 * @property botUserId - User's bot-specific ID
 * @property lang - User's preferred language
 * @property hasCustomFiltering - Whether user has custom filtering enabled
 * @property filterSettings - User's filter settings from user_subscription_features (null if no filtering)
 */
export interface BatchUser {
  /** User's Telegram ID */
  telegramId: number;
  /** User's bot-specific ID */
  botUserId: number;
  /** User's preferred language */
  lang: string;
  /** Whether user has custom filtering enabled */
  hasCustomFiltering: boolean;
  /** User's filter settings from user_subscription_features (null if no filtering) */
  filterSettings: { symbols?: string[] } | null;
}
