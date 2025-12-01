# Task: Create MultiBotSignalService

Metadata:
- Phase: 6 (MultiBotSignalService)
- Dependencies: Phase 3, Phase 4, Phase 5 completed
- Provides: `libs/bot/src/services/multi-bot-signal.service.ts`
- Size: Medium (1 new file)
- Verification Level: L2 (Unit tests pass) -> L1 (Integration tests)

## Implementation Content

Create the `MultiBotSignalService` that orchestrates signal distribution across all active bots. This service implements parallel delivery with fault isolation as specified in ADR-007 Decision 2.

**AC Support**:
- AC-001 (broadcast to all signal-capable bots)
- AC-002 (parallel processing via Promise.all)
- AC-006 (fault isolation between bots)
- AC-007 (per-bot delivery stats in BroadcastResult)

## Target Files

- [x] `libs/bot/src/services/multi-bot-signal.service.ts` (new file)
- [x] `libs/bot/src/services/__tests__/multi-bot-signal.service.spec.ts` (new file)
- [ ] `libs/bot/src/services/__tests__/multi-bot-signal.int.spec.ts` (integration tests - existing file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Create test file with failing tests
- [x] Define test cases for all public methods
- [x] Focus on observable behavior

### 2. Green Phase
- [x] Create service with all dependencies injected
- [x] Implement `broadcastSignal()` orchestration method
- [x] Implement `getEligibleBotCount()` method
- [x] Implement `deliverToBot()` private method
- [x] Implement `applyCustomFiltering()` for symbol filtering
- [x] Implement `shouldSendSignal()` based on user features
- [x] Implement placeholder helpers
- [x] Implement result aggregation

### 3. Refactor Phase
- [x] Add comprehensive JSDoc documentation
- [x] Ensure logging is consistent
- [x] Verify all tests pass

## Implementation Code

See Design Doc `docs/design/multi-bot-signal-broadcasting-design.md` section "4. libs/bot/src/services/multi-bot-signal.service.ts" for complete implementation.

Key structure:
```typescript
@Injectable()
export class MultiBotSignalService implements MultiBotSignal {
  constructor(
    private readonly botRegistryService: BotRegistryService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly botMessagesRepository: BotMessagesRepository,
    private readonly notificationService: NotificationService,
    private readonly userSubscriptionFeaturesRepository: UserSubscriptionFeaturesRepository,
  ) {}

  async broadcastSignal(
    order: MergedOrder,
    eventType: MessageType,
  ): Promise<BroadcastResult> {
    // 1. Get signal-capable bots
    // 2. Process all bots in parallel (Promise.all)
    // 3. Aggregate results
    // 4. Return BroadcastResult
  }

  async getEligibleBotCount(): Promise<number> { /* ... */ }

  private async deliverToBot(/* ... */): Promise<BotDeliveryResult> {
    // Isolated error handling per bot
  }

  private async applyCustomFiltering(/* ... */): Promise<NotificationUser[]> { /* ... */ }
  private async shouldSendSignal(/* ... */): Promise<boolean> { /* ... */ }
  private createPlaceholders(/* ... */): Record<string, string> { /* ... */ }
  private replacePlaceholders(/* ... */): string { /* ... */ }
  private formatDecimal(/* ... */): string { /* ... */ }
  private formatDateTime(/* ... */): string { /* ... */ }
  private createBotResult(/* ... */): BotDeliveryResult { /* ... */ }
  private createEmptyResult(/* ... */): BroadcastResult { /* ... */ }
  private aggregateResults(/* ... */): BroadcastResult { /* ... */ }
}
```

## Test Cases

```typescript
describe('MultiBotSignalService', () => {
  describe('broadcastSignal', () => {
    it('AC-001: should deliver signal to ALL bots with signalsEnabled=true', async () => {
      // Arrange - setup 3 bots
      // Act
      const result = await service.broadcastSignal(order, 'open');
      // Assert - all 3 bots processed
      expect(result.botsProcessed).toBe(3);
    });

    it('AC-002: should process all bots in parallel via Promise.all', async () => {
      // Arrange - setup bots with delayed responses
      const startTime = Date.now();
      // Act
      await service.broadcastSignal(order, 'open');
      const duration = Date.now() - startTime;
      // Assert - total time ~ max single bot time (parallel)
      expect(duration).toBeLessThan(maxSingleBotTime * 1.5);
    });

    it('AC-006: should continue to other bots when one bot fails', async () => {
      // Arrange - setup 3 bots, 1 fails
      // Act
      const result = await service.broadcastSignal(order, 'open');
      // Assert - 2 bots succeeded, 1 failed
      expect(result.botsProcessed).toBe(2);
      expect(result.botsFailed).toBe(1);
    });

    it('AC-007: should return BroadcastResult with perBotResults', async () => {
      // Arrange
      // Act
      const result = await service.broadcastSignal(order, 'open');
      // Assert
      expect(result.perBotResults).toHaveLength(3);
      expect(result.perBotResults[0]).toMatchObject({
        botId: expect.any(Number),
        botName: expect.any(String),
        success: expect.any(Boolean),
        sentCount: expect.any(Number),
        failedCount: expect.any(Number),
        durationMs: expect.any(Number),
      });
    });

    it('AC-001: should return empty BroadcastResult when no signal-capable bots', async () => {
      // Arrange - no bots registered
      // Act
      const result = await service.broadcastSignal(order, 'open');
      // Assert
      expect(result.success).toBe(false);
      expect(result.botsProcessed).toBe(0);
    });

    it('AC-001: should return empty result when order has no sector', async () => {
      // Arrange
      const orderWithoutSector = { ...order, sector: null };
      // Act
      const result = await service.broadcastSignal(orderWithoutSector, 'open');
      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('getEligibleBotCount', () => {
    it('should return count of signal-capable bots', async () => {
      // Arrange - 3 bots registered
      // Act
      const count = await service.getEligibleBotCount();
      // Assert
      expect(count).toBe(3);
    });
  });
});
```

## Completion Criteria

- [x] Service created with all methods implemented
- [x] Parallel processing via Promise.all
- [x] Fault isolation (try-catch per bot)
- [x] Per-bot stats in BroadcastResult
- [x] Custom filtering applied
- [x] Unit tests pass (17/17 tests passing)
- [ ] Integration tests pass (deferred - existing integration test file)
- [x] Build succeeds

## Verification Commands

```bash
# Run unit tests
npm run test -- --filter="MultiBotSignalService"

# Run integration tests
npm run test -- --filter="multi-bot-signal.int"

# Build verification
npm run build
```

## Notes

- Impact scope: New service file
- Constraints: Must implement `MultiBotSignal` interface exactly
- The placeholder and filtering logic is duplicated from WebhookProcessorService intentionally for service isolation
- Timing measurement useful for AC-002 verification
