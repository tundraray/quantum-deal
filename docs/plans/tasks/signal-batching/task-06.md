# Task 6: Repository Extension - filterSettings

**Phase**: 5 - Repository Extension
**Verification Level**: L2 (Unit tests pass)
**Estimated Effort**: Small (3 files modified)
**Dependencies**: None (independent)

## Task Overview

Extend `findBySectorForBot()` repository method to include `filterSettings` field in the query result. This eliminates N additional database queries for custom filtering by including filter data in the initial subscriber query.

## Target Files

### Files to Modify (3)
1. `libs/db/src/repositories/subscriptions.repository.ts` - Add filterSettings to query
2. `libs/framework/src/webhook/multi-bot-signal.interface.ts` - Add filterSettings to interface
3. `libs/db/src/repositories/__tests__/subscriptions.repository.spec.ts` - Add tests

## Implementation Steps

### Step 1: Update SubscriptionWithFeatures Interface

In `subscriptions.repository.ts`, add `filterSettings` field:

```typescript
export interface SubscriptionWithFeatures {
  // ... existing fields ...
  hasCustomFiltering: boolean; // Already exists

  // NEW: Filter settings from user_subscription_features
  filterSettings: { symbols?: string[] } | null;
}
```

### Step 2: Extend findBySectorForBot() Query

Add filterSettings subquery to SELECT clause:

```typescript
async findBySectorForBot(
  sector: string,
  botId: number,
): Promise<SubscriptionWithFeatures[]> {
  const result = await this.db
    .select({
      // ... existing fields ...

      // Feature flag: hasCustomFiltering (already exists)
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

      // NEW: Add filter settings
      filterSettings: sql<{ symbols?: string[] } | null>`
        (SELECT usf.settings
         FROM user_subscription_features usf
         WHERE usf.bot_user_id = ${botUsers.id}
         AND usf.feature_key = 'custom_user_filtering'
         AND usf.is_active = true
        )
      `,
    })
    // ... rest of query unchanged ...
}
```

**Key Points**:
- Subquery joins on `bot_user_id` (not subscription_id)
- Returns `settings` JSONB field with `{ symbols?: string[] }` structure
- Returns `null` when user has no custom filtering configured
- No additional queries needed - all data in single query

### Step 3: Update NotificationUser Interface

In `multi-bot-signal.interface.ts`:

```typescript
export interface NotificationUser {
  botUserId: number;
  telegramUserId: number;
  lang: string;
  hasCustomFiltering: boolean;

  // NEW: Filter settings for in-memory filtering
  filterSettings: { symbols?: string[] } | null;
}
```

### Step 4: Write Unit Tests

In `subscriptions.repository.spec.ts`:

```typescript
describe('findBySectorForBot with filterSettings', () => {
  it('should return filterSettings when user has custom filtering', async () => {
    // Setup: User with custom filtering enabled
    const userId = await createTestUser();
    const botId = 1;
    const subscriptionId = await createTestSubscription(userId, botId, 'forex');

    // Enable custom filtering feature
    await enableFeature(subscriptionId, 'custom_user_filtering');

    // Set filter settings
    await setUserFilterSettings(userId, botId, {
      symbols: ['EURUSD', 'GBPUSD'],
    });

    const result = await repository.findBySectorForBot('forex', botId);

    const user = result.find(u => u.botUserId === userId);
    expect(user.hasCustomFiltering).toBe(true);
    expect(user.filterSettings).toEqual({
      symbols: ['EURUSD', 'GBPUSD'],
    });
  });

  it('should return null filterSettings when user has no custom filtering', async () => {
    const userId = await createTestUser();
    const botId = 1;
    await createTestSubscription(userId, botId, 'forex');

    // No custom filtering enabled

    const result = await repository.findBySectorForBot('forex', botId);

    const user = result.find(u => u.botUserId === userId);
    expect(user.hasCustomFiltering).toBe(false);
    expect(user.filterSettings).toBeNull();
  });

  it('should handle empty symbols array', async () => {
    const userId = await createTestUser();
    const botId = 1;
    const subscriptionId = await createTestSubscription(userId, botId, 'forex');

    await enableFeature(subscriptionId, 'custom_user_filtering');
    await setUserFilterSettings(userId, botId, { symbols: [] });

    const result = await repository.findBySectorForBot('forex', botId);

    const user = result.find(u => u.botUserId === userId);
    expect(user.filterSettings).toEqual({ symbols: [] });
  });
});
```

### Step 5: Verify Existing Tests Still Pass

Run existing repository tests to ensure no regressions:

```bash
npm run test -- subscriptions.repository
```

**Expected**: All existing tests pass, new tests pass.

### Step 6: Verify Performance Improvement

Add performance test:

```typescript
describe('Performance: filterSettings query optimization', () => {
  it('should fetch all data in single query (0 additional queries)', async () => {
    // Setup: 10 users with custom filtering
    const botId = 1;
    for (let i = 0; i < 10; i++) {
      const userId = await createTestUser();
      const subId = await createTestSubscription(userId, botId, 'forex');
      await enableFeature(subId, 'custom_user_filtering');
      await setUserFilterSettings(userId, botId, { symbols: ['EURUSD'] });
    }

    // Track query count
    const queryCountBefore = getQueryCount();

    const result = await repository.findBySectorForBot('forex', botId);

    const queryCountAfter = getQueryCount();

    // Should be only 1 query (findBySectorForBot)
    expect(queryCountAfter - queryCountBefore).toBe(1);

    // All users should have filterSettings
    const usersWithFilters = result.filter(u => u.hasCustomFiltering);
    expect(usersWithFilters).toHaveLength(10);
    usersWithFilters.forEach(u => {
      expect(u.filterSettings).not.toBeNull();
    });
  });
});
```

**Performance Comparison**:
- **Before**: N queries (one per user with `hasCustomFiltering=true`)
- **After**: 0 additional queries (all data in `findBySectorForBot()`)

## Completion Criteria

- [x] `findBySectorForBot()` returns `filterSettings` field
- [x] `filterSettings` is null when user has no custom filtering
- [x] `filterSettings` contains `{ symbols?: string[] }` when configured
- [x] `SubscriptionWithFeatures` interface includes `filterSettings`
- [x] `NotificationUser` interface includes `filterSettings`
- [x] No additional DB queries required for filtering
- [x] All existing tests still pass
- [x] New unit tests pass (3+ test cases)
- [x] Unit test coverage >= 80%

## Verification Procedures

### Unit Test Execution
```bash
npm run test -- subscriptions.repository
```
**Expected**: All tests pass, including new filterSettings tests.

### SQL Query Verification
```sql
-- Verify filterSettings subquery works correctly
SELECT
  bu.id as bot_user_id,
  (SELECT usf.settings
   FROM user_subscription_features usf
   WHERE usf.bot_user_id = bu.id
   AND usf.feature_key = 'custom_user_filtering'
   AND usf.is_active = true
  ) as filter_settings
FROM bot_users bu
WHERE bu.bot_id = 1;
```

**Expected**: Returns `filter_settings` JSONB or null.

### Performance Test
```typescript
// Measure query count
const before = getQueryCount();
await repository.findBySectorForBot('forex', 1);
const after = getQueryCount();
console.log(`Queries executed: ${after - before}`); // Should be 1
```

## Test Information

**Test Category**: `@category: data-access`
**Test Complexity**: `@complexity: medium` (SQL subquery)
**Test Dependencies**: Database, subscriptions.repository

**Acceptance Criteria Coverage**:
- Design Doc: "Zero additional DB queries for filtering"
- Design Doc: "Extended findBySectorForBot() with filterSettings"

## Dependencies

**Depends on**: None (independent extension)
**Required by**: Task 7 (SignalService Integration) - uses filterSettings for in-memory filtering

## Notes

### Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| DB queries per broadcast | N (users with filtering) | 0 additional |
| Query pattern | Sequential individual queries | Single query |
| Memory overhead | Minimal | ~100B per user |
| Latency reduction | - | ~N * avg_query_time |

**Example**: With 50 users having custom filtering and 10ms avg query time:
- Before: 50 queries * 10ms = 500ms
- After: 0 additional queries = 0ms
- Improvement: 100% reduction

### Design Decisions

**Why subquery instead of JOIN?**
- Cleaner NULL handling (NULL when no settings)
- No duplicate rows from 1:many relationship
- More readable query structure

**Why JSONB settings field?**
- Flexible structure for different filter types
- No schema changes needed for new filter options
- Efficient indexing with GIN indexes

### Alternative Approaches Considered

- **LEFT JOIN with user_subscription_features**: Rejected - causes duplicate rows
- **Separate query for each user**: Current approach - N query problem
- **Cache filter settings**: Rejected - adds cache invalidation complexity

## Related Documents

- [Design Doc](../../design/signal-batching-design.md) - Section "Batch Database Query Optimization"
- [Task 7](./task-07.md) - Consumer of filterSettings
- [Overall Design](./_overview.md) - Performance optimization points
