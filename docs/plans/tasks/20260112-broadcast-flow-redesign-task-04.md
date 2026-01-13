# Task: Implement sendBroadcastMulti Method

Metadata:
- Dependencies: Task 3 (for consistent deduplication logic)
- Provides: `libs/masterbot/src/services/broadcast.service.ts` - sendBroadcastMulti method
- Size: Small (2 files: implementation + tests)
- Phase: 2 - Service Layer
- Verification Level: L2 (Test Operation)
- Acceptance Criteria: AC6 (Broadcast Execution with Deduplication)

## Implementation Content

Implement a new `sendBroadcastMulti` method in BroadcastService that:
1. Collects users from all specified subscriptions
2. Deduplicates by `botUser.userId` (same logic as getUniqueUserCount)
3. Sends message to each unique user only once
4. Returns BroadcastResultDto with deduplicated counts

## Target Files

- [x] `libs/masterbot/src/services/broadcast.service.ts` (implementation)
- [x] `libs/masterbot/src/services/__tests__/broadcast.service.spec.ts` (unit tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Study existing `sendBroadcast` method pattern
- [x] Study how NotificationService.queueBroadcast is called
- [x] Write 5 failing unit tests:
  1. `sendBroadcastMulti` deduplicates users across subscriptions
  2. `sendBroadcastMulti` works with single subscription (backward compatible)
  3. `sendBroadcastMulti` respects filterStatus parameter
  4. `sendBroadcastMulti` respects filterBotId parameter
  5. `sendBroadcastMulti` calls NotificationService with unique user list
- [x] Run tests and confirm all 5 fail

### 2. Green Phase

- [x] Implement `sendBroadcastMulti` method:
  ```typescript
  async sendBroadcastMulti(
    subscriptionIds: number[],
    message: string,
    entities: MessageEntity[] | undefined,
    managerId: number,
    filterStatus: 'active' | 'expired',
    filterBotId: number | null,
  ): Promise<BroadcastResultDto>
  ```
- [x] Implementation logic:
  - For each subscriptionId, query subscribers with filters
  - Deduplicate users by `botUser.userId` (reuse logic from Task 3)
  - For each unique user, queue notification via NotificationService
  - Track success/failure counts
  - Return BroadcastResultDto with deduplicated counts
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase

- [x] Extract shared deduplication logic if not already done in Task 3
- [x] Ensure consistent error handling with existing sendBroadcast
- [x] Confirm added tests still pass

## Data Contract

```yaml
Input:
  subscriptionIds: number[]
  message: string (1-4096 chars)
  entities: MessageEntity[] | undefined
  managerId: number
  filterStatus: 'active' | 'expired'
  filterBotId: number | null
Output:
  BroadcastResultDto
Preconditions:
  - All subscriptions must exist
  - Message must be valid
Guarantees:
  - Each user receives message at most once (deduplication)
  - Result reflects deduplicated count
On Error:
  - Throw if validation fails
```

## Test Specification

```typescript
describe('sendBroadcastMulti', () => {
  it('should deduplicate users across subscriptions', async () => {
    // Arrange: Mock repository
    //   - Sub 1: users [A, B, C]
    //   - Sub 2: users [B, C, D]
    // Act: Call sendBroadcastMulti([1, 2], message, ...)
    // Assert: NotificationService.queueBroadcast called with 4 unique users
  });

  it('should work with single subscription (backward compatible)', async () => {
    // Arrange: Mock single subscription with 3 users
    // Act: Call sendBroadcastMulti([1], message, ...)
    // Assert: Works same as sendBroadcast for single sub
  });

  it('should respect filterStatus=expired parameter', async () => {
    // Arrange: Mock repository with expired users
    // Act: Call sendBroadcastMulti([1], message, ..., 'expired', null)
    // Assert: Repository queried with 'expired' filter
  });

  it('should respect filterBotId parameter', async () => {
    // Arrange: Mock repository with specific bot users
    // Act: Call sendBroadcastMulti([1], message, ..., 'active', 5)
    // Assert: Repository queried with botId=5 filter
  });

  it('should call NotificationService with unique user list only', async () => {
    // Arrange: Mock overlapping users
    // Act: Call sendBroadcastMulti
    // Assert: Each unique userId appears exactly once in notification calls
  });
});
```

## Completion Criteria

- [x] All 5 unit tests pass
- [x] Users receive message at most once (deduplication verified)
- [x] Result shows correct count (deduplicated)
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`)

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/services/__tests__/broadcast.service.spec.ts
```

## Notes

- **Impact scope**: Confirmation handler (Task 9) will call this method
- **Constraints**: Do not modify existing `sendBroadcast` method - keep for compatibility
- **Pattern Reference**: Follow existing `sendBroadcast` implementation pattern
- **Deduplication**: Use Map<userId, botUser> to ensure unique users
