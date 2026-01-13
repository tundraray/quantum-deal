# Task: Extend countSubscribers with Filter Parameters

Metadata:
- Dependencies: Task 001 -> Deliverable: `findExpired` method in UserSubscriptionsRepository
- Provides: Extended `countSubscribers` method in BroadcastService
- Size: Small (1-2 files)
- Phase: 2 - Service Layer
- Verification Level: L2 (Test Operation)
- Acceptance Criteria: AC1, AC2, AC3, AC5

## Implementation Content

Extend the `countSubscribers` method in `BroadcastService` to accept optional filter parameters for subscription status and bot ID. The method must maintain backward compatibility - when called without filter parameters, it should behave identically to the current implementation.

## Target Files

- [x] `libs/masterbot/src/services/broadcast.service.ts` (implementation)
- [x] `libs/masterbot/src/services/__tests__/broadcast.service.spec.ts` (unit tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review dependency deliverable: Task 001 `findExpired` method
- [x] Write 3 failing unit tests:
  1. `countSubscribers` without filters returns active subscriber count (backward compatibility - AC5)
  2. `countSubscribers` with `filterStatus='expired'` calls `findExpired` (AC1)
  3. `countSubscribers` with combined filters returns correct count (AC3)
- [x] Run tests and confirm all 3 fail

### 2. Green Phase

- [x] Extend `countSubscribers` method signature:
  ```typescript
  async countSubscribers(
    subscriptionId: number,
    filterStatus?: 'active' | 'expired',
    filterBotId?: number | null,
  ): Promise<number>
  ```
- [x] Add conditional logic:
  - Default or `filterStatus = 'active'`: Use existing `findActiveBySubscriptionId` query
  - `filterStatus = 'expired'`: Call repository `findExpired` with appropriate parameters
- [x] Handle `filterBotId` parameter for bot filtering in both cases
- [x] Ensure backward compatibility: no parameters = current behavior
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase

- [x] Extract filter application logic if duplicated
- [x] Add JSDoc documentation matching existing service style
- [x] Confirm added tests still pass

## Interface Definition

```typescript
/**
 * Count subscribers with optional filters
 *
 * @param subscriptionId - The subscription ID
 * @param filterStatus - 'active' | 'expired' (default: 'active')
 * @param filterBotId - Optional bot ID filter (null = all bots)
 * @returns Count of matching subscribers
 */
async countSubscribers(
  subscriptionId: number,
  filterStatus?: 'active' | 'expired',
  filterBotId?: number | null,
): Promise<number>
```

## Completion Criteria

- [x] All 3 added unit tests pass
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`)
- [x] Backward compatibility verified: calling without filter params works identically to before
- [x] Default behavior identical to pre-filter implementation (AC5)

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/services/__tests__/broadcast.service.spec.ts
```

## Notes

- **Impact scope**: Handler layer will pass filter parameters from session state
- **Constraints**: Must not change behavior when called without filter parameters
- **Integration**: Uses Task 001 `findExpired` for expired subscriber queries

## Test Specification

```typescript
describe('countSubscribers', () => {
  describe('backward compatibility (AC5)', () => {
    it('should return active subscriber count when called without filters', async () => {
      // Arrange: Create active and expired subscriptions
      // Act: Call countSubscribers(subscriptionId)
      // Assert: Returns count matching current implementation (active only)
    });
  });

  describe('expired filter (AC1)', () => {
    it('should call findExpired when filterStatus is expired', async () => {
      // Arrange: Mock repository findExpired
      // Act: Call countSubscribers(subscriptionId, 'expired')
      // Assert: findExpired was called, returns correct count
    });
  });

  describe('combined filters (AC3)', () => {
    it('should apply both status and bot filters', async () => {
      // Arrange: Create subscriptions across multiple bots
      // Act: Call countSubscribers(subscriptionId, 'expired', specificBotId)
      // Assert: Returns count matching both filters
    });
  });
});
```
