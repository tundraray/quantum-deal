# Task: Extend sendBroadcast with Filter Parameters

Metadata:
- Dependencies:
  - Task 001 -> Deliverable: `findExpired` method in UserSubscriptionsRepository
  - Task 002 -> Deliverable: Extended `countSubscribers` method
- Provides: Extended `sendBroadcast` method in BroadcastService
- Size: Small (1-2 files)
- Phase: 2 - Service Layer
- Verification Level: L2 (Test Operation)
- Acceptance Criteria: AC1, AC2, AC3

## Implementation Content

Extend the `sendBroadcast` method in `BroadcastService` to accept optional filter parameters. When filters are applied, the method should query the appropriate subscriber set (active or expired) and optionally filter by bot ID. The method must maintain backward compatibility.

## Target Files

- [x] `libs/masterbot/src/services/broadcast.service.ts` (implementation)
- [x] `libs/masterbot/src/services/__tests__/broadcast.service.spec.ts` (unit tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review dependency deliverables:
  - Task 001: `findExpired` method
  - Task 002: Extended `countSubscribers` method
- [x] Write 2 failing unit tests:
  1. `sendBroadcast` with filter parameters respects filter selection (AC1, AC2)
  2. `sendBroadcast` without filters works identically to existing implementation (AC5)
- [x] Run tests and confirm they fail

### 2. Green Phase

- [x] Extend `sendBroadcast` method signature:
  ```typescript
  async sendBroadcast(
    subscriptionId: number,
    message: string,
    entities: MessageEntity[] | undefined,
    managerId: number,
    filterStatus?: 'active' | 'expired',
    filterBotId?: number | null,
  ): Promise<BroadcastResultDto>
  ```
- [x] Add conditional logic to query appropriate subscribers:
  - Default or `filterStatus = 'active'`: Use existing subscriber query
  - `filterStatus = 'expired'`: Use `findExpired` with filters
- [x] Add logging: `Broadcast filter: status=${filterStatus || 'active'}, botId=${filterBotId || 'all'}`
- [x] Ensure message delivery logic remains unchanged
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase

- [x] Extract subscriber query logic if beneficial
- [x] Ensure consistent error handling
- [x] Confirm added tests still pass

## Interface Definition

```typescript
/**
 * Send broadcast with optional filters
 *
 * @param subscriptionId - The subscription ID
 * @param message - The message content
 * @param entities - Message entities for formatting
 * @param managerId - Manager's Telegram ID
 * @param filterStatus - 'active' | 'expired' (default: 'active')
 * @param filterBotId - Optional bot ID filter (null = all bots)
 * @returns Broadcast result with delivery statistics
 */
async sendBroadcast(
  subscriptionId: number,
  message: string,
  entities: MessageEntity[] | undefined,
  managerId: number,
  filterStatus?: 'active' | 'expired',
  filterBotId?: number | null,
): Promise<BroadcastResultDto>
```

## Completion Criteria

- [x] Both added unit tests pass
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`)
- [x] Backward compatibility verified
- [x] Works with extended `countSubscribers` (consistent filtering)
- [x] Logging added for filter parameters

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/services/__tests__/broadcast.service.spec.ts
```

## Notes

- **Impact scope**: Handler layer will pass filter parameters from session state
- **Constraints**: Message delivery mechanism must not be modified
- **Integration**: Recipient list must match what `countSubscribers` returns with same filters
- **Logging**: Add structured log for filter parameters to aid debugging

## Test Specification

```typescript
describe('sendBroadcast', () => {
  describe('with filters (AC1, AC2, AC3)', () => {
    it('should query expired subscribers when filterStatus is expired', async () => {
      // Arrange: Mock repository, create test data
      // Act: Call sendBroadcast with filterStatus='expired'
      // Assert: findExpired was called, correct recipients received message
    });

    it('should filter by botId when specified', async () => {
      // Arrange: Create subscriptions across multiple bots
      // Act: Call sendBroadcast with filterBotId
      // Assert: Only specified bot's subscribers received message
    });
  });

  describe('backward compatibility', () => {
    it('should work identically to existing implementation without filters', async () => {
      // Arrange: Use same setup as existing tests
      // Act: Call sendBroadcast without filter parameters
      // Assert: Same behavior as before extension
    });
  });
});
```
