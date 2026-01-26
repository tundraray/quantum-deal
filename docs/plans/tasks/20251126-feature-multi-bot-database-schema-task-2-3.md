# Task: Add Manual SQL to Migration

Metadata:
- Phase: 2 (Generate and Apply Migration)
- Dependencies: Task 2.2 (review complete)
- Provides: Complete migration file with manual additions
- Size: Small (1 file modification)
- Verification Level: L3 (Manual SQL added correctly)

## Implementation Content

Add manual SQL that Drizzle cannot generate automatically, specifically the partial unique index for user_subscriptions (FR-012).

## Target Files
- [x] `drizzle/migrations/XXXX_*.sql` (modify generated file)

## Implementation Steps

### 1. Open Migration File
- [x] Open the migration file from Task 2.1
- [x] Scroll to the end of the file

### 2. Add Partial Unique Index (FR-012)

Add the following SQL at the end of the migration file:

```sql
-- ============================================================
-- MANUAL ADDITIONS (Drizzle cannot generate these automatically)
-- ============================================================

-- FR-012: Partial unique index - prevents duplicate active subscriptions per user+subscription+bot
-- This allows historical records (is_active = false) to have duplicates
-- while ensuring only one active subscription per user+subscription+bot combination
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_subscriptions_active
  ON user_subscriptions(user_id, subscription_id, bot_id)
  WHERE is_active = true;
```

### 3. Add Comments for Clarity
- [x] Add header comment explaining manual additions
- [x] Add detailed comment explaining the partial unique index purpose

### 4. Verify SQL Syntax
- [x] Check for syntax errors
- [x] Ensure IF NOT EXISTS for idempotency
- [x] Verify column names match schema (user_id, subscription_id, bot_id)

### 5. (Optional) Add Additional Manual SQL

If review in Task 2.2 identified other missing elements, add them here:

```sql
-- Add any other custom constraints or indexes here
-- Example: Additional partial indexes, custom check constraints, etc.
```

## Reference Implementation

From Work Plan - Manual SQL Additions Required:
```sql
-- FR-012: Partial unique index - prevents duplicate active subscriptions per user+subscription+bot
-- Drizzle cannot generate this automatically
CREATE UNIQUE INDEX uq_user_subscriptions_active
  ON user_subscriptions(user_id, subscription_id, bot_id)
  WHERE is_active = true;
```

## Completion Criteria
- [x] Partial unique index SQL added to migration file
- [x] SQL syntax is correct
- [x] Comments explain the purpose of manual additions
- [x] File saved

## Verification

After migration is applied (Task 2.4), verify the index exists:
```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE indexname = 'uq_user_subscriptions_active';
```

## Notes
- Impact scope: Migration file only
- Constraints: Must add BEFORE running drizzle-kit migrate
- Why manual: Drizzle ORM does not support partial indexes declaratively
- The WHERE clause limits the unique constraint to active records only

## Important Considerations

1. **Idempotency**: Use IF NOT EXISTS to allow re-running if needed
2. **Order**: Add after all Drizzle-generated SQL
3. **Separation**: Keep manual SQL clearly separated with comments
4. **Documentation**: Future maintainers need to understand why this is manual
