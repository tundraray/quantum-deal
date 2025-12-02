# Task: Generate Migration SQL via drizzle-kit

Metadata:
- Phase: 2 (Migration SQL Generation)
- Dependencies: Task 01 (Schema Changes)
- Provides: `libs/db/migrations/[timestamp]_user_subscriptions_bot_user_id.sql`
- Size: Small (1 file generated)

## Implementation Content
Generate the base migration SQL file using `drizzle-kit generate`. This will create the migration file with the column addition and index creation statements based on the schema changes from Task 01.

**Critical Constraint**: `drizzle-kit generate` CAN be executed by automation. `drizzle-kit migrate` CANNOT be executed by automation (user runs manually).

## Target Files
- [ ] `libs/db/migrations/[timestamp]_user_subscriptions_bot_user_id.sql` (generated)

## Implementation Steps

### 1. Verify Prerequisites
- [ ] Task 01 completed (schema updated)
- [ ] Build passes: `npm run build`

### 2. Generate Migration
- [ ] Run drizzle-kit generate:
  ```bash
  pnpm drizzle-kit generate
  ```
- [ ] Verify migration file created in `libs/db/migrations/`
- [ ] Note the generated timestamp filename

### 3. Review Generated SQL
- [ ] Open generated migration file
- [ ] Verify it contains:
  - `ALTER TABLE user_subscriptions ADD COLUMN bot_user_id BIGINT`
  - FK constraint to `bot_users(id)` with CASCADE delete
  - Index creation `idx_user_subscriptions_bot_user`
- [ ] Note: The generated SQL will be basic - enhancement needed in Task 03

## Expected Generated SQL (Approximate)
```sql
ALTER TABLE "user_subscriptions" ADD COLUMN "bot_user_id" bigint;

ALTER TABLE "user_subscriptions"
ADD CONSTRAINT "user_subscriptions_bot_user_id_bot_users_id_fk"
FOREIGN KEY ("bot_user_id")
REFERENCES "public"."bot_users"("id")
ON DELETE cascade
ON UPDATE no action;

CREATE INDEX "idx_user_subscriptions_bot_user"
ON "user_subscriptions" USING btree ("bot_user_id");
```

## Completion Criteria
- [ ] Migration SQL file generated in `libs/db/migrations/`
- [ ] File contains column addition statement
- [ ] File contains FK constraint (may need adjustment in Task 03)
- [ ] File contains index creation statement
- [ ] Operation verified: Migration file exists and is syntactically valid

## Verification Commands
```bash
# Generate migration
pnpm drizzle-kit generate

# List migration files to verify creation
ls libs/db/migrations/*.sql | tail -1
```

## Notes
- Impact scope: Migration file creation only (no database changes)
- Constraints: Do NOT run `drizzle-kit migrate` - user will run manually
- The generated migration will need enhancement in Task 03 for:
  - Orphan record handling
  - Data population from existing records
  - Prerequisite check comment
- Generated filename will have timestamp prefix (e.g., `20251202153614_...`)
