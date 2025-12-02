# Task: Add New Repository Methods with botUserId Parameter

Metadata:
- Phase: 3 (Repository Updates)
- Dependencies: Task 03 (Migration SQL Enhanced), User has run migration
- Provides: New repository methods using `botUserId`
- Size: Medium (2 files: repository + tests)

## Implementation Content
Add new repository methods to `UserSubscriptionsRepository` that use `botUserId` parameter instead of `userId`. These methods will query subscriptions by the `bot_users.id` (internal ID) rather than `users.telegramId`.

**Key Understanding**: `botUserId` is `bot_users.id` (auto-generated internal ID), NOT `telegramId`.

## Target Files
- [ ] `libs/db/src/repositories/user-subscriptions.repository.ts`
- [ ] `libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase - Write Failing Tests First
- [ ] Add test for `findByBotUserId(botUserId: number)`
- [ ] Add test for `findActiveByBotUserId(botUserId: number)`
- [ ] Add test for `findByBotUserAndSubscription(botUserId: number, subscriptionId: number)`
- [ ] Add test for `findActiveByBotUserIdWithSubscription(botUserId: number)`
- [ ] Add test for `isBotUserSubscribed(botUserId: number, subscriptionId: number)`
- [ ] Add test for `hasActiveSubscriptionByBotUser(botUserId: number, subscriptionId: number)`
- [ ] Add test for `activateForBotUser(botUserId: number, subscriptionId: number, expiresAt?: Date)`
- [ ] Add test for `deactivateForBotUser(botUserId: number, subscriptionId: number)`
- [ ] Run tests and confirm they fail

### 2. Green Phase - Implement Methods
- [ ] Implement `findByBotUserId(botUserId: number)`:
  ```typescript
  async findByBotUserId(botUserId: number): Promise<UserSubscription[]> {
    return this.findBy(eq(this.table.botUserId, botUserId));
  }
  ```

- [ ] Implement `findActiveByBotUserId(botUserId: number)`:
  ```typescript
  async findActiveByBotUserId(botUserId: number): Promise<UserSubscription[]> {
    return this.findBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.isActive, true),
        sql`${this.table.expiresAt} IS NOT NULL`,
        sql`${this.table.expiresAt} >= ${new Date()}`,
      ),
    );
  }
  ```

- [ ] Implement `findByBotUserAndSubscription(botUserId: number, subscriptionId: number)`:
  ```typescript
  async findByBotUserAndSubscription(
    botUserId: number,
    subscriptionId: number,
  ): Promise<UserSubscription | null> {
    const result = await this.findBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.subscriptionId, subscriptionId),
      ),
    );
    return result[0] || null;
  }
  ```

- [ ] Implement `findActiveByBotUserIdWithSubscription(botUserId: number)`:
  ```typescript
  async findActiveByBotUserIdWithSubscription(botUserId: number): Promise<
    Array<{
      userSubscription: UserSubscription;
      subscription: Subscription;
    }>
  > {
    const result = await this.db
      .select({
        userSubscription: this.table,
        subscription: subscriptions,
      })
      .from(this.table)
      .innerJoin(subscriptions, eq(this.table.subscriptionId, subscriptions.id))
      .where(and(eq(this.table.botUserId, botUserId), eq(this.table.isActive, true)));

    return result;
  }
  ```

- [ ] Implement `isBotUserSubscribed(botUserId: number, subscriptionId: number)`:
  ```typescript
  async isBotUserSubscribed(
    botUserId: number,
    subscriptionId: number,
  ): Promise<boolean> {
    const result = await this.findOneBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.subscriptionId, subscriptionId),
      ),
    );
    return result !== null;
  }
  ```

- [ ] Implement `hasActiveSubscriptionByBotUser(botUserId: number, subscriptionId: number)`:
  ```typescript
  async hasActiveSubscriptionByBotUser(
    botUserId: number,
    subscriptionId: number,
  ): Promise<boolean> {
    const result = await this.findOneBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.subscriptionId, subscriptionId),
        eq(this.table.isActive, true),
      ),
    );
    return result !== null;
  }
  ```

- [ ] Implement `activateForBotUser(botUserId: number, subscriptionId: number, expiresAt?: Date)`:
  ```typescript
  async activateForBotUser(
    botUserId: number,
    subscriptionId: number,
    expiresAt?: Date,
  ): Promise<UserSubscription> {
    // Similar logic to activate() but using botUserId
    const existing = await this.findOneBy(
      and(
        eq(this.table.botUserId, botUserId),
        eq(this.table.subscriptionId, subscriptionId),
      ),
    );

    if (existing) {
      // Extension logic (same as activate)
      // ... (copy extension logic from activate method)
      const updated = await this.db
        .update(this.table)
        .set({
          isActive: true,
          expiresAt: newExpiresAt,
          activatedAt: new Date(),
        })
        .where(
          and(
            eq(this.table.botUserId, botUserId),
            eq(this.table.subscriptionId, subscriptionId),
          ),
        )
        .returning();
      return updated[0];
    } else {
      return this.create({
        botUserId,
        subscriptionId,
        expiresAt,
        isActive: true,
      });
    }
  }
  ```

- [ ] Implement `deactivateForBotUser(botUserId: number, subscriptionId: number)`:
  ```typescript
  async deactivateForBotUser(botUserId: number, subscriptionId: number): Promise<void> {
    await this.db
      .update(this.table)
      .set({ isActive: false })
      .where(
        and(
          eq(this.table.botUserId, botUserId),
          eq(this.table.subscriptionId, subscriptionId),
        ),
      );
  }
  ```

- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Extract common query patterns if any duplication
- [ ] Add proper JSDoc comments to all new methods
- [ ] Ensure consistent error handling patterns
- [ ] Run lint and format checks

## Test Cases

```typescript
describe('UserSubscriptionsRepository - botUserId methods', () => {
  describe('findByBotUserId', () => {
    it('should return all subscriptions for a specific bot user', async () => {
      // Arrange
      const botUserId = 1;
      const mockSubscriptions = [
        { id: 1, botUserId: 1, subscriptionId: 1, isActive: true },
        { id: 2, botUserId: 1, subscriptionId: 2, isActive: false },
      ];
      mockDb.where.mockResolvedValue(mockSubscriptions);

      // Act
      const result = await repository.findByBotUserId(botUserId);

      // Assert
      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe('activateForBotUser', () => {
    it('should create new subscription with botUserId', async () => {
      // Arrange
      const botUserId = 1;
      const subscriptionId = 1;
      const expiresAt = new Date('2025-12-31');

      // ... mock setup

      // Act
      const result = await repository.activateForBotUser(botUserId, subscriptionId, expiresAt);

      // Assert
      expect(result.botUserId).toBe(botUserId);
      expect(result.isActive).toBe(true);
    });

    it('should extend existing subscription for bot user', async () => {
      // Test extension logic
    });
  });
});
```

## Completion Criteria
- [ ] All 8 new methods implemented
- [ ] All tests pass: `npm test -- --testPathPattern=user-subscriptions.repository`
- [ ] **AC-3.1**: `findByBotUserId(botUserId)` returns subscriptions for specific bot-user
- [ ] **AC-3.2**: `findActiveByBotUserId(botUserId)` returns only active, non-expired subscriptions
- [ ] **AC-3.3**: `activateForBotUser(botUserId, subscriptionId, expiresAt)` creates subscription with `botUserId`
- [ ] Build passes: `npm run build`

## Verification Commands
```bash
# Run repository tests
npm test -- --testPathPattern=user-subscriptions.repository

# Build check
npm run build

# Lint check
npm run check
```

## Notes
- Impact scope: Repository layer only
- Constraints: Do not modify existing `userId` methods (handled in Task 05)
- The `activateForBotUser` method should follow the same extension logic as `activate`
- All new methods should query by `botUserId` column, not `userId`
