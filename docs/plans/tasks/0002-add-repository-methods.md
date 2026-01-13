# Task: Add Repository Methods for Users Without Subscription

Metadata:
- Dependencies: None (Foundation task)
- Provides: `libs/db/src/repositories/bot-users.repository.ts` - findWithoutSubscription, countWithoutSubscription
- Size: Small (1 file)
- Phase: 2 - Repository Layer
- Verification Level: L3 (Build Success)
- Acceptance Criteria: Foundation for AC3 (Without subscription option), AC6 (Without subscription broadcast)

## Implementation Content

Add data layer foundation for targeting users who have never activated any subscription. This involves:
1. Adding `findWithoutSubscription(botId: number)` method
2. Adding `countWithoutSubscription(botId: number)` method (optimized count query)

These methods use LEFT JOIN with exclusion pattern to find bot users who have NO records in user_subscriptions table.

## Target Files

- [ ] `libs/db/src/repositories/bot-users.repository.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [ ] Review existing repository methods for pattern reference
- [ ] Understand bot_users and user_subscriptions table relationship
- [ ] Identify existing import for user_subscriptions table
- [ ] No failing tests for L3 verification (type definitions only)

### 2. Green Phase

- [ ] Add `findWithoutSubscription` method:
  ```typescript
  /**
   * Find bot users who have no records in user_subscriptions table
   * Used for targeting users who never activated any subscription
   * @param botId - The bot ID to filter by
   * @returns Array of bot users without any subscription record
   */
  async findWithoutSubscription(botId: number): Promise<Array<{ botUser: BotUser }>> {
    return this.db
      .select({ botUser: botUsers })
      .from(botUsers)
      .leftJoin(userSubscriptions, eq(botUsers.id, userSubscriptions.botUserId))
      .where(
        and(
          eq(botUsers.botId, botId),
          eq(botUsers.isActive, true),
          isNull(userSubscriptions.id)
        )
      );
  }
  ```

- [ ] Add `countWithoutSubscription` method (optimized count):
  ```typescript
  /**
   * Count bot users who have no records in user_subscriptions table
   * @param botId - The bot ID to filter by
   * @returns Count of bot users without any subscription record
   */
  async countWithoutSubscription(botId: number): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(botUsers)
      .leftJoin(userSubscriptions, eq(botUsers.id, userSubscriptions.botUserId))
      .where(
        and(
          eq(botUsers.botId, botId),
          eq(botUsers.isActive, true),
          isNull(userSubscriptions.id)
        )
      );
    return result[0]?.count ?? 0;
  }
  ```

- [ ] Add required imports if not present:
  ```typescript
  import { isNull, sql } from 'drizzle-orm';
  import { userSubscriptions } from '../schemas';
  ```

- [ ] Run type check to verify build succeeds

### 3. Refactor Phase

- [ ] Ensure method signatures match existing repository patterns
- [ ] Verify JSDoc comments are accurate and complete
- [ ] Confirm type check passes

## Expected Method Signatures

```typescript
// In BotUsersRepository class

/**
 * Find bot users who have no records in user_subscriptions table
 */
async findWithoutSubscription(botId: number): Promise<Array<{ botUser: BotUser }>>

/**
 * Count bot users who have no records in user_subscriptions table
 */
async countWithoutSubscription(botId: number): Promise<number>
```

## SQL Pattern Explanation

The LEFT JOIN exclusion pattern:
```sql
SELECT bot_users.*
FROM bot_users
LEFT JOIN user_subscriptions ON bot_users.id = user_subscriptions.bot_user_id
WHERE bot_users.bot_id = ?
  AND bot_users.is_active = true
  AND user_subscriptions.id IS NULL
```

This returns only bot_users rows that have NO matching row in user_subscriptions.

## Completion Criteria

- [ ] `findWithoutSubscription` method added with correct signature
- [ ] `countWithoutSubscription` method added with correct signature
- [ ] Methods use LEFT JOIN with IS NULL exclusion pattern
- [ ] Filter by botId and isActive = true applied
- [ ] Build succeeds without errors (`pnpm build`)
- [ ] Type check passes (`pnpm typecheck`)

## Operational Verification Procedures

1. Run type check to verify compilation:
   ```bash
   pnpm typecheck
   ```

2. Run build to verify no errors:
   ```bash
   pnpm build
   ```

3. Optional: Manual database query test
   ```sql
   -- Verify pattern returns expected results
   SELECT COUNT(*) FROM bot_users bu
   LEFT JOIN user_subscriptions us ON bu.id = us.bot_user_id
   WHERE bu.bot_id = 1 AND bu.is_active = true AND us.id IS NULL;
   ```

## Quality Check Commands

```bash
pnpm typecheck
pnpm build
```

## Notes

- **Impact scope**: Only bot-users.repository.ts modified
- **Constraints**: Must use existing drizzle-orm patterns
- **Performance**: LEFT JOIN with IS NULL is efficient for this use case
- **Index consideration**: If slow, consider index on user_subscriptions(bot_user_id)
