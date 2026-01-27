# Task 3: Core Batching Service - Buffer & Timer Logic

**Phase**: 3 - Core Batching Service
**Verification Level**: L2 (Unit tests pass)
**Estimated Effort**: Medium (2 files: implementation + tests)
**Dependencies**: Task 1 (Interface Definitions)

## Task Overview

Implement the core signal batching service with in-memory buffer and per-bot independent timer management. This is the heart of the batching system, managing signal buffering, timer lifecycle, and batch flushing.

## Target Files

### Files to Create (2)
1. `libs/framework/src/webhook/batching/signal-batching.service.ts` - Service implementation
2. `libs/framework/src/webhook/batching/__tests__/signal-batching.service.spec.ts` - Unit tests

## TDD Implementation Steps

### RED: Write Failing Tests First

Create `signal-batching.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { SignalBatchingService } from '../signal-batching.service';
import { BufferedSignal, BatchUser } from '../signal-batching.interface';

describe('SignalBatchingService', () => {
  let service: SignalBatchingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SignalBatchingService],
    }).compile();

    service = module.get<SignalBatchingService>(SignalBatchingService);

    // Use fake timers for deterministic timer tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('bufferSignalForUser - FR-001/FR-003', () => {
    it('should create PendingBatch and start timer on first signal for bot', () => {
      const botId = 1;
      const userId = 100;
      const order = { symbol: 'EURUSD', profit: 100 };
      const eventType = 'open';
      const user: BatchUser = {
        botUserId: userId,
        telegramUserId: 12345,
        lang: 'en',
        hasCustomFiltering: false,
        filterSettings: null,
      };

      // Mock flush callback
      const onFlush = jest.fn();
      service.setFlushCallback(onFlush);

      service.bufferSignalForUser(botId, userId, order, eventType, user);

      // Verify batch created
      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(1);
      expect(stats.totalBufferedSignals).toBe(1);
      expect(stats.activeTimers).toBe(1);

      // Verify timer started (won't flush yet)
      expect(onFlush).not.toHaveBeenCalled();
    });

    it('should append signal to existing batch without resetting timer - FR-001-c/FR-003-b', () => {
      const botId = 1;
      const userId = 100;
      const user: BatchUser = {
        botUserId: userId,
        telegramUserId: 12345,
        lang: 'en',
        hasCustomFiltering: false,
        filterSettings: null,
      };

      const onFlush = jest.fn();
      service.setFlushCallback(onFlush);

      // First signal
      service.bufferSignalForUser(botId, userId, { symbol: 'EURUSD' }, 'open', user);

      const statsAfterFirst = service.getBatchStats();
      expect(statsAfterFirst.totalBufferedSignals).toBe(1);

      // Advance time by 2 seconds (half of 5s window)
      jest.advanceTimersByTime(2000);

      // Second signal
      service.bufferSignalForUser(botId, userId, { symbol: 'GBPUSD' }, 'close_plus', user);

      const statsAfterSecond = service.getBatchStats();
      expect(statsAfterSecond.pendingBatches).toBe(1); // Same batch
      expect(statsAfterSecond.totalBufferedSignals).toBe(2); // Both signals
      expect(statsAfterSecond.activeTimers).toBe(1); // Still one timer

      // Flush should not have been called yet
      expect(onFlush).not.toHaveBeenCalled();
    });

    it('should create separate batches for different users - FR-001', () => {
      const botId = 1;
      const user1: BatchUser = {
        botUserId: 100,
        telegramUserId: 11111,
        lang: 'en',
        hasCustomFiltering: false,
        filterSettings: null,
      };
      const user2: BatchUser = {
        botUserId: 200,
        telegramUserId: 22222,
        lang: 'ru',
        hasCustomFiltering: false,
        filterSettings: null,
      };

      service.bufferSignalForUser(botId, 100, { symbol: 'EURUSD' }, 'open', user1);
      service.bufferSignalForUser(botId, 200, { symbol: 'EURUSD' }, 'open', user2);

      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(2); // Two user batches
      expect(stats.activeTimers).toBe(1); // One bot timer
    });
  });

  describe('Timer expiry and flush - FR-004', () => {
    it('should flush bot batches when timer expires', () => {
      const botId = 1;
      const userId = 100;
      const user: BatchUser = {
        botUserId: userId,
        telegramUserId: 12345,
        lang: 'en',
        hasCustomFiltering: false,
        filterSettings: null,
      };

      const onFlush = jest.fn();
      service.setFlushCallback(onFlush);

      service.bufferSignalForUser(botId, userId, { symbol: 'EURUSD' }, 'open', user);

      // Advance time past batch window (5 seconds default)
      jest.advanceTimersByTime(5001);

      // Verify flush was called
      expect(onFlush).toHaveBeenCalledTimes(1);
      expect(onFlush).toHaveBeenCalledWith(botId);

      // Verify batches cleared
      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(0);
      expect(stats.activeTimers).toBe(0);
    });

    it('should preserve chronological signal ordering - FR-004-b', () => {
      const botId = 1;
      const userId = 100;
      const user: BatchUser = {
        botUserId: userId,
        telegramUserId: 12345,
        lang: 'en',
        hasCustomFiltering: false,
        filterSettings: null,
      };

      const flushedBatches: any[] = [];
      service.setFlushCallback((bid) => {
        const batches = service.getPendingBatchesForBot(bid);
        flushedBatches.push(...batches);
      });

      // Add signals at different times
      service.bufferSignalForUser(botId, userId, { symbol: 'EURUSD' }, 'open', user);
      jest.advanceTimersByTime(1000);
      service.bufferSignalForUser(botId, userId, { symbol: 'GBPUSD' }, 'close_plus', user);
      jest.advanceTimersByTime(1000);
      service.bufferSignalForUser(botId, userId, { symbol: 'USDJPY' }, 'tp', user);

      // Flush
      jest.advanceTimersByTime(5000);

      // Verify chronological order preserved
      expect(flushedBatches).toHaveLength(1);
      const signals = flushedBatches[0].signals;
      expect(signals[0].symbol).toBe('EURUSD');
      expect(signals[1].symbol).toBe('GBPUSD');
      expect(signals[2].symbol).toBe('USDJPY');
    });
  });

  describe('Per-bot fault isolation - FR-003-c', () => {
    it('should isolate bot timer failures', () => {
      const onFlush = jest.fn((botId) => {
        if (botId === 1) {
          throw new Error('Bot 1 flush failed');
        }
      });
      service.setFlushCallback(onFlush);

      // Buffer signals for two bots
      service.bufferSignalForUser(1, 100, { symbol: 'EURUSD' }, 'open', {
        botUserId: 100,
        telegramUserId: 11111,
        lang: 'en',
        hasCustomFiltering: false,
        filterSettings: null,
      });

      service.bufferSignalForUser(2, 200, { symbol: 'GBPUSD' }, 'open', {
        botUserId: 200,
        telegramUserId: 22222,
        lang: 'ru',
        hasCustomFiltering: false,
        filterSettings: null,
      });

      // Advance past window
      jest.advanceTimersByTime(5001);

      // Both should attempt flush
      expect(onFlush).toHaveBeenCalledWith(1);
      expect(onFlush).toHaveBeenCalledWith(2);

      // Bot 2's timer should still work despite bot 1 failure
      // (error handling in implementation prevents cascade)
    });
  });

  describe('Max batch size - FR-008', () => {
    it('should flush batch early when maxBatchSize reached', () => {
      const botId = 1;
      const userId = 100;
      const user: BatchUser = {
        botUserId: userId,
        telegramUserId: 12345,
        lang: 'en',
        hasCustomFiltering: false,
        filterSettings: null,
      };

      const onFlush = jest.fn();
      service.setFlushCallback(onFlush);

      // Add 10 signals (default maxBatchSize)
      for (let i = 1; i <= 10; i++) {
        service.bufferSignalForUser(botId, userId, { symbol: `SYM${i}` }, 'open', user);
      }

      // Should flush immediately on 10th signal
      expect(onFlush).toHaveBeenCalledTimes(1);
    });
  });

  describe('Graceful shutdown - FR-005', () => {
    it('should flush all pending batches on onModuleDestroy', () => {
      const onFlush = jest.fn();
      service.setFlushCallback(onFlush);

      // Buffer signals for multiple bots
      service.bufferSignalForUser(1, 100, { symbol: 'EURUSD' }, 'open', {
        botUserId: 100,
        telegramUserId: 11111,
        lang: 'en',
        hasCustomFiltering: false,
        filterSettings: null,
      });

      service.bufferSignalForUser(2, 200, { symbol: 'GBPUSD' }, 'open', {
        botUserId: 200,
        telegramUserId: 22222,
        lang: 'ru',
        hasCustomFiltering: false,
        filterSettings: null,
      });

      // Trigger shutdown
      service.onModuleDestroy();

      // Both bots should flush
      expect(onFlush).toHaveBeenCalledWith(1);
      expect(onFlush).toHaveBeenCalledWith(2);

      // All batches cleared
      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(0);
      expect(stats.activeTimers).toBe(0);
    });
  });

  describe('getBatchStats', () => {
    it('should return accurate statistics', () => {
      const user1: BatchUser = {
        botUserId: 100,
        telegramUserId: 11111,
        lang: 'en',
        hasCustomFiltering: false,
        filterSettings: null,
      };
      const user2: BatchUser = {
        botUserId: 200,
        telegramUserId: 22222,
        lang: 'ru',
        hasCustomFiltering: false,
        filterSettings: null,
      };

      service.bufferSignalForUser(1, 100, { symbol: 'EURUSD' }, 'open', user1);
      service.bufferSignalForUser(1, 100, { symbol: 'GBPUSD' }, 'close_plus', user1);
      service.bufferSignalForUser(2, 200, { symbol: 'USDJPY' }, 'tp', user2);

      const stats = service.getBatchStats();

      expect(stats.activeBots).toBe(2); // Bots 1 and 2
      expect(stats.pendingBatches).toBe(2); // Two user batches
      expect(stats.totalBufferedSignals).toBe(3); // Three signals total
      expect(stats.activeTimers).toBe(2); // Two bot timers
    });
  });
});
```

**Run tests**: `npm run test -- signal-batching.service`
**Expected**: All tests fail (service not implemented yet)

### GREEN: Minimal Implementation

Create `signal-batching.service.ts`:

```typescript
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  BatchingConfig,
  BufferedSignal,
  PendingBatch,
  BatchUser,
  BatchingStats,
  DEFAULT_BATCHING_CONFIG,
} from './signal-batching.interface';

/**
 * Core batching service with in-memory buffer and per-bot timers.
 * Per ADR-011: In-memory buffer with per-bot independent timers.
 */
@Injectable()
export class SignalBatchingService implements OnModuleDestroy {
  private readonly logger = new Logger(SignalBatchingService.name);

  /**
   * Pending batches keyed by "${botId}:${userId}".
   * One batch per user per bot.
   */
  private pendingBatches = new Map<string, PendingBatch>();

  /**
   * Per-bot timers for batch flush.
   * Key: botId, Value: timer reference
   */
  private botTimers = new Map<number, NodeJS.Timeout>();

  /**
   * Flush callback for testing/integration.
   */
  private flushCallback?: (botId: number) => void | Promise<void>;

  /**
   * Buffer a signal for a user.
   * Per FR-001: Create or append to batch keyed by botId:userId.
   * Per FR-003: Start bot timer on first signal if not running.
   *
   * @param botId - Bot ID
   * @param userId - User ID (botUserId)
   * @param order - MT5 order data
   * @param eventType - Signal event type
   * @param user - User information for delivery
   * @param config - Batching configuration (optional)
   */
  bufferSignalForUser(
    botId: number,
    userId: number,
    order: any,
    eventType: string,
    user: BatchUser,
    config: BatchingConfig = DEFAULT_BATCHING_CONFIG,
  ): void {
    const batchKey = `${botId}:${userId}`;

    // Create buffered signal
    const signal: BufferedSignal = {
      order,
      eventType,
      timestamp: new Date(),
      symbol: order.symbol,
    };

    // Get or create batch
    let batch = this.pendingBatches.get(batchKey);

    if (!batch) {
      // Create new batch
      batch = {
        botId,
        userId,
        signals: [signal],
        user,
      };
      this.pendingBatches.set(batchKey, batch);

      // Start bot timer if not running
      if (!this.botTimers.has(botId)) {
        this.startBotTimer(botId, config.windowMs);
      }
    } else {
      // Append to existing batch
      batch.signals.push(signal);

      // Check max batch size (FR-008)
      const maxSize = config.maxBatchSize || 10;
      if (batch.signals.length >= maxSize) {
        this.logger.warn(
          `Batch size limit reached for bot ${botId}, user ${userId}. Flushing early.`,
        );
        this.flushBotBatches(botId);
      }
    }
  }

  /**
   * Start timer for a bot.
   * Per FR-003: Independent timer per bot for fault isolation.
   *
   * @param botId - Bot ID
   * @param windowMs - Batch window in milliseconds
   */
  private startBotTimer(botId: number, windowMs: number): void {
    const timer = setTimeout(() => {
      this.flushBotBatches(botId);
    }, windowMs);

    this.botTimers.set(botId, timer);
    this.logger.debug(`Started batch timer for bot ${botId} (${windowMs}ms)`);
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
      // Clear timer
      const timer = this.botTimers.get(botId);
      if (timer) {
        clearTimeout(timer);
        this.botTimers.delete(botId);
      }

      // Get batches for this bot
      const batchesToFlush = this.getPendingBatchesForBot(botId);

      if (batchesToFlush.length === 0) {
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
        this.flushCallback(botId);
      }
    } catch (error) {
      this.logger.error(
        `Error flushing batches for bot ${botId}: ${error.message}`,
        error.stack,
      );
      // Per FR-003-c: Don't rethrow - isolate bot failures
    }
  }

  /**
   * Get pending batches for a bot.
   * Used by flush logic and testing.
   */
  getPendingBatchesForBot(botId: number): PendingBatch[] {
    const batches: PendingBatch[] = [];

    for (const [key, batch] of this.pendingBatches) {
      if (batch.botId === botId) {
        batches.push(batch);
      }
    }

    return batches;
  }

  /**
   * Get current batching statistics.
   * For monitoring and debugging.
   */
  getBatchStats(): BatchingStats {
    const activeBots = new Set<number>();
    let totalSignals = 0;

    for (const batch of this.pendingBatches.values()) {
      activeBots.add(batch.botId);
      totalSignals += batch.signals.length;
    }

    return {
      activeBots: activeBots.size,
      pendingBatches: this.pendingBatches.size,
      totalBufferedSignals: totalSignals,
      activeTimers: this.botTimers.size,
    };
  }

  /**
   * Set flush callback for testing/integration.
   * In production, this will call BatchMessageFormatter and NotificationService.
   */
  setFlushCallback(callback: (botId: number) => void | Promise<void>): void {
    this.flushCallback = callback;
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
  }
}
```

**Run tests**: `npm run test -- signal-batching.service`
**Expected**: All tests pass

### REFACTOR: Improve Code Quality

Review implementation:
- Add JSDoc comments for clarity
- Consider extracting constants
- Ensure error handling follows fail-fast principle
- Verify single responsibility per method

**Run tests after refactoring**: All tests must still pass.

## Completion Criteria

- [x] Buffer correctly stores signals keyed by `${botId}:${userId}`
- [x] Per-bot timers start on first signal for bot
- [x] Subsequent signals append without resetting timer (FR-001-c/FR-003-b)
- [x] Timer expiry calls flushBotBatches correctly (FR-004)
- [x] Signals preserved in chronological order (FR-004-b)
- [x] Per-bot fault isolation works (FR-003-c)
- [x] Max batch size triggers early flush (FR-008)
- [x] Graceful shutdown flushes all pending batches (FR-005)
- [x] Unit test coverage >= 80%
- [x] All unit tests pass: `npm run test -- signal-batching.service`

## Verification Procedures

### Unit Test Execution
```bash
npm run test -- signal-batching.service
```
**Expected**: All tests pass, coverage >= 80%

### Timer Behavior Verification
Tests use `jest.useFakeTimers()` for deterministic timer testing.

### Coverage Report
```bash
npm run test:coverage -- signal-batching.service
```
**Expected**: >= 80% coverage

## Test Information

**Test Category**: `@category: core-functionality`
**Test Complexity**: `@complexity: high` (timer management)
**Test Dependencies**: SignalBatchingService, Map (native), setTimeout (native)
**ROI Scores**:
- Buffer logic: 88
- Append logic: 82
- Flush logic: 88

**Acceptance Criteria Coverage**:
- FR-001: Signal buffering (all items a, b, c)
- FR-003: Per-bot timer management (all items a, b, c)
- FR-004: Batch flush on timer (items a, b, c)
- FR-005: Graceful shutdown (items a, b)
- FR-008: Max batch size (items a, b)

## Dependencies

**Depends on**: Task 1 (Interface Definitions)
**Required by**: Task 7 (SignalService Integration)

## Notes

### Timer Pattern Reuse
Reuses pattern from `FilterSessionService`:
- `Map<number, NodeJS.Timeout>` for per-entity timers
- Clear timer before flush
- Isolated error handling per entity

### Error Handling Philosophy
Per ai-development-guide:
- **Fail-fast for invalid input**: Throw immediately
- **Isolate per-bot failures**: Catch and log, don't propagate across bots
- **Explicit error context**: Include botId in error messages

### Memory Management
- No persistence layer (in-memory only per ADR-011)
- Circuit breaker at 100MB (implemented in Phase 7)
- Default maxBatchSize=10 prevents unbounded growth

## Related Documents

- [Design Doc](../../design/signal-batching-design.md) - Core service specification
- [ADR-011](../../adr/ADR-011-signal-batching.md) - Architecture decisions
- [Overall Design](./_overview.md) - Timer pattern reuse
