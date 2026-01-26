# Task: Execute and Fix Integration Tests

Metadata:
- Dependencies: Tasks 001-006 (All implementation complete)
- Provides: Verified integration between repository and service layers
- Size: Small (1 file)
- Phase: 4 - Quality Assurance
- Verification Level: L2 (Test Operation)
- Acceptance Criteria: AC1, AC3, AC5

## Implementation Content

Execute the pre-defined integration tests in `broadcast-filter.int.spec.ts` and resolve all `it.todo` placeholders with working test implementations. These tests verify the integration between repository and service layers for the broadcast filter feature.

## Target Files

- [x] `libs/masterbot/src/services/__tests__/broadcast-filter.int.spec.ts`

## Implementation Steps

### 1. Preparation

- [x] Verify all implementation tasks (001-006) are complete
- [x] Run build to ensure no compilation errors: `npm run build`
- [x] Review integration test file structure

### 2. Test Implementation

Resolve each `it.todo` with working test:

**Service Layer Tests:**
- [x] AC5: `countSubscribers` without filters returns active subscriber count
  ```typescript
  it('countSubscribers without filters returns active subscriber count', async () => {
    // Setup active and expired subscriptions
    // Call countSubscribers(subscriptionId) without filter params
    // Assert count matches only active subscribers
  });
  ```

- [x] AC1: `countSubscribers` with `filterStatus='expired'` calls `findExpired`
  ```typescript
  it('countSubscribers with filterStatus=expired uses findExpired', async () => {
    // Setup expired subscriptions
    // Call countSubscribers(subscriptionId, 'expired')
    // Assert count matches expired subscribers only
  });
  ```

- [x] AC3: `countSubscribers` with combined filters returns correct count
  ```typescript
  it('countSubscribers with combined filters returns correct count', async () => {
    // Setup subscriptions across multiple bots
    // Call countSubscribers(subscriptionId, 'expired', specificBotId)
    // Assert count matches both filters
  });
  ```

**Repository Layer Tests:**
- [x] AC1: `findExpired` returns correct shape
  ```typescript
  it('findExpired returns correct shape with botUser, subscription, userSubscription', async () => {
    // Setup expired subscription
    // Call findExpired()
    // Assert return shape matches findExpiring
  });
  ```

- [x] AC1: `findExpired` with `subscriptionType='signals'` filter
  ```typescript
  it('findExpired filters by subscriptionType correctly', async () => {
    // Setup signals and non-signals expired subscriptions
    // Call findExpired('signals')
    // Assert only signals subscriptions returned
  });
  ```

- [x] AC2: `findExpired` with `botId` filter
  ```typescript
  it('findExpired filters by botId correctly', async () => {
    // Setup expired subscriptions for multiple bots
    // Call findExpired(undefined, specificBotId)
    // Assert only specified bot's subscriptions returned
  });
  ```

- [x] AC1: `findExpired` with `subscriptionId` filter
  ```typescript
  it('findExpired filters by subscriptionId correctly', async () => {
    // Setup multiple expired subscriptions
    // Call findExpired(undefined, undefined, specificSubscriptionId)
    // Assert only specified subscription's expired users returned
  });
  ```

- [x] AC2: `findAllActive` returns active bots
  ```typescript
  it('findAllActive returns only active bots', async () => {
    // Setup active and inactive bots
    // Call botsRepository.findAllActive()
    // Assert only active bots returned
  });
  ```

### 3. Verification

- [x] Run all integration tests: `npm test -- libs/masterbot/src/services/__tests__/broadcast-filter.int.spec.ts`
- [x] Verify all 8 tests pass
- [x] Check test coverage for new code

## Completion Criteria

- [x] All 8 integration tests pass
- [x] No `it.todo` remaining in test file
- [x] Tests verify actual database integration (not mocked)
- [x] Test data properly cleaned up after each test

## Quality Check Commands

```bash
npm test -- libs/masterbot/src/services/__tests__/broadcast-filter.int.spec.ts
```

## Test Resolution Progress

| # | AC | Test Description | Status |
|---|----|--------------------|--------|
| 1 | AC5 | countSubscribers backward compatibility | it.todo -> Pass |
| 2 | AC1 | countSubscribers with expired filter | it.todo -> Pass |
| 3 | AC3 | Combined filter count | it.todo -> Pass |
| 4 | AC1 | findExpired return shape | it.todo -> Pass |
| 5 | AC1 | findExpired subscriptionType filter | it.todo -> Pass |
| 6 | AC2 | findExpired botId filter | it.todo -> Pass |
| 7 | AC1 | findExpired subscriptionId filter | it.todo -> Pass |
| 8 | AC2 | findAllActive bots | it.todo -> Pass |

**Target: 8/8 tests passing**

## Notes

- **Integration tests use real database connection** - ensure test database is available
- **Test isolation**: Each test should set up and tear down its own data
- **Pattern**: Follow existing integration test patterns in the codebase
- **Order independence**: Tests should not depend on execution order

## Test Data Setup Pattern

```typescript
beforeEach(async () => {
  // Create test bot
  testBot = await botsRepository.create({ ... });

  // Create test subscription
  testSubscription = await subscriptionsRepository.create({ ... });

  // Create test bot user
  testBotUser = await botUsersRepository.create({ ... });

  // Create active subscription
  activeUserSubscription = await userSubscriptionsRepository.create({
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000), // Tomorrow
    ...
  });

  // Create expired subscription
  expiredUserSubscription = await userSubscriptionsRepository.create({
    isActive: false,
    expiresAt: new Date(Date.now() - 86400000), // Yesterday
    ...
  });
});

afterEach(async () => {
  // Clean up test data in reverse order
  await userSubscriptionsRepository.delete(activeUserSubscription.id);
  await userSubscriptionsRepository.delete(expiredUserSubscription.id);
  await botUsersRepository.delete(testBotUser.id);
  await subscriptionsRepository.delete(testSubscription.id);
  await botsRepository.delete(testBot.id);
});
```
