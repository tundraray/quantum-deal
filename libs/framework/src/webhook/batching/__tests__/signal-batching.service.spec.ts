/**
 * Unit tests for SignalBatchingService
 *
 * Tests core buffering and timer behavior per Design Doc v1.4:
 * - FR-001: Signal buffering with ${botId}:${userId} key
 * - FR-003: Per-bot independent timers
 * - FR-004: Timer expiry and batch flush
 * - FR-005: Graceful shutdown
 * - FR-008: Max batch size safety valve
 *
 * @see docs/design/signal-batching-design.md v1.4
 * @see docs/adr/ADR-011-signal-batching.md
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SignalBatchingService } from '../signal-batching.service';
import type { BatchUser, PendingBatch } from '../signal-batching.interface';
import type { MergedOrder, MessageType } from '@quantumdeal/db/schema';

/**
 * Creates a mock MergedOrder for testing.
 * Only includes fields required by the service.
 */
function createMockOrder(overrides: Partial<MergedOrder> = {}): MergedOrder {
  return {
    ticketId: 123456,
    symbol: 'EURUSD',
    orderType: 'BUY',
    lots: 0.1,
    openPrice: 1.1234,
    account: 'test-account',
    broker: 'test-broker',
    schemaVersion: '1.0',
    eaVersion: '1.0',
    eventTimestamp: new Date(),
    oldTakeProfit: 0,
    oldStopLoss: 0,
    ...overrides,
  } as MergedOrder;
}

/**
 * Creates a mock BatchUser for testing.
 */
function createMockUser(overrides: Partial<BatchUser> = {}): BatchUser {
  return {
    telegramId: 12345,
    botUserId: 100,
    lang: 'en',
    hasCustomFiltering: false,
    filterSettings: null,
    ...overrides,
  };
}

describe('SignalBatchingService', () => {
  let service: SignalBatchingService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [SignalBatchingService],
    }).compile();

    service = module.get<SignalBatchingService>(SignalBatchingService);

    // Use fake timers for deterministic timer tests
    jest.useFakeTimers();
  });

  afterEach(async () => {
    // Clean up timers and module
    jest.useRealTimers();
    await module.close();
  });

  describe('bufferSignalForUser - FR-001/FR-003', () => {
    it('should create PendingBatch and start timer on first signal for bot', () => {
      const botId = 1;
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });
      const order = createMockOrder({ symbol: 'EURUSD', profit: 100 });
      const eventType: MessageType = 'open';

      // Mock flush callback
      const onFlush = jest.fn();
      service.setFlushCallback(onFlush);

      service.bufferSignalForUser(botId, user, order, eventType);

      // Verify batch created
      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(1);
      expect(stats.pendingSignals).toBe(1);
      expect(stats.activeTimers).toBe(1);

      // Verify timer started (won't flush yet)
      expect(onFlush).not.toHaveBeenCalled();
    });

    it('should append signal to existing batch without resetting timer - FR-001-c/FR-003-b', () => {
      const botId = 1;
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });

      const onFlush = jest.fn();
      service.setFlushCallback(onFlush);

      // First signal
      service.bufferSignalForUser(
        botId,
        user,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );

      const statsAfterFirst = service.getBatchStats();
      expect(statsAfterFirst.pendingSignals).toBe(1);

      // Advance time by 2 seconds (half of 5s window)
      jest.advanceTimersByTime(2000);

      // Second signal
      service.bufferSignalForUser(
        botId,
        user,
        createMockOrder({ symbol: 'GBPUSD' }),
        'close_plus',
      );

      const statsAfterSecond = service.getBatchStats();
      expect(statsAfterSecond.pendingBatches).toBe(1); // Same batch
      expect(statsAfterSecond.pendingSignals).toBe(2); // Both signals
      expect(statsAfterSecond.activeTimers).toBe(1); // Still one timer

      // Flush should not have been called yet
      expect(onFlush).not.toHaveBeenCalled();

      // Advance time by 3 more seconds (total 5s from first signal)
      jest.advanceTimersByTime(3001);

      // Now flush should be called
      expect(onFlush).toHaveBeenCalledTimes(1);
    });

    it('should create separate batches for different users on same bot - FR-001', () => {
      const botId = 1;
      const user1 = createMockUser({
        telegramId: 11111,
        botUserId: 100,
        lang: 'en',
      });
      const user2 = createMockUser({
        telegramId: 22222,
        botUserId: 200,
        lang: 'ru',
      });

      service.bufferSignalForUser(
        botId,
        user1,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );
      service.bufferSignalForUser(
        botId,
        user2,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );

      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(2); // Two user batches
      expect(stats.activeTimers).toBe(1); // One bot timer (shared)
    });

    it('should create separate timers for different bots - FR-003-c', () => {
      const user1 = createMockUser({
        telegramId: 11111,
        botUserId: 100,
      });
      const user2 = createMockUser({
        telegramId: 22222,
        botUserId: 200,
      });

      // Signal to bot 1
      service.bufferSignalForUser(
        1,
        user1,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );

      // Signal to bot 2
      service.bufferSignalForUser(
        2,
        user2,
        createMockOrder({ symbol: 'GBPUSD' }),
        'open',
      );

      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(2); // Two batches
      expect(stats.activeTimers).toBe(2); // Two bot timers
    });
  });

  describe('Timer expiry and flush - FR-004', () => {
    it('should flush bot batches when timer expires', () => {
      const botId = 1;
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });

      const onFlush = jest.fn();
      service.setFlushCallback(onFlush);

      service.bufferSignalForUser(
        botId,
        user,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );

      // Advance time past batch window (5 seconds default)
      jest.advanceTimersByTime(5001);

      // Verify flush was called
      expect(onFlush).toHaveBeenCalledTimes(1);
      expect(onFlush).toHaveBeenCalledWith(botId, expect.any(Array));

      // Verify batches cleared
      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(0);
      expect(stats.activeTimers).toBe(0);
    });

    it('should preserve chronological signal ordering - FR-004-b', () => {
      const botId = 1;
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });

      let flushedBatches: PendingBatch[] = [];
      service.setFlushCallback((_bid, batches) => {
        flushedBatches = batches;
      });

      // Add signals at different times
      service.bufferSignalForUser(
        botId,
        user,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );
      jest.advanceTimersByTime(1000);

      service.bufferSignalForUser(
        botId,
        user,
        createMockOrder({ symbol: 'GBPUSD' }),
        'close_plus',
      );
      jest.advanceTimersByTime(1000);

      service.bufferSignalForUser(
        botId,
        user,
        createMockOrder({ symbol: 'USDJPY' }),
        'position_sltp_update',
      );

      // Flush by timer expiry
      jest.advanceTimersByTime(5000);

      // Verify chronological order preserved
      expect(flushedBatches).toHaveLength(1);
      const signals = flushedBatches[0].signals;
      expect(signals).toHaveLength(3);
      expect(signals[0].order.symbol).toBe('EURUSD');
      expect(signals[1].order.symbol).toBe('GBPUSD');
      expect(signals[2].order.symbol).toBe('USDJPY');

      // Verify timestamps are in order
      expect(signals[0].bufferedAt).toBeLessThan(signals[1].bufferedAt);
      expect(signals[1].bufferedAt).toBeLessThan(signals[2].bufferedAt);
    });

    it('should flush multiple user batches for same bot - FR-004', () => {
      const botId = 1;
      const user1 = createMockUser({
        telegramId: 11111,
        botUserId: 100,
        lang: 'en',
      });
      const user2 = createMockUser({
        telegramId: 22222,
        botUserId: 200,
        lang: 'ru',
      });

      let flushedBatches: PendingBatch[] = [];
      service.setFlushCallback((_bid, batches) => {
        flushedBatches = batches;
      });

      service.bufferSignalForUser(
        botId,
        user1,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );
      service.bufferSignalForUser(
        botId,
        user2,
        createMockOrder({ symbol: 'GBPUSD' }),
        'close_plus',
      );

      // Flush by timer expiry
      jest.advanceTimersByTime(5001);

      // Both user batches should be flushed
      expect(flushedBatches).toHaveLength(2);

      // Verify user data preserved
      const userIds = flushedBatches.map((b) => b.userId);
      expect(userIds).toContain(user1.telegramId);
      expect(userIds).toContain(user2.telegramId);
    });
  });

  describe('Per-bot fault isolation - FR-003-c', () => {
    it('should isolate bot timer failures', () => {
      const onFlush = jest.fn((botId: number) => {
        if (botId === 1) {
          throw new Error('Bot 1 flush failed');
        }
      });
      service.setFlushCallback(onFlush);

      // Buffer signals for two bots
      service.bufferSignalForUser(
        1,
        createMockUser({ telegramId: 11111, botUserId: 100 }),
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );

      service.bufferSignalForUser(
        2,
        createMockUser({ telegramId: 22222, botUserId: 200 }),
        createMockOrder({ symbol: 'GBPUSD' }),
        'open',
      );

      // Advance past window - both bots should attempt flush
      jest.advanceTimersByTime(5001);

      // Both should attempt flush despite bot 1 failure
      expect(onFlush).toHaveBeenCalledWith(1, expect.any(Array));
      expect(onFlush).toHaveBeenCalledWith(2, expect.any(Array));

      // Bot 2's data should still be cleared (successful flush)
      // Bot 1's timer cleared but error logged
      const stats = service.getBatchStats();
      expect(stats.activeTimers).toBe(0);
    });
  });

  describe('Max batch size - FR-008', () => {
    it('should flush batch early when maxBatchSize reached', () => {
      const botId = 1;
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });

      let flushCount = 0;
      let lastFlushedBatches: PendingBatch[] = [];
      service.setFlushCallback((_bid, batches) => {
        flushCount++;
        lastFlushedBatches = batches;
      });

      // Add 10 signals (default maxBatchSize)
      for (let i = 1; i <= 10; i++) {
        service.bufferSignalForUser(
          botId,
          user,
          createMockOrder({ symbol: `SYM${i}` }),
          'open',
        );
      }

      // Should flush immediately on 10th signal
      expect(flushCount).toBe(1);
      expect(lastFlushedBatches).toHaveLength(1);
      expect(lastFlushedBatches[0].signals).toHaveLength(10);
    });

    it('should respect custom maxBatchSize configuration', () => {
      const botId = 1;
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });

      let flushCount = 0;
      service.setFlushCallback(() => {
        flushCount++;
      });

      // Use custom config with smaller batch size
      const customConfig = { enabled: true, windowMs: 5000, maxBatchSize: 5 };

      // Add 5 signals
      for (let i = 1; i <= 5; i++) {
        service.bufferSignalForUser(
          botId,
          user,
          createMockOrder({ symbol: `SYM${i}` }),
          'open',
          customConfig,
        );
      }

      // Should flush on 5th signal with custom config
      expect(flushCount).toBe(1);
    });

    it('should handle multiple max batch size flushes', () => {
      const botId = 1;
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });

      let flushCount = 0;
      service.setFlushCallback(() => {
        flushCount++;
      });

      const customConfig = { enabled: true, windowMs: 5000, maxBatchSize: 3 };

      // Add 7 signals (should trigger 2 flushes: at 3 and 6)
      for (let i = 1; i <= 7; i++) {
        service.bufferSignalForUser(
          botId,
          user,
          createMockOrder({ symbol: `SYM${i}` }),
          'open',
          customConfig,
        );
      }

      // Should have flushed twice (at 3 and 6 signals)
      expect(flushCount).toBe(2);

      // One signal remaining in buffer
      const stats = service.getBatchStats();
      expect(stats.pendingSignals).toBe(1);
    });
  });

  describe('Graceful shutdown - FR-005', () => {
    it('should flush all pending batches on onModuleDestroy', () => {
      const flushCalls: Array<{ botId: number; batches: PendingBatch[] }> = [];
      service.setFlushCallback((botId, batches) => {
        flushCalls.push({ botId, batches });
      });

      // Buffer signals for multiple bots
      service.bufferSignalForUser(
        1,
        createMockUser({ telegramId: 11111, botUserId: 100 }),
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );

      service.bufferSignalForUser(
        2,
        createMockUser({ telegramId: 22222, botUserId: 200 }),
        createMockOrder({ symbol: 'GBPUSD' }),
        'open',
      );

      // Verify batches exist before shutdown
      expect(service.getBatchStats().pendingBatches).toBe(2);

      // Trigger shutdown
      service.onModuleDestroy();

      // Both bots should flush
      const flushedBotIds = flushCalls.map((c) => c.botId).sort();
      expect(flushedBotIds).toEqual([1, 2]);

      // All batches cleared
      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(0);
      expect(stats.activeTimers).toBe(0);
    });

    it('should clear all timers on shutdown', () => {
      // Buffer signals for multiple bots
      service.bufferSignalForUser(
        1,
        createMockUser({ telegramId: 11111, botUserId: 100 }),
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );
      service.bufferSignalForUser(
        2,
        createMockUser({ telegramId: 22222, botUserId: 200 }),
        createMockOrder({ symbol: 'GBPUSD' }),
        'open',
      );

      expect(service.getBatchStats().activeTimers).toBe(2);

      // Trigger shutdown
      service.onModuleDestroy();

      expect(service.getBatchStats().activeTimers).toBe(0);
    });
  });

  describe('getBatchStats', () => {
    it('should return accurate statistics', () => {
      const user1 = createMockUser({
        telegramId: 11111,
        botUserId: 100,
        lang: 'en',
      });
      const user2 = createMockUser({
        telegramId: 22222,
        botUserId: 200,
        lang: 'ru',
      });

      service.bufferSignalForUser(
        1,
        user1,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );
      service.bufferSignalForUser(
        1,
        user1,
        createMockOrder({ symbol: 'GBPUSD' }),
        'close_plus',
      );
      service.bufferSignalForUser(
        2,
        user2,
        createMockOrder({ symbol: 'USDJPY' }),
        'position_sltp_update',
      );

      const stats = service.getBatchStats();

      expect(stats.activeTimers).toBe(2); // Bots 1 and 2
      expect(stats.pendingBatches).toBe(2); // Two user batches
      expect(stats.pendingSignals).toBe(3); // Three signals total
    });

    it('should return zero stats when empty', () => {
      const stats = service.getBatchStats();

      expect(stats.activeTimers).toBe(0);
      expect(stats.pendingBatches).toBe(0);
      expect(stats.pendingSignals).toBe(0);
    });
  });

  describe('getPendingBatchesForBot', () => {
    it('should return all batches for specified bot', () => {
      const user1 = createMockUser({
        telegramId: 11111,
        botUserId: 100,
      });
      const user2 = createMockUser({
        telegramId: 22222,
        botUserId: 200,
      });

      // Add batches to bot 1
      service.bufferSignalForUser(
        1,
        user1,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );
      service.bufferSignalForUser(
        1,
        user2,
        createMockOrder({ symbol: 'GBPUSD' }),
        'open',
      );

      // Add batch to bot 2
      service.bufferSignalForUser(
        2,
        createMockUser({ telegramId: 33333, botUserId: 300 }),
        createMockOrder({ symbol: 'USDJPY' }),
        'open',
      );

      const bot1Batches = service.getPendingBatchesForBot(1);
      const bot2Batches = service.getPendingBatchesForBot(2);

      expect(bot1Batches).toHaveLength(2);
      expect(bot2Batches).toHaveLength(1);
    });

    it('should return empty array for bot with no batches', () => {
      const batches = service.getPendingBatchesForBot(999);
      expect(batches).toEqual([]);
    });
  });

  describe('flushBotBatches (manual flush)', () => {
    it('should clear batches and timer for specified bot', () => {
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });

      service.bufferSignalForUser(
        1,
        user,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );

      expect(service.getBatchStats().pendingBatches).toBe(1);
      expect(service.getBatchStats().activeTimers).toBe(1);

      // Manual flush
      service.flushBotBatches(1);

      expect(service.getBatchStats().pendingBatches).toBe(0);
      expect(service.getBatchStats().activeTimers).toBe(0);
    });

    it('should not affect other bots when flushing specific bot', () => {
      service.bufferSignalForUser(
        1,
        createMockUser({ telegramId: 11111, botUserId: 100 }),
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );
      service.bufferSignalForUser(
        2,
        createMockUser({ telegramId: 22222, botUserId: 200 }),
        createMockOrder({ symbol: 'GBPUSD' }),
        'open',
      );

      // Flush only bot 1
      service.flushBotBatches(1);

      // Bot 2 should still have data
      const stats = service.getBatchStats();
      expect(stats.pendingBatches).toBe(1);
      expect(stats.activeTimers).toBe(1);

      const bot2Batches = service.getPendingBatchesForBot(2);
      expect(bot2Batches).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid successive signals', () => {
      const botId = 1;
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });

      // Add signals in rapid succession (no time advance)
      for (let i = 1; i <= 5; i++) {
        service.bufferSignalForUser(
          botId,
          user,
          createMockOrder({ symbol: `SYM${i}` }),
          'open',
        );
      }

      const stats = service.getBatchStats();
      expect(stats.pendingSignals).toBe(5);
      expect(stats.pendingBatches).toBe(1);
      expect(stats.activeTimers).toBe(1);
    });

    it('should handle signals after flush', () => {
      const botId = 1;
      const user = createMockUser({ telegramId: 12345, botUserId: 100 });

      const onFlush = jest.fn();
      service.setFlushCallback(onFlush);

      // First batch
      service.bufferSignalForUser(
        botId,
        user,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );

      // Flush via timer
      jest.advanceTimersByTime(5001);
      expect(onFlush).toHaveBeenCalledTimes(1);

      // New signal after flush
      service.bufferSignalForUser(
        botId,
        user,
        createMockOrder({ symbol: 'GBPUSD' }),
        'close_plus',
      );

      // Should create new batch and timer
      const stats = service.getBatchStats();
      expect(stats.pendingSignals).toBe(1);
      expect(stats.activeTimers).toBe(1);

      // Flush again
      jest.advanceTimersByTime(5001);
      expect(onFlush).toHaveBeenCalledTimes(2);
    });

    it('should preserve user data in batch', () => {
      const user = createMockUser({
        telegramId: 12345,
        botUserId: 100,
        lang: 'ru',
        hasCustomFiltering: true,
        filterSettings: { symbols: ['EURUSD', 'GBPUSD'] },
      });

      let flushedBatches: PendingBatch[] = [];
      service.setFlushCallback((_bid, batches) => {
        flushedBatches = batches;
      });

      service.bufferSignalForUser(
        1,
        user,
        createMockOrder({ symbol: 'EURUSD' }),
        'open',
      );

      jest.advanceTimersByTime(5001);

      expect(flushedBatches).toHaveLength(1);
      const batch = flushedBatches[0];
      expect(batch.userId).toBe(user.telegramId);
      expect(batch.botUserId).toBe(user.botUserId);
      expect(batch.lang).toBe(user.lang);
    });
  });
});
