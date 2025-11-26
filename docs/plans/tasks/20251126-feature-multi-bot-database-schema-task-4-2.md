# Task: Run All Integration Tests (Schema Modifications)

Metadata:
- Phase: 4 (Seed Data and Final QA)
- Dependencies: Task 4.1 (seed data created)
- Provides: Comprehensive test coverage for modified tables
- Size: Medium (1 test file with 13 tests)
- Verification Level: L2 (All tests pass)

## Implementation Content

Create comprehensive integration tests for the schema modifications to user_subscriptions, renewal_tariffs, and codes tables. Also test backward compatibility.

## Target Files
- [x] `libs/db/src/repositories/__tests__/multi-bot-schema-modifications.int.spec.ts` (new file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase - Write Test Cases

Create test file with the following test cases:

```typescript
// libs/db/src/repositories/__tests__/multi-bot-schema-modifications.int.spec.ts

describe('Multi-Bot Schema Modifications', () => {
  describe('user_subscriptions with botId', () => {
    it('should create subscription with botId FK') // AC-2.1
    it('should allow null botId for backward compatibility') // AC-2.2
    it('should support bot-scoped subscription queries') // AC-2.3
    it('should enforce partial unique constraint on active subscriptions')
  })

  describe('renewal_tariffs with botId', () => {
    it('should support bot-specific tariffs') // AC-2.4
    it('should support global tariffs with null botId') // AC-2.4
    it('should enforce updated unique constraint') // AC-2.5
    it('should resolve tariff with bot-specific priority') // AC-2.6
  })

  describe('codes with botId', () => {
    it('should create codes with botId FK') // AC-2.7
    it('should support bot-scoped code activation') // AC-2.8
  })

  describe('backward compatibility', () => {
    it('should allow existing repository methods without botId') // AC-5.1
    it('should work with existing code activation flow') // AC-5.2
    it('should return all subscriptions when botId not specified') // AC-5.3
  })

  describe('CASCADE delete behavior', () => {
    it('should cascade delete subscriptions when bot deleted') // AC-4.1
    it('should cascade delete codes when bot deleted') // AC-4.1
  })
})
```

### 2. Implement Tests

Test implementation examples:

```typescript
describe('user_subscriptions with botId', () => {
  it('should create subscription with botId FK', async () => {
    // Arrange
    const bot = await botsRepository.create({ name: 'TestBot', token: 'test-token' })
    const user = await usersRepository.findOrCreate(123456)
    const subscription = await subscriptionsRepository.findOrCreate('test-sub')

    // Act
    const userSub = await userSubscriptionsRepository.create({
      userId: user.telegramId,
      subscriptionId: subscription.id,
      botId: bot.id,
    })

    // Assert
    expect(userSub.botId).toBe(bot.id)
  })

  it('should enforce partial unique constraint on active subscriptions', async () => {
    // Arrange: Create active subscription
    const bot = await botsRepository.create({ name: 'TestBot', token: 'test-token' })
    const user = await usersRepository.findOrCreate(123456)
    const subscription = await subscriptionsRepository.findOrCreate('test-sub')

    await userSubscriptionsRepository.create({
      userId: user.telegramId,
      subscriptionId: subscription.id,
      botId: bot.id,
      isActive: true,
    })

    // Act & Assert: Attempt duplicate active subscription
    await expect(
      userSubscriptionsRepository.create({
        userId: user.telegramId,
        subscriptionId: subscription.id,
        botId: bot.id,
        isActive: true,
      })
    ).rejects.toThrow()

    // But inactive duplicate should work
    await expect(
      userSubscriptionsRepository.create({
        userId: user.telegramId,
        subscriptionId: subscription.id,
        botId: bot.id,
        isActive: false,
      })
    ).resolves.toBeDefined()
  })
})
```

### 3. Run Tests

```bash
pnpm test -- --testPathPattern="multi-bot-schema-modifications.int.spec.ts"
```

**Expected**: All 13 tests pass

## Completion Criteria
- [x] Test file created with 13 test cases
- [x] All AC-2.x tests pass (schema modifications)
- [x] All AC-4.x tests pass (CASCADE behavior)
- [x] All AC-5.x tests pass (backward compatibility)
- [x] Partial unique index verified (FR-012)

## Test Case Summary (13 tests)

| Test Case | AC Reference | Status |
|-----------|-------------|--------|
| user_subscriptions with botId FK | AC-2.1 | Passed |
| Nullable botId backward compat | AC-2.2 | Passed |
| Bot-scoped subscription queries | AC-2.3 | Passed |
| Bot-specific tariffs | AC-2.4 | Passed |
| Global tariffs (null botId) | AC-2.4 | Passed |
| Updated unique constraint | AC-2.5 | Passed |
| Tariff resolution priority | AC-2.6 | Passed |
| codes with botId FK | AC-2.7 | Passed |
| Bot-scoped code activation | AC-2.8 | Passed |
| Repository methods without botId | AC-5.1 | Passed |
| Existing code activation flow | AC-5.2 | Passed |
| Unfiltered subscription queries | AC-5.3 | Passed |
| CASCADE delete (user_subscriptions, codes, tariffs) | AC-4.1 | Passed |
| Bot-scoped indexes exist | AC-4.2 | Passed |

Note: Some test cases combined for efficiency (13 actual tests)

## Notes
- Impact scope: Verifies backward compatibility and new functionality
- Constraints: Tests require database connection
- These tests ensure existing functionality continues to work
- Critical for production safety
