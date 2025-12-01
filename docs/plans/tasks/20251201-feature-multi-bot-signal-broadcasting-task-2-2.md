# Task: Initialize Bottleneck in DynamicTelegrafService

Metadata:
- Phase: 2 (DynamicBotInstance Extension)
- Dependencies: Task 2-1
- Provides: Per-bot Bottleneck initialization and cleanup
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)

## Implementation Content

Modify `DynamicTelegrafService` to create a Bottleneck rate limiter for each bot during initialization and clean it up during shutdown. This implements per-bot rate limiting as specified in ADR-007 Decision 1.

**AC Support**:
- AC-005 (per-bot Bottleneck limiter initialization)
- AC-005 (limiter cleanup on bot shutdown)

## Target Files

- [x] `libs/telegraf/src/services/dynamic-telegraf.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts` (update tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Read current implementation of `dynamic-telegraf.service.ts`
- [x] Identify `initializeBot()` method
- [x] Identify `stopBot()` method
- [x] Write/update tests for limiter creation and cleanup

### 2. Green Phase
- [x] Add `Bottleneck` import
- [x] Add `bottleneckConfig` class property
- [x] Create Bottleneck instance in `initializeBot()`
- [x] Setup limiter error handlers
- [x] Add `limiter` to `DynamicBotInstance` creation
- [x] Add `limiter.stop()` call in `stopBot()`

### 3. Refactor Phase
- [x] Ensure error handlers use logger consistently
- [x] Verify all tests pass

## Implementation Changes

```typescript
// Add import at top:
import Bottleneck from 'bottleneck';

// Add class property (around line 56):
private readonly bottleneckConfig = {
  maxConcurrent: 4,
  minTime: 30,
  reservoir: 28,
  reservoirRefreshAmount: 28,
  reservoirRefreshInterval: 1000,
};

// In initializeBot() method, after creating stage (around line 220):
// Create per-bot rate limiter
const limiter = new Bottleneck(this.bottleneckConfig);
limiter.on('error', (error) => {
  this.logger.error(`Bottleneck error for bot "${name}":`, error);
});

// Modify instance creation to include limiter (around line 225):
const instance: DynamicBotInstance = {
  botId: id,
  name,
  bot,
  stage,
  webhookPath,
  settings: settings ?? null,
  username,
  limiter, // Add this line
};

// In stopBot() method, add limiter cleanup (around line 280):
private async stopBot(
  botId: number,
  instance: DynamicBotInstance,
): Promise<void> {
  try {
    // Stop the rate limiter
    await instance.limiter.stop({ dropWaitingJobs: false });
    await instance.bot.telegram.deleteWebhook();
    this.logger.debug(
      `Bot "${instance.name}" stopped (webhook deleted, limiter stopped)`,
    );
  } catch (error) {
    this.logger.error(`Error stopping bot "${instance.name}":`, error);
    throw error;
  }
}
```

## Test Updates

```typescript
// In dynamic-telegraf.service.test.ts

describe('DynamicTelegrafService', () => {
  describe('initializeBot', () => {
    it('should create Bottleneck limiter for each bot', async () => {
      // Arrange
      const botConfig = createMockBotConfig();

      // Act
      await service.initializeBot(botConfig);
      const instance = service.getBotInstance(botConfig.id);

      // Assert
      expect(instance?.limiter).toBeDefined();
      expect(instance?.limiter).toBeInstanceOf(Bottleneck);
    });
  });

  describe('stopBot', () => {
    it('should stop the limiter when bot is stopped', async () => {
      // Arrange
      const botConfig = createMockBotConfig();
      await service.initializeBot(botConfig);
      const instance = service.getBotInstance(botConfig.id);
      const limiterStopSpy = vi.spyOn(instance!.limiter, 'stop');

      // Act
      await service.stopBot(botConfig.id);

      // Assert
      expect(limiterStopSpy).toHaveBeenCalledWith({ dropWaitingJobs: false });
    });
  });
});
```

## Completion Criteria

- [x] Bottleneck import added
- [x] `bottleneckConfig` property added
- [x] Limiter created in `initializeBot()`
- [x] Error handlers set up for limiter
- [x] Limiter added to `DynamicBotInstance`
- [x] Limiter stopped in `stopBot()`
- [x] Unit tests pass
- [x] Build succeeds (`npm run build`)

## Verification Commands

```bash
# Run unit tests
npm run test -- --filter="DynamicTelegrafService"

# Build verification
npm run build
```

## Notes

- Impact scope: DynamicTelegrafService internal changes
- Constraints: Must not break existing bot lifecycle
- The `dropWaitingJobs: false` ensures in-flight messages complete before shutdown
- Rate limit config matches NotificationService (28 msg/sec, reservoir pattern)
