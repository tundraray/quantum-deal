# Task: Implement getUniqueUserCount Method

Metadata:
- Dependencies: None (independent service method)
- Provides: `libs/masterbot/src/services/broadcast.service.ts` - getUniqueUserCount method
- Size: Small (2 files: implementation + tests)
- Phase: 2 - Service Layer
- Verification Level: L2 (Test Operation)
- Acceptance Criteria: AC5 (Preview with User Count Breakdown)

## Implementation Content

Implement a new `getUniqueUserCount` method in BroadcastService that:
1. Queries subscribers for each subscription using existing repository methods
2. Deduplicates users by `botUser.userId` to get unique count
3. Calculates per-subscription breakdown (raw counts, may overlap)
4. Returns total unique count and breakdown for preview display

## Target Files

- [x] `libs/masterbot/src/services/broadcast.service.ts` (implementation)
- [x] `libs/masterbot/src/services/__tests__/broadcast.service.spec.ts` (unit tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Study existing `countSubscribers` method pattern
- [x] Study `findSubscribersWithUserDetails` method in UserSubscriptionsRepository
- [x] Write 5 failing unit tests:
  1. `getUniqueUserCount` with single subscription returns correct total
  2. `getUniqueUserCount` with multiple subscriptions returns deduplicated total
  3. `getUniqueUserCount` returns correct breakdown per subscription
  4. `getUniqueUserCount` handles filterStatus correctly
  5. `getUniqueUserCount` handles filterBotId correctly
- [x] Run tests and confirm all 5 fail

### 2. Green Phase

- [x] Define return type interface:
  ```typescript
  interface UserCountBreakdown {
    total: number;
    breakdown: Array<{
      subscriptionId: number;
      name: string;
      count: number;
    }>;
  }
  ```
- [x] Implement `getUniqueUserCount` method:
  ```typescript
  async getUniqueUserCount(
    subscriptionIds: number[],
    filterStatus: 'active' | 'expired',
    filterBotId: number | null,
  ): Promise<UserCountBreakdown>
  ```
- [x] Implementation logic:
  - For each subscriptionId, query subscribers using appropriate repository method
  - Apply filterStatus and filterBotId filters
  - Build breakdown array with subscription name and count
  - Collect all users and deduplicate by `botUser.userId`
  - Calculate total unique count
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase

- [x] Extract deduplication logic if reusable (will be needed in Task 4)
- [x] Ensure consistent error handling
- [x] Confirm added tests still pass

## Data Contract

```yaml
Input:
  subscriptionIds: number[] (at least 1)
  filterStatus: 'active' | 'expired'
  filterBotId: number | null
Output:
  UserCountBreakdown { total, breakdown }
Guarantees:
  - total = count of unique users (deduplicated by userId)
  - breakdown[].count may overlap (user in multiple subs)
  - sum(breakdown[].count) >= total
On Error:
  - Throw if any subscription not found
```

## Test Specification

```typescript
describe('getUniqueUserCount', () => {
  it('should return correct total for single subscription', async () => {
    // Arrange: Mock repository to return 3 users for subscription 1
    // Act: Call getUniqueUserCount([1], 'active', null)
    // Assert: total = 3, breakdown has 1 entry with count 3
  });

  it('should return deduplicated total for multiple subscriptions', async () => {
    // Arrange: Mock repository
    //   - Sub 1: users [A, B, C] (3 users)
    //   - Sub 2: users [B, C, D] (3 users, B and C overlap)
    // Act: Call getUniqueUserCount([1, 2], 'active', null)
    // Assert: total = 4 (A, B, C, D), breakdown[0].count = 3, breakdown[1].count = 3
  });

  it('should return correct breakdown per subscription', async () => {
    // Arrange: Mock subscriptions with names and counts
    // Act: Call getUniqueUserCount
    // Assert: breakdown contains correct subscriptionId, name, count for each
  });

  it('should filter by status when filterStatus=expired', async () => {
    // Arrange: Mock repository with filterStatus parameter check
    // Act: Call getUniqueUserCount([1], 'expired', null)
    // Assert: Repository called with 'expired' filter
  });

  it('should filter by bot when filterBotId specified', async () => {
    // Arrange: Mock repository with botId parameter check
    // Act: Call getUniqueUserCount([1], 'active', 5)
    // Assert: Repository called with botId=5 filter
  });
});
```

## Completion Criteria

- [x] All 5 unit tests pass
- [x] Method returns accurate deduplicated counts
- [x] Breakdown contains correct subscription names and counts
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`) - Note: pre-existing type errors in codebase, not related to this task

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/services/__tests__/broadcast.service.spec.ts
```

## Notes

- **Impact scope**: Preview handler (Task 8) will call this method
- **Constraints**: Do not modify existing `countSubscribers` method
- **Pattern Reference**: Use existing repository query patterns
- **Deduplication Logic**: Store unique users by userId in a Map or Set
