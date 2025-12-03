# Task: Execute E2E Tests

Metadata:
- Phase: 7 (Integration & QA)
- Dependencies: Task 7-1
- Provides: E2E test verification
- Size: Small (test execution)
- Verification Level: L1 (E2E tests pass)

## Implementation Content

Execute the E2E tests to verify the complete signal flow from webhook to Telegram delivery across multiple bots. Create E2E test file if not exists.

**AC Support**:
- AC-001, AC-002, AC-006, AC-010 (E2E verification)

## Target Files

- [ ] `libs/bot/src/services/__tests__/multi-bot-signal.e2e.spec.ts` (create/verify)

## Implementation Steps

### 1. Verify E2E Test File Exists
- [ ] Check if `multi-bot-signal.e2e.spec.ts` exists
- [ ] If not, create with the test cases below

### 2. Execute E2E Tests
- [ ] Run E2E test suite
- [ ] Verify all tests pass

### 3. Verify Performance
- [ ] Check 5-second SLA is met
- [ ] Verify parallel processing efficiency

## E2E Test Cases

```typescript
// libs/bot/src/services/__tests__/multi-bot-signal.e2e.spec.ts

describe('Multi-Bot Signal Broadcasting E2E', () => {
  describe('Full Signal Flow', () => {
    it('should broadcast MT5 signal event to all signal-capable bots', async () => {
      // Arrange - setup test bots and subscriptions
      // Act - trigger webhook with MT5 signal
      // Assert - verify messages sent to all bots' subscribers
    });

    it('should deliver to respective subscribers for each bot', async () => {
      // Arrange - user subscribed to Bot A, different user to Bot B
      // Act - trigger signal
      // Assert - each user receives from their respective bot
    });
  });

  describe('Performance Requirements', () => {
    it('AC-010: should complete within 5-second SLA', async () => {
      // Arrange - setup multiple bots with many subscribers
      const startTime = Date.now();

      // Act
      await webhookProcessorService.sendOrderNotifications(order, 'open');

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('AC-002: should achieve > 80% parallel processing efficiency', async () => {
      // Arrange - setup 3 bots with 100ms simulated delay each
      // Expected sequential: 300ms, Expected parallel: ~100ms

      // Act
      const result = await multiBotSignalService.broadcastSignal(order, 'open');

      // Assert - total time should be close to max single bot time
      // Efficiency = (sequential_time - actual_time) / sequential_time > 80%
    });
  });

  describe('Fault Tolerance', () => {
    it('AC-006: should deliver to healthy bots when one bot fails', async () => {
      // Arrange - setup 3 bots, configure one to fail
      // Act
      const result = await multiBotSignalService.broadcastSignal(order, 'open');

      // Assert
      expect(result.botsProcessed).toBe(2);
      expect(result.botsFailed).toBe(1);
      // Verify healthy bots delivered messages
    });
  });

  describe('Multi-Bot User Scenario', () => {
    it('should send separate messages when user subscribed to multiple bots', async () => {
      // Arrange - same user subscribed to Bot A and Bot B
      // Act
      await multiBotSignalService.broadcastSignal(order, 'open');

      // Assert - user receives 2 messages (one from each bot)
    });
  });
});
```

## Completion Criteria

- [ ] E2E test file exists
- [ ] All E2E tests pass
- [ ] 5-second SLA verified
- [ ] Parallel processing efficiency > 80%
- [ ] Fault isolation verified

## Verification Commands

```bash
# Run E2E tests
npm run test -- --filter="multi-bot-signal.e2e"

# Run with coverage
npm run test:cov -- --filter="multi-bot-signal.e2e"
```

## Notes

- E2E tests may require test database setup
- Bot instances should be mocked at Telegram API level
- Performance tests should use realistic data volumes
- Consider test environment limitations for timing tests
