# Task: Run drizzle-kit migrate

Metadata:
- Phase: 2 (Generate and Apply Migration)
- Dependencies: Task 2.3 (migration file complete with manual SQL)
- Provides: Database schema updated
- Size: Small (command execution)
- Verification Level: L2 (Migration applies successfully)

## Implementation Content

Apply the migration to the database using drizzle-kit migrate. This creates the new tables and modifies existing ones.

## Prerequisites
- [x] Task 2.3 complete (manual SQL added)
- [x] Database connection configured (DATABASE_URL)
- [x] Database accessible
- [x] **BACKUP**: Consider backing up database before migration

## Implementation Steps

### 1. Verify Prerequisites
- [x] Confirm DATABASE_URL is set correctly
- [x] Confirm database is accessible
- [x] Confirm migration file is complete (Task 2.3)

### 2. Run drizzle-kit migrate
```bash
pnpm drizzle-kit migrate
```

### 3. Monitor Output
- [x] Watch for any errors during migration
- [x] Note any warnings
- [x] Verify completion message

### 4. Verify Migration Recorded
- [x] Check that migration is recorded in drizzle migrations table
- [x] Migration should show as applied

### 5. Handle Errors (if any)
If migration fails:
1. Read error message carefully
2. Check database connection
3. Check for conflicting constraints
4. Check for missing dependencies (e.g., users table must exist)
5. May need to rollback and fix issues

## Expected Output

```
Migration completed successfully.
Applied migration: XXXX_*.sql
```

## Completion Criteria
- [x] drizzle-kit migrate command completes without errors
- [x] Migration recorded in drizzle migrations table
- [x] No database errors

## Rollback Procedure

If migration fails or causes issues:

1. **Drizzle rollback** (if supported):
   ```bash
   pnpm drizzle-kit rollback
   ```

2. **Manual rollback** (if needed):
   ```sql
   -- Drop new tables
   DROP TABLE IF EXISTS bot_messages;
   DROP TABLE IF EXISTS bot_users;
   DROP TABLE IF EXISTS bot_settings;
   DROP TABLE IF EXISTS bots;

   -- Remove new columns
   ALTER TABLE user_subscriptions DROP COLUMN IF EXISTS bot_id;
   ALTER TABLE renewal_tariffs DROP COLUMN IF EXISTS bot_id;
   ALTER TABLE codes DROP COLUMN IF EXISTS bot_id;

   -- Remove migration record
   DELETE FROM drizzle_migrations WHERE name = 'XXXX_*';
   ```

## Notes
- Impact scope: Database schema
- Constraints: Irreversible in production without backup
- Timing: Run during maintenance window if production

## Troubleshooting

**Error: FK constraint violation**
- Ensure bots table is created before other tables
- Check migration order

**Error: Table already exists**
- Migration may have partially applied
- Check which objects exist and manually reconcile

**Error: Permission denied**
- Check database user permissions
- Ensure user can CREATE/ALTER tables
