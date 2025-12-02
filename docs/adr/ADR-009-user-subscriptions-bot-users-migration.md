# ADR-009: User Subscriptions Migration from users to bot_users

## Status

Proposed

## Context

The Quantum Deal platform implements a multi-bot architecture (ADR-004) where each Telegram user can interact with multiple bots independently. The current subscription system uses `user_subscriptions.userId` referencing `users.telegramId` as the foreign key. This design has architectural limitations for multi-bot support:

### Current State

```
users (telegramId: PK)
    ^
    |-- user_subscriptions.userId (FK)
    |
bot_users (id: PK, userId: FK -> users.telegramId, botId: FK -> bots.id)
```

**Problem**: Subscriptions are tied to global user identity (`users.telegramId`) rather than the bot-specific user context (`bot_users.id`). This creates several issues:

1. **No Per-Bot Subscription Isolation**: A user's subscription history is global, making it impossible to have independent subscription lifecycles per bot
2. **Trial Eligibility Logic Flaw**: `TrialService.isEligible()` checks for ANY subscription history across ALL bots, preventing trial access on new bots
3. **Subscription Queries Require Join**: To get bot-specific subscriptions, queries must join through `bot_users` adding complexity
4. **Inconsistent Data Model**: `bot_users` represents per-bot user context, but subscriptions don't follow this pattern

### Desired State

```
bot_users (id: PK, userId: FK -> users.telegramId, botId: FK -> bots.id)
    ^
    |-- user_subscriptions.botUserId (FK)
```

**Solution**: Reference `bot_users.id` directly, aligning subscriptions with the per-bot user model established in ADR-004.

### Technical Context

- **Database**: PostgreSQL with Drizzle ORM
- **Scale**: Large (12-15 files affected)
- **Affected Components**:
  - Schema: `user-subscriptions.ts`
  - Repository: `user-subscriptions.repository.ts`
  - Services: `subscription-expiration.service.ts`, `trial.service.ts`, `reminder-scheduler.service.ts`
  - Middleware: `user-management.middleware.ts` (both bot and partner-bot)

### Constraints

- Production system with existing data
- Downtime acceptable (single-developer project)
- Bot context (`botId`) always available in middleware

### Related Documents

- **ADR-004**: Multi-Bot Database Architecture (defines `bot_users` table)
- **ADR-008**: Partner Bot Flow Architecture (uses `user_subscriptions`)

---

## Decisions

This ADR documents three key migration decisions:

1. [Column Strategy](#decision-1-column-strategy)
2. [Orphaned Records Handling](#decision-2-orphaned-records-handling)
3. [Migration Approach](#decision-3-migration-approach)

---

## Decision 1: Column Strategy

### Selected Option: Add New Column, Deprecate Old Column (Option B)

Add new `botUserId` column referencing `bot_users.id`, populate it for all existing records, then deprecate (not remove) the old `userId` column.

### Options Considered

#### Option A: In-Place Column Modification

**Overview**: Rename `userId` to `botUserId` and change the foreign key target from `users.telegramId` to `bot_users.id`.

**Migration Steps**:
1. Drop existing `userId` foreign key constraint
2. Rename column `user_id` to `bot_user_id`
3. Update all values to corresponding `bot_users.id`
4. Add new foreign key constraint to `bot_users.id`

**Pros**:
- Single column (cleaner schema)
- No deprecated columns to maintain
- Minimal schema change

**Cons**:
- **Data loss risk**: If mapping fails, original `userId` is lost
- **No rollback path**: Cannot easily revert without backup restoration
- **Breaking change**: All existing code breaks immediately
- **Requires perfect data**: Every `userId` must have a `bot_users` record

**Effort**: 2 days

---

#### Option B (Selected): Add New Column, Deprecate Old Column

**Overview**: Add `botUserId` column alongside existing `userId`, populate with mapped values, maintain both during transition, deprecate `userId` after full migration.

**Migration Steps**:
1. Add new nullable `bot_user_id` column with FK to `bot_users.id`
2. Auto-create missing `bot_users` records (Decision 2)
3. Populate `bot_user_id` for all existing subscriptions
4. Make `bot_user_id` NOT NULL after population
5. Update application code to use `botUserId`
6. Mark `userId` as deprecated (keep for audit/rollback)
7. Remove `userId` in future cleanup migration

**Schema Evolution**:
```typescript
// Phase 1: Add column (nullable)
botUserId: bigint('bot_user_id', { mode: 'number' })
  .references(() => botUsers.id, { onDelete: 'cascade' })

// Phase 2: After data migration (not null)
botUserId: bigint('bot_user_id', { mode: 'number' })
  .notNull()
  .references(() => botUsers.id, { onDelete: 'cascade' })

// Deprecated (kept for rollback capability)
userId: bigint('user_id', { mode: 'number' })
  .references(() => users.telegramId, { onDelete: 'cascade' })
  // @deprecated - Use botUserId. Will be removed in future migration.
```

**Pros**:
- **Rollback capability**: Original `userId` preserved, can revert if issues
- **Gradual migration**: Application code can be updated incrementally
- **Data safety**: No data loss during migration
- **Audit trail**: Historical reference to original user mapping
- **Testing friendly**: Can validate `botUserId` against `userId` during transition

**Cons**:
- Temporary schema bloat (two columns for same purpose)
- Must maintain deprecated column until cleanup
- Extra storage (negligible for subscription counts)

**Effort**: 3 days

---

#### Option C: Create New Table

**Overview**: Create `bot_user_subscriptions` table with new schema, migrate data, deprecate old table.

**Pros**:
- Clean slate design
- No legacy constraints
- Can redesign structure

**Cons**:
- **Over-engineering**: Problem is just FK target change
- **Duplicate structures**: Two subscription tables during transition
- **Complex migration**: Must update all code to new table name
- **Repository rewrite**: Complete repository replacement needed

**Effort**: 5 days

---

### Comparison Matrix

| Evaluation Axis | Option A | Option B (Selected) | Option C |
|-----------------|----------|---------------------|----------|
| Data Safety | Low | High | High |
| Rollback Capability | None | Full | Full |
| Schema Cleanliness | Best | Good | Best |
| Migration Complexity | Medium | Medium | High |
| Code Change Scope | Large | Medium | Largest |
| Future Maintenance | Low | Medium (temp) | Low |

### Rationale

**Option B** is selected for the following reasons:

1. **Data Safety**: Preserving `userId` ensures no data loss during migration. If `bot_users` mapping is incorrect, original data remains intact.

2. **Rollback Capability**: Can revert to `userId` if critical issues discovered post-migration. Essential for production systems.

3. **Gradual Migration**: Application code can be updated file-by-file while both columns exist, reducing risk of cascading failures.

4. **Validation Period**: Can run parallel queries using both columns to validate mapping correctness before deprecating `userId`.

5. **Follows PostgreSQL Best Practices**: Adding columns is a non-blocking operation in PostgreSQL, and deprecation over deletion is standard practice for foreign key migrations ([PostgreSQL Migration Best Practices](https://www.heroku.com/blog/planning-your-postgresql-migration/)).

---

## Decision 2: Orphaned Records Handling

### Selected Option: Auto-Create bot_users Records (Option A)

Automatically create `bot_users` records for existing subscriptions that don't have one, using the subscription's `botId`.

### Options Considered

#### Option A (Selected): Auto-Create bot_users Records

**Overview**: During migration, for each `user_subscriptions` record where no corresponding `bot_users(userId, botId)` exists, auto-create the `bot_users` record.

**Migration SQL**:
```sql
-- Create missing bot_users records
INSERT INTO bot_users (user_id, bot_id, is_active, created_at, updated_at)
SELECT DISTINCT
  us.user_id,
  us.bot_id,
  true,
  NOW(),
  NOW()
FROM user_subscriptions us
LEFT JOIN bot_users bu ON bu.user_id = us.user_id AND bu.bot_id = us.bot_id
WHERE bu.id IS NULL AND us.bot_id IS NOT NULL;

-- Populate bot_user_id from newly created or existing bot_users
UPDATE user_subscriptions us
SET bot_user_id = bu.id
FROM bot_users bu
WHERE us.user_id = bu.user_id
  AND us.bot_id = bu.bot_id;
```

**Pros**:
- **No data loss**: All existing subscriptions get valid `botUserId`
- **Automatic**: No manual intervention required
- **Consistent state**: All subscriptions have matching `bot_users` records
- **Handles legacy data**: Works for subscriptions created before multi-bot architecture

**Cons**:
- Creates `bot_users` records that may never have interacted with bot
- Default values used for `lang`, `preferences`, `state` (NULL is acceptable)
- Slight data model impurity (bot_users created from subscription, not user interaction)

**Effort**: 0.5 days (SQL script)

---

#### Option B: Delete Orphaned Subscriptions

**Overview**: Delete subscriptions that can't be mapped to existing `bot_users` records.

**Cons**:
- **Data loss**: Legitimate subscriptions deleted
- **User impact**: Users lose subscription access
- **Irreversible**: Cannot recover deleted subscriptions
- **Business impact**: Paid subscriptions could be lost

**Effort**: 0.5 days

---

#### Option C: Manual Resolution

**Overview**: Flag orphaned records for manual review and resolution.

**Cons**:
- **Time-consuming**: Manual review of each orphaned record
- **Blocks migration**: Cannot complete until all resolved
- **Error-prone**: Manual decisions may be inconsistent
- **Not scalable**: Impractical for large datasets

**Effort**: Variable (depends on orphan count)

---

### Comparison Matrix

| Evaluation Axis | Option A (Selected) | Option B | Option C |
|-----------------|---------------------|----------|----------|
| Data Preservation | Full | None | Full |
| Automation | Full | Full | None |
| User Impact | None | High (loss) | None |
| Migration Speed | Fast | Fast | Slow |
| Data Model Purity | Slightly impure | Pure | Pure |

### Rationale

**Option A** is selected because:

1. **Zero Data Loss**: Every existing subscription is preserved and mapped.

2. **Automation**: Migration script handles all cases without manual intervention.

3. **Acceptable Trade-off**: Creating `bot_users` records from subscriptions is a minor data model impurity. These records will be updated with proper data when users next interact with the bot.

4. **Consistency**: Ensures all `user_subscriptions` records can be successfully mapped to `bot_users.id`.

---

## Decision 3: Migration Approach

### Selected Option: Big-Bang Migration (Option A)

Perform migration in a single maintenance window with application downtime.

### Options Considered

#### Option A (Selected): Big-Bang Migration

**Overview**: Schedule maintenance window, stop application, run migration script, update code, restart application.

**Migration Plan**:
```
1. Announce maintenance window (30 minutes)
2. Stop application (webhook processing stops)
3. Create database backup
4. Run migration script:
   a. Add bot_user_id column (nullable)
   b. Create missing bot_users records
   c. Populate bot_user_id values
   d. Add NOT NULL constraint
   e. Create index on bot_user_id
5. Deploy updated application code
6. Validate critical queries
7. Restart application
8. Monitor for errors
```

**Pros**:
- **Simplicity**: Single migration, single deployment
- **Consistency**: All data migrated atomically
- **No dual-write complexity**: Only one code path active at a time
- **Clean state**: No intermediate states to debug
- **Faster total time**: No parallel operation overhead

**Cons**:
- **Downtime required**: ~15-30 minutes depending on data volume
- **Single point of failure**: If migration fails, must restore from backup
- **Coordination needed**: Must coordinate maintenance window

**Effort**: 1 day (including preparation and testing)

**Downtime Estimate**: 15-30 minutes for 10,000 subscription records

---

#### Option B: Rolling Migration (Zero-Downtime)

**Overview**: Dual-write during transition period, then switch reads, then remove old code.

**Migration Phases**:
1. Add `bot_user_id` column (nullable)
2. Deploy code that writes to both columns
3. Run backfill for existing records
4. Switch reads to `bot_user_id`
5. Remove `userId` writes
6. Add NOT NULL constraint

**Pros**:
- Zero downtime
- Gradual rollout
- Can detect issues early

**Cons**:
- **Complex dual-write logic**: Must maintain two code paths
- **Longer total time**: Multiple deployments
- **Consistency risk**: Dual-write can create inconsistent states
- **Over-engineering**: Single-developer project doesn't need this complexity
- **Testing overhead**: Must test all combinations of read/write paths

**Effort**: 5 days

---

#### Option C: Shadow Migration with Feature Flag

**Overview**: Run new code in shadow mode, compare results, switch when confident.

**Cons**:
- **Extreme over-engineering**: Unnecessary for this migration type
- **Performance overhead**: Double query execution
- **Complex validation**: Must compare results programmatically
- **Delayed completion**: Validation period extends timeline

**Effort**: 7 days

---

### Comparison Matrix

| Evaluation Axis | Option A (Selected) | Option B | Option C |
|-----------------|---------------------|----------|----------|
| Downtime | 15-30 min | None | None |
| Implementation Complexity | Low | High | Very High |
| Total Migration Time | 1 day | 5 days | 7 days |
| Risk of Inconsistency | Low | Medium | Low |
| Rollback Simplicity | Easy (backup) | Complex | Complex |
| Effort | 1 day | 5 days | 7 days |

### Rationale

**Option A** is selected because:

1. **Acceptable Downtime**: Single-developer project with acceptable downtime window. Users won't be significantly impacted by 15-30 minute maintenance.

2. **Simplicity**: Single migration script, single deployment. No complex dual-write logic to maintain or debug.

3. **Atomicity**: All data migrated in one transaction, ensuring consistency. No risk of partial migration states.

4. **Lower Risk**: Simpler implementation has fewer failure modes. Restore from backup is straightforward if needed.

5. **Faster Total Time**: 1 day vs 5-7 days for zero-downtime approaches. Development time is valuable.

6. **PostgreSQL Best Practices**: For column additions with data migration, big-bang approach is recommended when downtime is acceptable ([SQL Migrations in PostgreSQL](https://medium.com/miro-engineering/sql-migrations-in-postgresql-part-1-bc38ec1cbe75)).

---

## Consequences

### Positive Consequences

- **Per-Bot Subscription Isolation**: Subscriptions now properly scoped to bot-specific user context
- **Correct Trial Eligibility**: `TrialService.isEligible()` can check per-bot subscription history
- **Simplified Queries**: Direct FK to `bot_users.id` eliminates need for complex joins
- **Consistent Data Model**: Subscriptions follow same per-bot pattern as `bot_users`
- **Rollback Capability**: Deprecated `userId` column preserved for emergency rollback
- **Data Integrity**: All existing subscriptions preserved with proper mapping
- **Clean Architecture**: Aligns with multi-bot design established in ADR-004

### Negative Consequences

- **Temporary Schema Bloat**: Two columns (`userId` and `botUserId`) until cleanup migration
- **Downtime Required**: 15-30 minute maintenance window for migration
- **Auto-Created bot_users**: Some `bot_users` records created from subscriptions (not user interaction)
- **Code Update Required**: All repository methods and services must be updated to use `botUserId`
- **Index Duplication**: New index on `bot_user_id` alongside existing `user_id` index until cleanup

### Neutral Consequences

- **New Column**: `bot_user_id` added to `user_subscriptions` table
- **Deprecated Column**: `user_id` marked deprecated, kept for rollback
- **Migration Script**: New SQL migration file added
- **Repository Methods**: Updated to accept `botUserId` parameter

---

## Implementation Guidance

### Implementation Dependencies

- **ADR-004 must be Accepted first**: This ADR depends on `bot_users` table structure established in ADR-004. Ensure ADR-004 is accepted before implementing this migration.

### Database Migration Principles

- **Transactional Execution**: Since we chose big-bang migration (Option A in Decision 3) with acceptable downtime, use standard FK constraints and index creation within a single transaction for atomicity
- **Backup First**: Always create database backup before running migration
- **Test on Staging**: Run migration on staging environment first with production data copy

### Code Update Principles

- **Repository First**: Update `UserSubscriptionsRepository` methods to use `botUserId`
- **Service Layer Next**: Update services to pass `botUserId` from context
- **Middleware Last**: Ensure middleware populates `botUserId` in context
- **Type Safety**: Update TypeScript types to reflect new column

### Bot Context Availability

Per user decision, `botId` is always available in middleware context:

```typescript
// UserManagementMiddleware
const botUser = await this.botUsersRepository.findOrCreate(telegramId, botId);
ctx.botUser = botUser; // Contains botUser.id for subscription operations
```

### Query Pattern Changes

**Before (via userId)**:
```typescript
// Required JOIN through users
await userSubscriptionsRepository.findByUserId(telegramId);
```

**After (via botUserId)**:
```typescript
// Direct reference
await userSubscriptionsRepository.findByBotUserId(botUserId);
```

### Rollback Strategy

If critical issues discovered post-migration:

1. Redeploy previous application version (uses `userId`)
2. All data remains intact (both columns populated)
3. Investigate and fix issues
4. Re-run migration with fixes

### Future Cleanup

After validation period (1-2 weeks), schedule cleanup migration:

1. Drop `user_id` column
2. Drop associated index
3. Remove deprecated code paths
4. Update TypeScript types

---

## Migration Script

```sql
-- Migration: Add botUserId to user_subscriptions
-- ADR-009: User Subscriptions Migration from users to bot_users

-- Phase 1: Add nullable column
ALTER TABLE user_subscriptions
ADD COLUMN bot_user_id BIGINT;

-- Phase 2: Create missing bot_users records for orphaned subscriptions
INSERT INTO bot_users (user_id, bot_id, is_active, created_at, updated_at)
SELECT DISTINCT
  us.user_id,
  us.bot_id,
  true,
  NOW(),
  NOW()
FROM user_subscriptions us
LEFT JOIN bot_users bu ON bu.user_id = us.user_id AND bu.bot_id = us.bot_id
WHERE bu.id IS NULL AND us.bot_id IS NOT NULL;

-- Phase 3: Populate bot_user_id from bot_users
UPDATE user_subscriptions us
SET bot_user_id = bu.id
FROM bot_users bu
WHERE us.user_id = bu.user_id
  AND us.bot_id = bu.bot_id;

-- Phase 4: Handle subscriptions without botId (legacy data)
-- For subscriptions with NULL bot_id, we need a default bot assignment strategy
-- Option: Assign to first active bot or skip these records
-- Decision: Skip these records (set bot_user_id to NULL, handle in application)

-- Phase 5: Add foreign key constraint
-- Note: Using standard FK (not NOT VALID pattern) since big-bang migration runs
-- in maintenance window with acceptable downtime. This ensures transactional atomicity.
ALTER TABLE user_subscriptions
ADD CONSTRAINT fk_user_subscriptions_bot_user
FOREIGN KEY (bot_user_id)
REFERENCES bot_users(id)
ON DELETE CASCADE;

-- Phase 6: Create index for query performance
-- Note: Using standard CREATE INDEX (not CONCURRENTLY) since we're in a transaction
-- and the table is not being accessed during maintenance window.
CREATE INDEX idx_user_subscriptions_bot_user
ON user_subscriptions(bot_user_id);

-- Phase 7: Make column NOT NULL (only after all records populated)
-- Run this only if all records have bot_user_id set:
-- ALTER TABLE user_subscriptions
-- ALTER COLUMN bot_user_id SET NOT NULL;

-- Note: userId column retained for rollback capability
-- Schedule cleanup migration after validation period
```

---

## Related Information

### Prerequisite Documents

- **ADR-004**: Multi-Bot Database Architecture (defines `bot_users` table and per-bot patterns)
- **ADR-008**: Partner Bot Flow Architecture (uses `user_subscriptions` for trial management)

### Affected Files

**Schema**:
- `libs/db/src/schema/user-subscriptions.ts`

**Repository**:
- `libs/db/src/repositories/user-subscriptions.repository.ts`

**Services**:
- `libs/bot/src/services/subscription-expiration.service.ts`
- `libs/bot/src/services/trial.service.ts`
- `libs/partner-bot/src/services/reminder-scheduler.service.ts`

**Middleware**:
- `libs/bot/src/middleware/user-management.middleware.ts`
- `libs/partner-bot/src/middleware/user-management.middleware.ts`

**Tests**:
- `libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts`
- `libs/db/src/repositories/__tests__/user-subscriptions.repository.int.spec.ts`

### External References

- [Migrating Foreign Keys in PostgreSQL](https://thomas.skowron.eu/blog/migrating-foreign-keys-in-postgresql/) - Foreign key migration patterns
- [Squawk - Adding Foreign Key Constraint](https://squawkhq.com/docs/adding-foreign-key-constraint) - NOT VALID constraint pattern
- [SQL Migrations in PostgreSQL](https://medium.com/miro-engineering/sql-migrations-in-postgresql-part-1-bc38ec1cbe75) - PostgreSQL migration best practices
- [Planning Your PostgreSQL Migration](https://www.heroku.com/blog/planning-your-postgresql-migration/) - General migration strategy guidance
- [PostgreSQL Documentation - Foreign Keys](https://www.postgresql.org/docs/current/tutorial-fk.html) - Official FK documentation

---

## Decision Record

| Attribute | Value |
|-----------|-------|
| **Decision Date** | 2025-12-02 |
| **Decision Status** | Proposed |
| **Implementation Status** | Not Started |
| **Estimated Effort** | 3-4 days (migration + code updates) |
| **Estimated Downtime** | 15-30 minutes |
| **Reviewed By** | Pending Architecture Review |

---

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-02 | Claude Code Architecture Agent | Initial version - Three architecture decisions for user_subscriptions migration |
| 1.0.1 | 2025-12-02 | Claude Code Architecture Agent | Simplified migration script for big-bang transactional execution (removed NOT VALID and CONCURRENTLY patterns), added test files to affected files list, added Implementation Dependencies section documenting ADR-004 dependency |

---

**Document Version**: 1.0.1
**Created**: 2025-12-02
**Last Updated**: 2025-12-02
**Author**: Claude Code Architecture Agent
