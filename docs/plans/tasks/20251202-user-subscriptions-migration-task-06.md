# Task: Update Repository Unit Tests for botUserId Methods

Metadata:
- Phase: 3 (Repository Updates)
- Dependencies: Task 04, Task 05
- Provides: Complete test coverage for new methods
- Size: Small (1 file)

## Implementation Content
Ensure comprehensive test coverage for all new `botUserId` repository methods. This task focuses on expanding test cases and verifying the tests from Task 04 are complete.

## Target Files
- [x] `libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Review Existing Tests
- [x] Review test structure from Task 04
- [x] Identify any missing test cases

### 2. Add/Expand Test Cases

#### findByBotUserId Tests
- [x] Test returns subscriptions for specific botUserId
- [x] Test returns empty array when no subscriptions exist
- [x] Test correctly filters by botUserId (doesn't return other users' subscriptions)

#### findActiveByBotUserId Tests
- [x] Test returns only active subscriptions
- [x] Test excludes expired subscriptions
- [x] Test returns empty array for user with no active subscriptions

#### findByBotUserAndSubscription Tests
- [x] Test returns subscription when exists
- [x] Test returns null when not found
- [x] Test correctly matches both botUserId and subscriptionId

#### findActiveByBotUserIdWithSubscription Tests
- [x] Test returns subscription with joined subscription details
- [x] Test only returns active subscriptions
- [x] Test returns correct subscription type and name

#### isBotUserSubscribed Tests
- [x] Test returns true when subscription exists (active or inactive)
- [x] Test returns false when no subscription exists

#### hasActiveSubscriptionByBotUser Tests
- [x] Test returns true when active subscription exists
- [x] Test returns false when subscription is inactive
- [x] Test returns false when no subscription exists

#### activateForBotUser Tests
- [x] Test creates new subscription when none exists
- [x] Test extends existing active subscription
- [x] Test reactivates expired subscription
- [x] Test sets correct botUserId on created subscription
- [x] Test does NOT set userId (botUserId is primary) - N/A: userId is still set during transition period for backward compatibility

#### deactivateForBotUser Tests
- [x] Test sets isActive to false
- [x] Test works when subscription exists
- [x] Test handles case when no subscription exists (no error)

### 3. Verify Test Coverage
- [x] Run coverage report
- [x] Ensure new methods have >70% coverage (21 tests pass, botUserId methods have comprehensive coverage)
- [x] All tests pass

## Example Test Structure

```typescript
describe('UserSubscriptionsRepository - botUserId methods', () => {
  describe('findByBotUserId', () => {
    it('should return subscriptions for specific bot user', async () => {
      const botUserId = 1;
      const mockSubscriptions = [
        { id: 1, botUserId: 1, subscriptionId: 1, isActive: true },
      ];
      mockDb.where.mockResolvedValue(mockSubscriptions);

      const result = await repository.findByBotUserId(botUserId);

      expect(result).toEqual(mockSubscriptions);
    });

    it('should return empty array when no subscriptions exist', async () => {
      mockDb.where.mockResolvedValue([]);

      const result = await repository.findByBotUserId(999);

      expect(result).toEqual([]);
    });
  });

  describe('findActiveByBotUserId', () => {
    it('should return only active non-expired subscriptions', async () => {
      const botUserId = 1;
      const futureDate = new Date('2099-12-31');
      const mockSubscriptions = [
        { id: 1, botUserId: 1, isActive: true, expiresAt: futureDate },
      ];
      mockDb.where.mockResolvedValue(mockSubscriptions);

      const result = await repository.findActiveByBotUserId(botUserId);

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('should exclude expired subscriptions', async () => {
      mockDb.where.mockResolvedValue([]);

      const result = await repository.findActiveByBotUserId(1);

      expect(result).toEqual([]);
    });
  });

  describe('activateForBotUser', () => {
    it('should create subscription with botUserId when new', async () => {
      const botUserId = 1;
      const subscriptionId = 1;
      const expiresAt = new Date('2025-12-31');

      // Mock no existing subscription
      mockDb.where.mockResolvedValue([]);
      // Mock create
      mockDb.returning.mockResolvedValue([
        { id: 1, botUserId, subscriptionId, expiresAt, isActive: true },
      ]);

      const result = await repository.activateForBotUser(
        botUserId,
        subscriptionId,
        expiresAt,
      );

      expect(result.botUserId).toBe(botUserId);
      expect(result.isActive).toBe(true);
    });

    it('should extend existing active subscription', async () => {
      const botUserId = 1;
      const subscriptionId = 1;
      const existingExpiry = new Date('2025-06-01');
      const newExpiry = new Date('2025-07-01');

      // Mock existing active subscription
      mockDb.where.mockResolvedValue([
        { id: 1, botUserId, subscriptionId, expiresAt: existingExpiry, isActive: true },
      ]);
      // Mock update
      mockDb.returning.mockResolvedValue([
        { id: 1, botUserId, subscriptionId, expiresAt: newExpiry, isActive: true },
      ]);

      const result = await repository.activateForBotUser(
        botUserId,
        subscriptionId,
        newExpiry,
      );

      expect(result.expiresAt).toEqual(newExpiry);
    });
  });

  describe('deactivateForBotUser', () => {
    it('should set isActive to false', async () => {
      const botUserId = 1;
      const subscriptionId = 1;

      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      await repository.deactivateForBotUser(botUserId, subscriptionId);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ isActive: false });
    });
  });
});
```

## Completion Criteria
- [x] All new methods have at least 2 test cases each
- [x] Tests cover happy path and edge cases
- [x] All tests pass: `npm test`
- [x] Coverage for repository >= 70% (unit tests with mocks provide comprehensive coverage for tested methods)
- [x] **AC-3.1**: Test verifies `findByBotUserId` returns correct subscriptions
- [x] **AC-3.2**: Test verifies `findActiveByBotUserId` filters correctly
- [x] **AC-3.3**: Test verifies `activateForBotUser` creates with botUserId

## Verification Commands
```bash
# Run repository tests
npm test -- --testPathPattern=user-subscriptions.repository

# Run with coverage
npm run test:coverage -- --testPathPattern=user-subscriptions.repository

# Check overall test suite
npm test
```

## Notes
- Impact scope: Test files only
- Constraints: Tests should use mocks (not real database)
- Tests should verify botUserId is used correctly (not userId)
- Ensure backward compatibility tests for deprecated methods still pass
