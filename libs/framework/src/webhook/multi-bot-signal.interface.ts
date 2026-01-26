// libs/bot/src/interfaces/multi-bot-signal.interface.ts

import type { MergedOrder, MessageType } from '@quantumdeal/db/schema';
import { NotificationResult } from '../notifications';

/**
 * Result of a single bot's signal delivery.
 *
 * IMPORTANT: Async Failure Tracking Semantics
 * -------------------------------------------
 * - `sentCount` represents successfully SCHEDULED messages, not delivered ones
 * - Actual delivery failures are handled by Bottleneck's built-in retry mechanism
 * - Telegram API does not provide delivery confirmation (fire-and-forget model)
 * - Per-bot results show "scheduled" count, NOT "delivered" count
 * - Delivery errors are tracked via:
 *   1. Sentry (error monitoring)
 *   2. NotificationService.messageStats (internal counters)
 *   3. Bottleneck 'failed' event handlers
 */
export interface BotDeliveryResult {
  /** Database bot ID (null for static bot) */
  botId: number | null;
  /** Bot name for logging */
  botName: string;
  /** Whether scheduling was successful (true if messages were queued) */
  success: boolean;
  /** Number of messages successfully SCHEDULED with Bottleneck (not delivered) */
  sentCount: number;
  /** Number of messages that failed to schedule (immediate errors only) */
  failedCount: number;
  /** Error message if bot-level failure occurred */
  error?: string;
  /** Processing duration in milliseconds */
  durationMs: number;
}

/**
 * Aggregated result of multi-bot signal broadcast.
 *
 * NOTE: All counts represent SCHEDULED messages, not confirmed deliveries.
 * Telegram does not provide delivery receipts for regular messages.
 */
export interface BroadcastResult {
  /** Overall success (true if at least one bot scheduled messages) */
  success: boolean;
  /** Total messages SCHEDULED across all bots (not confirmed delivered) */
  totalSent: number;
  /** Total scheduling failures across all bots */
  totalFailed: number;
  /** Number of bots that processed signals */
  botsProcessed: number;
  /** Number of bots that failed entirely */
  botsFailed: number;
  /** Per-bot delivery results */
  perBotResults: BotDeliveryResult[];
  /** Total processing duration in milliseconds */
  totalDurationMs: number;
}

/**
 * Interface for the multi-bot signal service.
 *
 * @remarks
 * Per ADR-007 Decision 2: MultiBotSignalService Orchestrator Pattern
 */
export interface MultiBotSignal {
  /**
   * Broadcast a signal to all active bots.
   *
   * @param order - The order data with placeholders
   * @param eventType - The signal event type (open, close_plus, etc.)
   * @returns Aggregated results from all bots
   */
  broadcastSignal(
    order: MergedOrder,
    eventType: MessageType,
  ): Promise<BroadcastResult>;

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

  sendOrderNotifications(
    order: MergedOrder,
    eventType: MessageType,
  ): Promise<NotificationResult>;

  /**
   * Get count of bots currently capable of sending signals.
   *
   * @returns Number of signal-capable bots
   */
  getEligibleBotCount(): number;
}
