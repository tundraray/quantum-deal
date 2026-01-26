# Task: Add findBySectorForBot method to SubscriptionsRepository

Metadata:
- Phase: 3 (Repository Extension)
- Dependencies: Phase 1 completed
- Provides: Bot-scoped subscription query method
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)

## Implementation Content

Add the `findBySectorForBot()` method to `SubscriptionsRepository` that queries subscriptions for a specific bot. This method filters by `botId` (with `IS NULL` handling for static bot) and includes the `hasCustomFiltering` flag via subquery.

**AC Support**:
- AC-003 (botId=null returns static bot users with botId IS NULL)
- AC-004 (botId=N returns specific bot users)

## Target Files

- [x] `libs/db/src/repositories/subscriptions.repository.ts` (modify)
- [x] `libs/db/src/repositories/__tests__/subscriptions.repository.int.spec.ts` (add tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Read current implementation of `subscriptions.repository.ts`
- [x] Identify existing `findBySector()` method (pattern to follow)
- [x] Write failing tests for new method

### 2. Green Phase
- [x] Implement `findBySectorForBot()` method
- [x] Handle `botId=null` with `IS NULL` condition
- [x] Include `hasCustomFiltering` via subquery
- [x] Run tests and verify they pass

### 3. Refactor Phase
- [x] Ensure consistent style with existing methods
- [x] Add comprehensive JSDoc documentation

## Implementation Code

```typescript
/**
 * Find subscriptions for a specific bot and sector.
 * Used by MultiBotSignalService for per-bot signal delivery (ADR-007).
 *
 * @param sector - Signal sector (e.g., 'crypto', 'forex')
 * @param botId - Database bot ID (null for static bot QuantumDealBot)
 * @returns Array of user-subscription pairs for the specified bot
 */
async findBySectorForBot(
  sector: string,
  botId: number | null,
): Promise<SubscriptionWithFeatures[]> {
  // Alias for tier-based filtering join
  const sfTier = subscriptionFeatures;

  const result = await this.db
    .select({
      // Subscription fields
      subscriptionId: subscriptions.id,
      subscriptionName: subscriptions.name,
      subscriptionIsActive: subscriptions.isActive,

      // Feature flag: hasCustomFiltering (using subquery)
      hasCustomFiltering: sql<boolean>`
        COALESCE(
          (SELECT sf_custom.is_enabled
           FROM ${subscriptionFeatures} sf_custom
           WHERE sf_custom.subscription_id = ${subscriptions.id}
           AND sf_custom.feature_key = 'custom_user_filtering'
           AND sf_custom.is_enabled = true
          ), false
        )
      `,

      // User fields
      userId: users.telegramId,
      userTelegramId: sql<string>`CAST(${users.telegramId} AS TEXT)`,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userUsername: users.username,
      userLang: users.lang,

      // UserSubscription fields
      userSubscriptionId: userSubscriptions.id,
      userSubscriptionActivatedAt: userSubscriptions.activatedAt,
      userSubscriptionExpiresAt: userSubscriptions.expiresAt,
      userSubscriptionEndDate: userSubscriptions.expiresAt,
      userSubscriptionIsActive: userSubscriptions.isActive,
    })
    .from(subscriptions)
    .innerJoin(
      sfTier,
      and(
        eq(sfTier.subscriptionId, subscriptions.id),
        eq(sfTier.featureKey, 'tier_based_filtering'),
      ),
    )
    .innerJoin(
      userSubscriptions,
      and(
        eq(userSubscriptions.subscriptionId, subscriptions.id),
        eq(userSubscriptions.isActive, true),
        // Bot-specific filter: match botId or IS NULL for static bot
        botId === null
          ? sql`${userSubscriptions.botId} IS NULL`
          : eq(userSubscriptions.botId, botId),
      ),
    )
    .innerJoin(users, eq(users.telegramId, userSubscriptions.userId))
    .where(
      and(
        // Sector filter with wildcard support
        sql`(
          ${sfTier.config}::jsonb->'sectors' ? ${sector}
          OR
          ${sfTier.config}::jsonb->'sectors' ? '*'
        )`,
        eq(sfTier.isEnabled, true),
        eq(subscriptions.isActive, true),
        // Only active, non-expired subscriptions
        sql`${userSubscriptions.expiresAt} > NOW()`,
      ),
    );

  return result as SubscriptionWithFeatures[];
}
```

## Test Cases

```typescript
describe('SubscriptionsRepository', () => {
  describe('findBySectorForBot', () => {
    it('AC-003: should return ONLY users with botId IS NULL when botId is null', async () => {
      // Arrange - create users with different botIds
      // Act
      const result = await repository.findBySectorForBot('crypto', null);
      // Assert - all results have botId IS NULL
    });

    it('AC-004: should return ONLY users with matching botId when botId is specified', async () => {
      // Arrange - create users with different botIds
      // Act
      const result = await repository.findBySectorForBot('crypto', 5);
      // Assert - all results have botId = 5
    });

    it('should exclude inactive subscriptions', async () => {
      // Test isActive filter
    });

    it('should exclude expired subscriptions', async () => {
      // Test expiresAt filter
    });

    it('should include hasCustomFiltering flag', async () => {
      // Test custom filtering subquery
    });

    it('should support wildcard sector matching', async () => {
      // Test '*' sector support
    });
  });
});
```

## Completion Criteria

- [x] Method implemented following existing `findBySector()` pattern
- [x] `botId=null` handled with `IS NULL` condition
- [x] `hasCustomFiltering` included via subquery
- [x] Unit tests pass
- [x] Existing `findBySector()` method unchanged (backward compatibility)
- [x] Build succeeds

## Verification Commands

```bash
# Run repository tests
npm run test -- --filter="SubscriptionsRepository"

# Build verification
npm run build
```

## Notes

- Impact scope: New method only, existing methods unchanged
- Constraints: Must match existing `findBySector()` return type
- The query uses existing indexes on `(sector, botId)` in `user_subscriptions`
- Important: `botId=null` must use `IS NULL`, not `= null`
