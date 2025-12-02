# Task: Review ReminderSchedulerService - No Changes Required

Metadata:
- Phase: 4 (Service Updates)
- Dependencies: Task 08
- Provides: Verification that service works correctly with new schema
- Size: Small (1 file - review only)

## Implementation Content
Review `ReminderSchedulerService` to verify it works correctly with the new `botUserId` column. Based on analysis of the current implementation, **no changes are required** because:

1. `findExpiredTrials(botId)` already filters by `botId` directly
2. The service queries by `botId`, not by user identity
3. User information is obtained through joins, not direct `userId` queries

## Target Files
- [ ] `libs/partner-bot/src/services/reminder-scheduler.service.ts` (review only)

## Implementation Steps

### 1. Verify Current Implementation
- [ ] Review `processExpiredTrials(botId)` method
- [ ] Confirm `findExpiredTrials(botId)` uses correct join pattern
- [ ] Verify user data is obtained through joins

### 2. Analyze Repository Method
- [ ] `findExpiredTrials(botId)` in `UserSubscriptionsRepository`:
  ```typescript
  // Current implementation:
  const result = await this.db
    .select({
      user: users,
      userSubscription: this.table,
    })
    .from(this.table)
    .innerJoin(users, eq(this.table.userId, users.telegramId)) // Join via userId
    .where(
      and(
        eq(this.table.botId, botId), // Filter by botId
        eq(this.table.isActive, false),
        sql`${this.table.expiresAt} IS NOT NULL`,
        sql`${this.table.expiresAt} < ${now}`,
        eq(users.isActive, true),
      ),
    );
  ```

### 3. Verify No Changes Needed
- [ ] The `botId` filter already provides per-bot scoping
- [ ] Join via `userId` to `users.telegramId` still works (column preserved)
- [ ] User language (`user.lang`) is obtained through the join
- [ ] Message sending uses `user.telegramId` for chat ID

## Current Implementation Analysis

```typescript
// ReminderSchedulerService.processExpiredTrials(botId):
const expiredTrials = await this.userSubscriptionsRepository.findExpiredTrials(botId);

// For each expired trial:
for (const { user } of expiredTrials) {
  const message = await this.botMessagesRepository.resolveMessage(
    botId,
    'partner_trial_expired',
    user.lang ?? 'en', // User language from join
  );

  await botInstance.bot.telegram.sendMessage(user.telegramId, message, {
    // ...
  });
}
```

## Why No Changes Needed
1. **Already per-bot scoped**: Filters by `botId` in `findExpiredTrials(botId)`
2. **Join pattern works**: `userId` column preserved for backward compatibility
3. **No direct userId lookups**: User data obtained through joins
4. **Message routing correct**: Uses `user.telegramId` for sending messages

## Future Consideration (Not in Scope)
In a future optimization, `findExpiredTrials` could be updated to:
- Query via `botUserId` instead of `botId` (cleaner data model)
- Join through `bot_users` table for consistency

For now, the current implementation is functionally correct.

## Completion Criteria
- [ ] Verified `findExpiredTrials(botId)` uses correct join pattern
- [ ] Verified service correctly processes per-bot expired trials
- [ ] **AC-4.4**: `ReminderSchedulerService.findExpiredTrials()` works correctly (no changes needed)
- [ ] Build passes: `npm run build`

## Verification Commands
```bash
# Build check (ensures service compiles)
npm run build

# Run any existing service tests
npm test -- --testPathPattern=reminder-scheduler
```

## Notes
- Impact scope: Review only, no code changes
- The service continues to work because:
  - `botId` filter provides per-bot scoping
  - `userId` column is preserved for join compatibility
  - Query pattern (botId filter + user join) is functionally correct
- The `botUserId` column is not directly used but the `botId` filter achieves similar per-bot scoping
- Future optimization could refactor to use `botUserId` for cleaner data model
