# Task: Add UserSubscriptionsRepository Methods for Reminder Tracking

Metadata:
- Dependencies: Phase 1 completion (database infrastructure)
- Provides: Extended UserSubscriptionsRepository with reminder methods
- Size: Small (1 file)

## Implementation Content

Add methods to UserSubscriptionsRepository to support reminder scheduler: query expired trials and update reminder timestamps.

**Reference dependency deliverables:** Phase 1 provides database infrastructure and repository patterns

## Target Files

- [x] `libs/db/src/repositories/user-subscriptions.repository.ts`
- [x] `libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Verify Phase 1 completion
- [x] Review existing UserSubscriptionsRepository implementation
- [x] Create/extend test file `libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts`
- [x] Write failing tests for findExpiredTrials():
  - Queries user_subscriptions WHERE bot_id=? AND is_active=false AND expires_at < NOW()
  - Returns array of objects with user and userSubscription
  - Includes user language for message resolution
- [x] Run tests and confirm failure

### 2. Green Phase
- [x] Extend `libs/db/src/repositories/user-subscriptions.repository.ts`
- [x] Add method findExpiredTrials(botId: number): Promise<Array<{user, userSubscription}>>:
  - SQL: `SELECT * FROM user_subscriptions JOIN users WHERE bot_id=? AND is_active=false AND expires_at < NOW()`
  - Use Drizzle ORM query builder
  - Return mapped objects with user and userSubscription
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase
- [x] Add JSDoc comments to new methods
- [x] Ensure consistent error handling
- [x] Confirm added tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L2: Methods work correctly, queries return expected results)
- [x] findExpiredTrials() returns correct expired users
- [x] Simplified implementation (no timestamp tracking per user decision)

## Notes

**Impact Scope:**
- Used by ReminderSchedulerService (Task 3.1)
- Required for Phase 3 completion

**Constraints:**
- Do not modify existing repository methods
- Follow existing repository patterns (Drizzle ORM)
- Add database indexes if needed for performance

**Query Performance:**
Consider adding composite index on (bot_id, status, subscription_type) if not exists

**UserSubscription Schema:**
Ensure last_reminder_sent field exists in user_subscriptions table (may need migration if not present)
