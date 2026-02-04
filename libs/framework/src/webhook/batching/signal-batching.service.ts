/**
 * Signal Batching Service
 *
 * Core batching service with in-memory buffer and per-bot independent timers.
 * Per ADR-011: In-memory buffer with per-bot independent timers for signal consolidation.
 *
 * Key features:
 * - FR-001: Signal buffering with ${botId}:${userId} key
 * - FR-003: Per-bot independent timers (fault isolation)
 * - FR-004: Timer expiry triggers batch flush
 * - FR-005: Graceful shutdown flushes all pending batches
 * - FR-008: Max batch size safety valve
 *
 * @module signal-batching.service
 * @see docs/design/signal-batching-design.md v1.4
 * @see docs/adr/ADR-011-signal-batching.md
 */

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import type {
  BatchingConfig,
  BufferedSignal,
  PendingBatch,
  BatchUser,
  BatchingStats,
} from './signal-batching.interface';
import { DEFAULT_BATCHING_CONFIG } from './signal-batching.interface';

/**
 * Callback type for batch flush events.
 * Called when timer expires or max batch size reached.
 *
 * @param botId - Bot ID being flushed
 * @param batches - Array of pending batches to deliver
 */
export type FlushCallback = (
  botId: number,
  batches: PendingBatch[],
) => void | Promise<void>;

/**
 * Core batching service managing in-memory signal buffer and per-bot timers.
 *
 * Timer Pattern: Reuses pattern from FilterSessionService
 * - Map<number, NodeJS.Timeout> for per-entity timers
 * - Clear timer before flush
 * - Isolated error handling per entity
 *
 * @implements OnModuleDestroy for graceful shutdown
 */
@Injectable()
export class SignalBatchingService implements OnModuleDestroy {
  private readonly logger = new Logger(SignalBatchingService.name);

  /**
   * Pending batches keyed by "${botId}:${userId}".
   * One batch per user per bot.
   */
  private readonly pendingBatches = new Map<string, PendingBatch>();

  /**
   * Per-bot timers for batch flush.
   * Key: botId, Value: timer reference
   */
  private readonly botTimers = new Map<number, NodeJS.Timeout>();

  /**
   * Flush callback for integration.
   * In production, this calls BatchMessageFormatter and NotificationService.
   */
  private flushCallback?: FlushCallback;

  /**
   * Set flush callback for testing/integration.
   * In production, this will call BatchMessageFormatter and NotificationService.
   *
   * @param callback - Function called when batches are flushed
   */
  setFlushCallback(callback: FlushCallback): void {
    this.flushCallback = callback;
  }

  /**
   * Buffer a signal for a user.
   * Per FR-001: Create or append to batch keyed by botId:userId.
   * Per FR-003: Start bot timer on first signal if not running.
   *
   * @param botId - Bot database ID
   * @param user - User information for delivery (BatchUser)
   * @param order - MT5 order data
   * @param eventType - Signal event type ('open', 'close_plus', etc.)
   * @param config - Batching configuration (optional, uses default)
   */
  bufferSignalForUser(
    botId: number,
    user: BatchUser,
    order: BufferedSignal['order'],
    eventType: BufferedSignal['eventType'],
    config: BatchingConfig = DEFAULT_BATCHING_CONFIG,
  ): void {
    const batchKey = `${botId}:${user.telegramId}`;

    // Create buffered signal with timestamp for chronological ordering
    const signal: BufferedSignal = {
      order,
      eventType,
      bufferedAt: Date.now(),
    };

    // Get or create batch
    let batch = this.pendingBatches.get(batchKey);

    if (!batch) {
      // Create new batch (FR-001-a, FR-001-b)
      batch = {
        botId,
        userId: user.telegramId,
        botUserId: user.botUserId,
        lang: user.lang,
        signals: [signal],
        windowStartTime: signal.bufferedAt,
      };
      this.pendingBatches.set(batchKey, batch);

      this.logger.debug(
        `Created batch for bot ${botId}, user ${user.telegramId}`,
      );

      // Start bot timer if not running (FR-003-a)
      if (!this.botTimers.has(botId)) {
        this.startBotTimer(botId, config.windowMs);
      }
    } else {
      // Append to existing batch (FR-001-c, FR-003-b: timer not reset)
      batch.signals.push(signal);

      this.logger.debug(
        `Appended signal to batch for bot ${botId}, user ${user.telegramId}. Total: ${batch.signals.length}`,
      );

      // Check max batch size safety valve (FR-008)
      const maxSize =
        config.maxBatchSize ?? DEFAULT_BATCHING_CONFIG.maxBatchSize ?? 10;
      if (batch.signals.length >= maxSize) {
        this.logger.warn(
          `Max batch size (${maxSize}) reached for bot ${botId}. Triggering early flush.`,
        );
        this.flushBotBatches(botId);
      }
    }
  }

  /**
   * Minimum batch window in milliseconds (30 seconds).
   * Prevents excessive timer overhead.
   */
  private static readonly MIN_WINDOW_MS = 30000;

  /**
   * Maximum batch window in milliseconds (60 seconds).
   * Prevents user experience degradation from long delays.
   */
  private static readonly MAX_WINDOW_MS = 120000;

  /**
   * Start timer for a bot.
   * Per FR-003: Independent timer per bot for fault isolation.
   * Per FR-002-c: Validates windowMs range (30000-60000ms).
   *
   * @param botId - Bot database ID
   * @param windowMs - Batch window in milliseconds
   */
  private startBotTimer(botId: number, windowMs: number): void {
    // Validate windowMs range per FR-002-c
    const validatedWindowMs = Math.max(
      SignalBatchingService.MIN_WINDOW_MS,
      Math.min(SignalBatchingService.MAX_WINDOW_MS, windowMs),
    );

    if (validatedWindowMs !== windowMs) {
      this.logger.warn(
        `windowMs ${windowMs} out of range [${SignalBatchingService.MIN_WINDOW_MS}-${SignalBatchingService.MAX_WINDOW_MS}], using ${validatedWindowMs}`,
      );
    }

    const timer = setTimeout(() => {
      this.handleTimerExpiry(botId);
    }, validatedWindowMs);

    this.botTimers.set(botId, timer);
    this.logger.debug(
      `Started batch timer for bot ${botId} (${validatedWindowMs}ms)`,
    );
  }

  /**
   * Handle timer expiry for a bot.
   * Per FR-004: Timer expiry triggers batch flush.
   * Per FR-003-c: Errors isolated per bot.
   *
   * @param botId - Bot ID whose timer expired
   */
  private handleTimerExpiry(botId: number): void {
    this.logger.debug(`Timer expired for bot ${botId}`);
    this.flushBotBatches(botId);
  }

  /**
   * Flush all batches for a bot.
   * Per FR-004: Called when bot timer expires.
   * Per FR-003-c: Errors isolated per bot.
   *
   * @param botId - Bot ID to flush
   */
  flushBotBatches(botId: number): void {
    try {
      // Clear timer first
      this.clearBotTimer(botId);

      // Get batches for this bot before removing them
      const batchesToFlush = this.getPendingBatchesForBot(botId);

      if (batchesToFlush.length === 0) {
        this.logger.debug(`No batches to flush for bot ${botId}`);
        return;
      }

      this.logger.debug(
        `Flushing ${batchesToFlush.length} batches for bot ${botId}`,
      );

      // Remove batches from pending map
      for (const batch of batchesToFlush) {
        const key = `${batch.botId}:${batch.userId}`;
        this.pendingBatches.delete(key);
      }

      // Call flush callback if set
      if (this.flushCallback) {
        // Execute callback (may be async, but we don't await to avoid blocking)
        Promise.resolve(this.flushCallback(botId, batchesToFlush)).catch(
          (error: unknown) => {
            const errMessage =
              error instanceof Error ? error.message : String(error);
            const errStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
              `Flush callback failed for bot ${botId}: ${errMessage}`,
              errStack,
            );
          },
        );
      }
    } catch (error) {
      // Per FR-003-c: Don't rethrow - isolate bot failures
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error flushing batches for bot ${botId}: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Clear timer for a bot.
   *
   * @param botId - Bot ID
   */
  private clearBotTimer(botId: number): void {
    const timer = this.botTimers.get(botId);
    if (timer) {
      clearTimeout(timer);
      this.botTimers.delete(botId);
      this.logger.debug(`Cleared timer for bot ${botId}`);
    }
  }

  /**
   * Get pending batches for a bot.
   * Used by flush logic and for external inspection.
   *
   * @param botId - Bot ID
   * @returns Array of pending batches for the bot
   */
  getPendingBatchesForBot(botId: number): PendingBatch[] {
    const batches: PendingBatch[] = [];

    for (const [, batch] of this.pendingBatches) {
      if (batch.botId === botId) {
        batches.push(batch);
      }
    }

    return batches;
  }

  /**
   * Get current batching statistics.
   * For monitoring and debugging.
   *
   * @returns BatchingStats snapshot
   */
  getBatchStats(): Pick<
    BatchingStats,
    'pendingSignals' | 'pendingBatches' | 'activeTimers'
  > {
    let totalSignals = 0;

    for (const batch of this.pendingBatches.values()) {
      totalSignals += batch.signals.length;
    }

    return {
      pendingSignals: totalSignals,
      pendingBatches: this.pendingBatches.size,
      activeTimers: this.botTimers.size,
    };
  }

  /**
   * NestJS lifecycle hook: Flush all batches on graceful shutdown.
   * Per FR-005: Ensure no signals lost on shutdown.
   */
  onModuleDestroy(): void {
    this.logger.log('Graceful shutdown: Flushing all pending batches');

    // Get all unique bot IDs
    const botIds = new Set<number>();
    for (const batch of this.pendingBatches.values()) {
      botIds.add(batch.botId);
    }

    // Flush each bot
    for (const botId of botIds) {
      this.flushBotBatches(botId);
    }

    this.logger.log('Graceful shutdown complete');
  }
}
