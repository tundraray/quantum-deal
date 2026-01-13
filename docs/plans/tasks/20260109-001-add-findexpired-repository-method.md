# Task: Add findExpired Method to UserSubscriptionsRepository

Metadata:
- Dependencies: None (Foundation task)
- Provides: `libs/db/src/repositories/user-subscriptions.repository.ts` - findExpired method
- Size: Small (1-2 files)
- Phase: 1 - Repository Layer
- Verification Level: L3 (Build Success)
- Acceptance Criteria: AC1 (Expired Subscription Filter)

## Implementation Content

Add a new `findExpired` method to the `UserSubscriptionsRepository` that queries expired subscriptions. This method follows the existing `findExpiring` pattern exactly but with inverted conditions:
- `isActive = false` (instead of `true`)
- `expiresAt < NOW()` (instead of future date check)

The method supports three optional filters:
- `subscriptionType`: Filter by subscription type ('signals' or pattern)
- `botId`: Filter by specific bot
- `subscriptionId`: Filter by specific subscription

## Target Files

- [x] `libs/db/src/repositories/user-subscriptions.repository.ts` (implementation)
- [x] `libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts` (unit tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Study `findExpiring` method (line 67-113) as the primary pattern reference
- [x] Write 4 failing unit tests:
  1. `findExpired` returns only expired subscriptions with correct return shape
  2. `findExpired` with `subscriptionType=signals` returns only signals subscriptions
  3. `findExpired` with `botId` returns only that bot's expired subscribers
  4. `findExpired` with `subscriptionId` returns only that subscription's expired users
- [x] Run tests and confirm all 4 fail

### 2. Green Phase

- [x] Implement `findExpired` method following `findExpiring` pattern:
  ```typescript
  async findExpired(
    subscriptionType?: string,
    botId?: number,
    subscriptionId?: number,
  ): Promise<
    Array<{
      botUser: BotUser;
      subscription: Subscription;
      userSubscription: UserSubscription;
    }>
  >
  ```
- [x] Implement base conditions (Drizzle ORM):
  - `eq(this.table.isActive, false)` - Expired = inactive
  - `eq(botUsers.isActive, true)` - Only active bot users
  - `sql\`${this.table.expiresAt} IS NOT NULL\``
  - `sql\`${this.table.expiresAt} < NOW()\`` - Already expired
- [x] Add optional `subscriptionType` filter (same logic as `findExpiring`)
- [x] Add optional `botId` filter
- [x] Add optional `subscriptionId` filter (new: not in `findExpiring`)
- [x] Use same query structure: innerJoin with botUsers and subscriptions
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase

- [x] Review code for DRY opportunities with `findExpiring`
- [x] Ensure consistent naming and documentation style
- [x] Confirm added tests still pass

## Pattern Reference: findExpiring Method

```typescript
// Key differences from findExpiring:
// | Aspect              | findExpiring                              | findExpired                    |
// |---------------------|-------------------------------------------|--------------------------------|
// | isActive condition  | eq(this.table.isActive, true)             | eq(this.table.isActive, false) |
// | Date condition      | expiresAt::date = CURRENT_DATE + N        | expiresAt < NOW()              |
// | daysFromNow param   | Required                                  | Not applicable                 |
// | subscriptionId      | Not available                             | Optional                       |
```

## Completion Criteria

- [x] All 4 added unit tests pass
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`) - Note: Pre-existing type errors in other files, new code compiles correctly
- [x] Return type consistent with `findExpiring`: `Array<{ botUser, subscription, userSubscription }>`
- [x] Method follows `findExpiring` pattern exactly

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts
```

## Notes

- **Impact scope**: BroadcastService countSubscribers and sendBroadcast will depend on this method
- **Constraints**: Do not modify existing `findExpiring` method
- **Pattern**: Follow Drizzle ORM conditions array pattern from `findExpiring`

## Test Specification

```typescript
describe('findExpired', () => {
  it('should return only expired subscriptions with correct return shape', async () => {
    // Arrange: Create expired and active subscriptions
    // Act: Call findExpired()
    // Assert: Only expired subscriptions returned with { botUser, subscription, userSubscription }
  });

  it('should filter by subscriptionType=signals when specified', async () => {
    // Arrange: Create expired signals and non-signals subscriptions
    // Act: Call findExpired('signals')
    // Assert: Only signals subscriptions returned
  });

  it('should filter by botId when specified', async () => {
    // Arrange: Create expired subscriptions for multiple bots
    // Act: Call findExpired(undefined, specificBotId)
    // Assert: Only specified bot's subscriptions returned
  });

  it('should filter by subscriptionId when specified', async () => {
    // Arrange: Create multiple expired subscriptions
    // Act: Call findExpired(undefined, undefined, specificSubscriptionId)
    // Assert: Only specified subscription's expired users returned
  });
});
```
