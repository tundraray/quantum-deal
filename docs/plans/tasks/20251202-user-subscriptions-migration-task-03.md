# Task: Enhance Migration SQL with Data Population and Orphan Handling

Metadata:
- Phase: 2 (Migration SQL Generation)
- Dependencies: Task 02 (Generated Migration SQL)
- Provides: Complete migration SQL with data migration logic
- Size: Small (1 file)

## Implementation Content
Enhance the drizzle-kit generated migration SQL to include:
1. Phase-based migration steps
2. Orphan record handling (create missing `bot_users`)
3. Data population (populate `bot_user_id` from existing records)
4. Prerequisite verification comment

**Critical Constraint**: This task modifies the migration SQL file. Do NOT execute `drizzle-kit migrate`.

## Target Files
- [ ] `libs/db/migrations/[timestamp]_user_subscriptions_bot_user_id.sql` (modify)

## Implementation Steps

### 1. Verify Prerequisites
- [ ] Task 02 completed (migration SQL generated)
- [ ] Note the migration file path from Task 02

### 2. Restructure Migration SQL
- [ ] Open the generated migration file
- [ ] Restructure into phased approach with comments
- [ ] Ensure FK constraint is added AFTER data population

### 3. Add Orphan Handling
- [ ] Add SQL to create missing `bot_users` records:
  ```sql
  -- Phase 2: Create missing bot_users for orphaned subscriptions
  INSERT INTO bot_users (user_id, bot_id, is_active, created_at, updated_at)
  SELECT DISTINCT us.user_id, us.bot_id, true, NOW(), NOW()
  FROM user_subscriptions us
  LEFT JOIN bot_users bu ON bu.user_id = us.user_id AND bu.bot_id = us.bot_id
  WHERE bu.id IS NULL AND us.bot_id IS NOT NULL;
  ```

### 4. Add Data Population
- [ ] Add SQL to populate `bot_user_id` from existing records:
  ```sql
  -- Phase 3: Populate bot_user_id from bot_users
  UPDATE user_subscriptions us
  SET bot_user_id = bu.id
  FROM bot_users bu
  WHERE us.user_id = bu.user_id AND us.bot_id = bu.bot_id;
  ```

### 5. Add Prerequisite Comment
- [ ] Add comment at top of file documenting prerequisite seed migration

## Expected Final Migration SQL

```sql
-- Migration: Add botUserId to user_subscriptions
-- ADR-009: User Subscriptions Migration from users to bot_users
-- Prerequisite: Ensure 20251126200000_seed_default_bot.sql has been executed

-- Phase 1: Add nullable column
ALTER TABLE "user_subscriptions" ADD COLUMN "bot_user_id" bigint;

-- Phase 2: Create missing bot_users for orphaned subscriptions
-- This handles subscriptions where no bot_users record exists for the (userId, botId) pair
INSERT INTO bot_users (user_id, bot_id, is_active, created_at, updated_at)
SELECT DISTINCT us.user_id, us.bot_id, true, NOW(), NOW()
FROM user_subscriptions us
LEFT JOIN bot_users bu ON bu.user_id = us.user_id AND bu.bot_id = us.bot_id
WHERE bu.id IS NULL AND us.bot_id IS NOT NULL;

-- Phase 3: Populate bot_user_id from bot_users
UPDATE user_subscriptions us
SET bot_user_id = bu.id
FROM bot_users bu
WHERE us.user_id = bu.user_id AND us.bot_id = bu.bot_id;

-- Phase 4: Add FK constraint (after data is populated)
ALTER TABLE "user_subscriptions"
ADD CONSTRAINT "user_subscriptions_bot_user_id_bot_users_id_fk"
FOREIGN KEY ("bot_user_id")
REFERENCES "public"."bot_users"("id")
ON DELETE cascade
ON UPDATE no action;

-- Phase 5: Create index for query performance
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_bot_user"
ON "user_subscriptions" USING btree ("bot_user_id");

-- Phase 6: Make NOT NULL (optional - run after verification)
-- Uncomment after verifying all records have bot_user_id populated:
-- ALTER TABLE "user_subscriptions" ALTER COLUMN "bot_user_id" SET NOT NULL;

-- Verification queries (run after migration):
-- SELECT COUNT(*) FROM user_subscriptions WHERE bot_user_id IS NULL AND bot_id IS NOT NULL;
-- Expected: 0
--
-- SELECT COUNT(*) FROM user_subscriptions us
-- LEFT JOIN bot_users bu ON us.bot_user_id = bu.id
-- WHERE us.bot_user_id IS NOT NULL AND bu.id IS NULL;
-- Expected: 0
```

## Completion Criteria
- [ ] Migration SQL has phased structure with comments
- [ ] Orphan handling SQL added (create missing `bot_users`)
- [ ] Data population SQL added (populate `bot_user_id`)
- [ ] Prerequisite comment added at top of file
- [ ] FK constraint added AFTER data population
- [ ] Verification queries included as comments
- [ ] **AC-2.1**: Migration handles all existing subscriptions
- [ ] **AC-2.2**: Orphaned subscriptions get `bot_users` records created
- [ ] **AC-2.3**: `botUserId` mapping logic is correct
- [ ] **AC-2.4**: Migration is idempotent (CREATE INDEX IF NOT EXISTS)
- [ ] **AC-2.5**: Prerequisite seed migration documented

## Verification (Manual by User)
After user runs `drizzle-kit migrate`:
```sql
-- Verify no NULL bot_user_id (except legacy without botId)
SELECT COUNT(*) FROM user_subscriptions WHERE bot_user_id IS NULL AND bot_id IS NOT NULL;
-- Expected: 0

-- Verify FK integrity
SELECT COUNT(*) FROM user_subscriptions us
LEFT JOIN bot_users bu ON us.bot_user_id = bu.id
WHERE us.bot_user_id IS NOT NULL AND bu.id IS NULL;
-- Expected: 0
```

## Notes
- Impact scope: Migration SQL file only (no database changes until user runs migration)
- Constraints: Do NOT run `drizzle-kit migrate`
- The NOT NULL constraint in Phase 6 is commented out - user should uncomment after verifying data
- Phase 2 (orphan handling) is critical for data integrity
- FK constraint must be added AFTER data population to avoid constraint violations
