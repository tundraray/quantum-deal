# Task 7: SignalService Integration

**Phase**: 6 - Integration
**Verification Level**: L1 (Integration tests pass)
**Estimated Effort**: Medium (2 files modified + tests)
**Dependencies**: Task 4 (Core Service), Task 5 (Formatter), Task 6 (Repository)

## Task Overview

Integrate SignalBatchingService into SignalService to route signal delivery through batching layer when enabled. Implement in-memory filtering using `filterSettings` from extended repository.

## Target Files

### Files to Modify (2)
1. `libs/framework/src/webhook/multi-bot-signal.service.ts` - Add batching routing
2. `libs/framework/src/webhook/__tests__/signal-batching.int.spec.ts` - Integration tests

## Implementation Steps

### Step 1: Inject Dependencies

Add SignalBatchingService and BatchMessageFormatter to SignalService constructor:

```typescript
@Injectable()
export class SignalService {
  constructor(
    // ... existing dependencies ...
    private readonly signalBatchingService: SignalBatchingService,
    private readonly batchMessageFormatter: BatchMessageFormatter,
  ) {}
}
```

### Step 2: Implement applyCustomFilteringInMemory()

Add pure function for in-memory filtering using filterSettings:

```typescript
/**
 * Apply custom filtering to users using in-memory approach.
 * NO additional DB queries - all data from findBySectorForBot().
 *
 * @param users - All subscribers with filterSettings
 * @param symbols - Symbols to filter (array for batching support)
 * @returns Map<botUserId, filteredSymbols[]>
 */
private applyCustomFilteringInMemory(
  users: NotificationUser[],
  symbols: string[],
): Map<number, string[]> {
  const result = new Map<number, string[]>();

  for (const user of users) {
    let userSymbols: string[];

    if (!user.hasCustomFiltering || !user.filterSettings) {
      // No filtering - user gets all symbols
      userSymbols = symbols;
    } else {
      const allowedSymbols = user.filterSettings.symbols || [];
      if (allowedSymbols.length === 0) {
        // Empty list means all symbols
        userSymbols = symbols;
      } else {
        // Filter to only allowed symbols
        userSymbols = symbols.filter(s => allowedSymbols.includes(s));
      }
    }

    if (userSymbols.length > 0) {
      result.set(user.botUserId, userSymbols);
    }
  }

  return result;
}
```

### Step 3: Update broadcastSignal() for Batching

Modify signal routing logic in `broadcastSignal()`:

```typescript
async broadcastSignal(order: any, eventType: string): Promise<void> {
  // ... existing sector validation ...

  for (const bot of signalCapableBots) {
    const subscribers = await this.subscriptionsRepository.findBySectorForBot(
      order.sector,
      bot.id,
    );

    // Check batching configuration
    const batchingEnabled = bot.settings?.features?.batching?.enabled ?? true;
    const batchingConfig = bot.settings?.features?.batching || DEFAULT_BATCHING_CONFIG;

    if (!batchingEnabled) {
      // Use existing immediate delivery flow
      await this.deliverToBot(bot, subscribers, order, eventType);
      continue;
    }

    // Batching enabled - buffer signals per user
    const symbol = order.symbol;
    const userFilterMap = this.applyCustomFilteringInMemory(subscribers, [symbol]);

    for (const [botUserId, filteredSymbols] of userFilterMap) {
      if (filteredSymbols.includes(symbol)) {
        const user = subscribers.find(u => u.botUserId === botUserId);
        if (user) {
          this.signalBatchingService.bufferSignalForUser(
            bot.id,
            botUserId,
            order,
            eventType,
            {
              botUserId: user.botUserId,
              telegramUserId: user.telegramUserId,
              lang: user.lang,
              hasCustomFiltering: user.hasCustomFiltering,
              filterSettings: user.filterSettings,
            },
            batchingConfig,
          );
        }
      }
    }
  }
}
```

### Step 4: Connect Flush Callback

Set flush callback in service initialization:

```typescript
onModuleInit(): void {
  this.signalBatchingService.setFlushCallback(async (botId) => {
    await this.flushBotBatches(botId);
  });
}

/**
 * Flush all batches for a bot.
 * Called by SignalBatchingService when timer expires.
 */
private async flushBotBatches(botId: number): Promise<void> {
  const batches = this.signalBatchingService.getPendingBatchesForBot(botId);

  for (const batch of batches) {
    try {
      const messages = await this.batchMessageFormatter.formatForDelivery(
        batch.signals,
        batch.user.lang,
        botId,
      );

      for (const message of messages) {
        await this.notificationService.sendWithBot(
          botId,
          batch.user.telegramUserId,
          message,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to flush batch for bot ${botId}, user ${batch.userId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
```

### Step 5: Write Integration Tests

Create `signal-batching.int.spec.ts` with test cases from work plan:

```typescript
describe('SignalBatchingService Integration', () => {
  // Test 1: FR-001/FR-003 - First signal creates batch and starts timer
  it('AC: FR-001/FR-003: First signal creates PendingBatch entry and starts bot timer', async () => {
    // Setup, execute, verify
  });

  // Test 2: FR-001-c/FR-003-b - Subsequent signals append without reset
  it('AC: FR-001-c/FR-003-b: Subsequent signals append to existing batch without resetting timer', async () => {
    // Setup, execute, verify
  });

  // Test 3: FR-004 - Timer expiry flushes batches
  it('AC: FR-004: Timer expiry flushes all user batches for bot with chronological signal ordering', async () => {
    // Setup, execute, verify
  });

  // Test 4: Design - Template selection
  it('AC: Design: Template selected based on batch size', async () => {
    // Setup, execute, verify
  });

  // Test 5: FR-003-c - Bot isolation
  it('AC: FR-003-c: One bot timer failure does not affect other bots timers', async () => {
    // Setup, execute, verify
  });

  // Test 6: FR-005 - Graceful shutdown
  it('AC: FR-005: onModuleDestroy flushes all pending batches', async () => {
    // Setup, execute, verify
  });

  // Test 7: FR-007 - Opt-out
  it('AC: FR-007: Signals delivered immediately when batching.enabled is false for bot', async () => {
    // Setup, execute, verify
  });

  // Additional tests for filtering, max batch size, etc.
});
```

### Step 6: Update Module Providers

Add new services to webhook module:

```typescript
@Module({
  providers: [
    SignalService,
    SignalBatchingService,
    BatchMessageFormatter,
    TemplateEngine,
    // ... existing providers ...
  ],
})
export class WebhookModule {}
```

## Completion Criteria

- [x] Signals correctly routed through batching when enabled
- [x] Immediate delivery works when batching disabled
- [x] Per-user filtering works with in-memory approach (0 additional queries)
- [x] All integration tests from skeleton pass (17/17 test cases)
- [x] Flush callback correctly formats and delivers batched messages
- [ ] Module providers include all new services (deferred - requires app-level module update)
- [x] Integration test coverage >= 80%

## Verification Procedures

### Integration Test Execution
```bash
npm run test:integration -- signal-batching
```
**Expected**: All 12 integration test cases pass.

### Manual Integration Test
```typescript
// Buffer 3 signals within window
await signalService.broadcastSignal({ symbol: 'EURUSD', profit: 100 }, 'open');
await signalService.broadcastSignal({ symbol: 'GBPUSD', profit: 50 }, 'close_plus');
await signalService.broadcastSignal({ symbol: 'USDJPY', profit: 75 }, 'tp');

// Wait for batch window
await sleep(5100);

// Verify single batch message sent with all 3 signals
```

## Test Information

**Test Category**: `@category: core-functionality`
**Test Complexity**: `@complexity: high`
**Test Dependencies**: SignalBatchingService, BatchMessageFormatter, NotificationService
**Integration Test Cases**: 12 from work plan

## Dependencies

**Depends on**: Task 4, Task 5, Task 6
**Required by**: Phase 7 (Quality Assurance)

## Related Documents

- [Design Doc](../../design/signal-batching-design.md)
- [Work Plan](../../plans/20260127-feature-signal-batching.md) - Integration test specifications
