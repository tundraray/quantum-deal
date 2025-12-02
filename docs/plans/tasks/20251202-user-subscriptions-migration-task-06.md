# Task: Update Repository Unit Tests for botUserId Methods

Metadata:
- Phase: 3 (Repository Updates)
- Dependencies: Task 04, Task 05
- Provides: Complete test coverage for new methods
- Size: Small (1 file)

## Implementation Content
Ensure comprehensive test coverage for all new `botUserId` repository methods. This task focuses on expanding test cases and verifying the tests from Task 04 are complete.

## Target Files
- [ ] `libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Review Existing Tests
- [ ] Review test structure from Task 04
- [ ] Identify any missing test cases

### 2. Add/Expand Test Cases

#### findByBotUserId Tests
- [ ] Test returns subscriptions for specific botUserId
- [ ] Test returns empty array when no subscriptions exist
- [ ] Test correctly filters by botUserId (doesn't return other users' subscriptions)

#### findActiveByBotUserId Tests
- [ ] Test returns only active subscriptions
- [ ] Test excludes expired subscriptions
- [ ] Test returns empty array for user with no active subscriptions

#### findByBotUserAndSubscription Tests
- [ ] Test returns subscription when exists
- [ ] Test returns null when not found
- [ ] Test correctly matches both botUserId and subscriptionId

#### findActiveByBotUserIdWithSubscription Tests
- [ ] Test returns subscription with joined subscription details
- [ ] Test only returns active subscriptions
- [ ] Test returns correct subscription type and name

#### isBotUserSubscribed Tests
- [ ] Test returns true when subscription exists (active or inactive)
- [ ] Test returns false when no subscription exists

#### hasActiveSubscriptionByBotUser Tests
- [ ] Test returns true when active subscription exists
- [ ] Test returns false when subscription is inactive
- [ ] Test returns false when no subscription exists

#### activateForBotUser Tests
- [ ] Test creates new subscription when none exists
- [ ] Test extends existing active subscription
- [ ] Test reactivates expired subscription
- [ ] Test sets correct botUserId on created subscription
- [ ] Test does NOT set userId (botUserId is primary)

#### deactivateForBotUser Tests
- [ ] Test sets isActive to false
- [ ] Test works when subscription exists
- [ ] Test handles case when no subscription exists (no error)

### 3. Verify Test Coverage
- [ ] Run coverage report
- [ ] Ensure new methods have >70% coverage
- [ ] All tests pass

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
- [ ] All new methods have at least 2 test cases each
- [ ] Tests cover happy path and edge cases
- [ ] All tests pass: `npm test`
- [ ] Coverage for repository >= 70%
- [ ] **AC-3.1**: Test verifies `findByBotUserId` returns correct subscriptions
- [ ] **AC-3.2**: Test verifies `findActiveByBotUserId` filters correctly
- [ ] **AC-3.3**: Test verifies `activateForBotUser` creates with botUserId

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
