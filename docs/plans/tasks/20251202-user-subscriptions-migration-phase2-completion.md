# Phase 2 Completion Verification: Migration SQL Generation

Metadata:
- Phase: 2 (Migration SQL Generation)
- Dependencies: Phase 1, Tasks 02-03
- Verification Level: L1 (Functional Operation)

## Purpose
Verify Phase 2 (Migration SQL Generation) is complete and ready for Phase 3 (Repository Updates).

**Note**: This phase generates migration SQL but does NOT execute it. User will run `drizzle-kit migrate` manually.

## Completion Checklist

### Task Completion
- [ ] Task 02: Generate Migration SQL via drizzle-kit
- [ ] Task 03: Enhance Migration SQL with Data Population and Orphan Handling

### Acceptance Criteria Verification (Pre-execution)
- [ ] **AC-2.4**: Migration SQL is idempotent (uses `IF NOT EXISTS` where applicable)
- [ ] **AC-2.5**: Prerequisite seed migration documented in SQL comments

### Migration SQL Content Verification
- [ ] Migration file exists in `libs/db/migrations/`
- [ ] File contains phased structure:
  - Phase 1: Add nullable column
  - Phase 2: Create missing bot_users (orphan handling)
  - Phase 3: Populate bot_user_id
  - Phase 4: Add FK constraint
  - Phase 5: Create index
  - Phase 6: (Commented) Make NOT NULL
- [ ] Prerequisite comment present at top
- [ ] Verification queries included as comments

### Quality Checks
- [ ] SQL syntax is valid
- [ ] FK constraint references correct table (`bot_users.id`)
- [ ] Index name is correct (`idx_user_subscriptions_bot_user`)

## Migration SQL Structure Verification
```sql
-- Expected structure in migration file:

-- 1. Header comment with prerequisite
-- Migration: Add botUserId to user_subscriptions
-- Prerequisite: Ensure 20251126200000_seed_default_bot.sql has been executed

-- 2. Phase 1: Add column
ALTER TABLE "user_subscriptions" ADD COLUMN "bot_user_id" bigint;

-- 3. Phase 2: Orphan handling
INSERT INTO bot_users ...

-- 4. Phase 3: Data population
UPDATE user_subscriptions us SET bot_user_id = bu.id ...

-- 5. Phase 4: FK constraint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT ...

-- 6. Phase 5: Index
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_bot_user" ...

-- 7. Verification queries (commented)
```

## User Action Required
After Phase 2 completion, user must manually execute migration:
```bash
# User runs this command (NOT automated)
pnpm drizzle-kit migrate
```

## Post-Migration Verification (User Performs)
```sql
-- Run these queries after migration to verify success:

-- Verify no NULL bot_user_id (except legacy without botId)
SELECT COUNT(*) FROM user_subscriptions WHERE bot_user_id IS NULL AND bot_id IS NOT NULL;
-- Expected: 0

-- Verify FK integrity
SELECT COUNT(*) FROM user_subscriptions us
LEFT JOIN bot_users bu ON us.bot_user_id = bu.id
WHERE us.bot_user_id IS NOT NULL AND bu.id IS NULL;
-- Expected: 0
```

## Acceptance Criteria Verification (Post-execution by User)
After user runs migration:
- [ ] **AC-1.1**: `user_subscriptions.botUserId` column exists in database
- [ ] **AC-1.2**: Foreign key constraint references `bot_users.id` with CASCADE delete
- [ ] **AC-1.3**: Index `idx_user_subscriptions_bot_user` exists on `botUserId`
- [ ] **AC-2.1**: All existing subscriptions have non-null `botUserId` values
- [ ] **AC-2.2**: Orphaned subscriptions have corresponding `bot_users` records created
- [ ] **AC-2.3**: `botUserId` values correctly map to existing `bot_users(userId, botId)` pairs

## Next Phase
After Phase 2 completion AND user has run migration, proceed to Phase 3 (Repository Updates):
- Task 04: Add Repository botUserId Methods
- Task 05: Deprecate Repository userId Methods
- Task 06: Update Repository Tests
