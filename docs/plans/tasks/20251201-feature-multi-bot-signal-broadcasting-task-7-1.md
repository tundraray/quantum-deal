# Task: Modify WebhookProcessorService to use MultiBotSignalService

Metadata:
- Phase: 7 (Integration & QA)
- Dependencies: Phase 6 completed
- Provides: Signal routing through MultiBotSignalService
- Size: Small (1 file)
- Verification Level: L1 (E2E tests pass)

## Implementation Content

Modify `WebhookProcessorService.sendOrderNotifications()` to route signal delivery through `MultiBotSignalService.broadcastSignal()`. This replaces the existing single-bot delivery with multi-bot broadcasting while maintaining backward compatibility through result conversion.

**AC Support**:
- All ACs (full integration)

## Target Files

- [x] `libs/bot/src/services/webhook.service.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Read current implementation of `webhook.service.ts`
- [x] Understand existing `sendOrderNotifications()` method
- [x] Note the current return type (`NotificationResult`)

### 2. Green Phase
- [x] Inject `MultiBotSignalService` in constructor
- [x] Modify `sendOrderNotifications()` to call `broadcastSignal()`
- [x] Convert `BroadcastResult` to `NotificationResult` for backward compatibility
- [x] Add logging for multi-bot notification results

### 3. Refactor Phase
- [x] Ensure error handling is comprehensive
- [x] Add meaningful log messages
- [x] Verify existing tests still pass (with mocked MultiBotSignalService)

## Implementation Changes

```typescript
// Add import at top:
import { MultiBotSignalService } from './multi-bot-signal.service';

// Modify constructor to inject MultiBotSignalService:
constructor(
  private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
  private readonly subscriptionsRepository: SubscriptionsRepository,
  private readonly messagesRepository: MessagesRepository,
  private readonly notificationService: NotificationService,
  private readonly userSubscriptionFeaturesRepository: UserSubscriptionFeaturesRepository,
  private readonly multiBotSignalService: MultiBotSignalService, // Add this
) {}

// Replace sendOrderNotifications implementation:
async sendOrderNotifications(
  order: MergedOrder,
  eventType: MessageType,
): Promise<NotificationResult> {
  try {
    this.logger.debug(
      `Processing ${eventType} notification for order ${order.ticketId} (${order.symbol})`,
    );

    // Route through MultiBotSignalService for multi-bot delivery
    const broadcastResult = await this.multiBotSignalService.broadcastSignal(
      order,
      eventType,
    );

    this.logger.log(
      `Multi-bot notification complete: ${broadcastResult.totalSent} sent, ` +
        `${broadcastResult.totalFailed} failed across ${broadcastResult.botsProcessed} bots ` +
        `[${broadcastResult.totalDurationMs}ms]`,
    );

    // Convert BroadcastResult to NotificationResult for backward compatibility
    return {
      success: broadcastResult.success,
      sentCount: broadcastResult.totalSent,
      failedCount: broadcastResult.totalFailed,
      retryCount: 0, // Handled internally by NotificationService
      errors: broadcastResult.perBotResults
        .filter((r) => !r.success && r.error)
        .map((r) => ({
          telegramId: 0, // Bot-level error, not user-level
          error: `Bot ${r.botName}: ${r.error}`,
          retry: false,
        })),
      processedIds: [], // Individual message IDs not exposed at this level
    };
  } catch (error) {
    const err = error as Error;
    this.logger.error(
      `Failed to process order notifications: ${err.message}`,
      err.stack,
    );

    return {
      success: false,
      sentCount: 0,
      failedCount: 1,
      retryCount: 0,
      errors: [
        {
          telegramId: 0,
          error: `System error: ${err.message}`,
          retry: false,
        },
      ],
      processedIds: [],
    };
  }
}
```

## Test Updates

```typescript
// In webhook.service.test.ts

describe('WebhookProcessorService', () => {
  let multiBotSignalService: MockedObject<MultiBotSignalService>;

  beforeEach(() => {
    multiBotSignalService = {
      broadcastSignal: vi.fn(),
      getEligibleBotCount: vi.fn(),
    };
    // Add to module providers
  });

  describe('sendOrderNotifications', () => {
    it('should route through MultiBotSignalService.broadcastSignal', async () => {
      // Arrange
      const order = createMockOrder();
      multiBotSignalService.broadcastSignal.mockResolvedValue({
        success: true,
        totalSent: 10,
        totalFailed: 0,
        botsProcessed: 2,
        botsFailed: 0,
        perBotResults: [],
        totalDurationMs: 100,
      });

      // Act
      await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(multiBotSignalService.broadcastSignal).toHaveBeenCalledWith(
        order,
        'open',
      );
    });

    it('should convert BroadcastResult to NotificationResult', async () => {
      // Arrange
      multiBotSignalService.broadcastSignal.mockResolvedValue({
        success: true,
        totalSent: 10,
        totalFailed: 2,
        botsProcessed: 2,
        botsFailed: 0,
        perBotResults: [],
        totalDurationMs: 100,
      });

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(10);
      expect(result.failedCount).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      multiBotSignalService.broadcastSignal.mockRejectedValue(
        new Error('Test error'),
      );

      // Act
      const result = await service.sendOrderNotifications(order, 'open');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('Test error');
    });
  });
});
```

## Completion Criteria

- [x] MultiBotSignalService injected
- [x] `sendOrderNotifications()` routes through `broadcastSignal()`
- [x] BroadcastResult converted to NotificationResult
- [x] Logging added for multi-bot results
- [x] Error handling comprehensive
- [x] Unit tests pass
- [x] Build succeeds

## Verification Commands

```bash
# Run unit tests
npm run test -- --filter="WebhookProcessorService"

# Build verification
npm run build
```

## Notes

- Impact scope: sendOrderNotifications() implementation only
- Constraints: Must maintain NotificationResult return type for backward compatibility
- The retryCount is always 0 because retries are handled internally by NotificationService
- Bot-level errors use telegramId=0 since they're not user-specific
