# Phase 2 Completion: Generate and Apply Migration

Metadata:
- Phase: 2
- Dependencies: Phase 1 complete (all schema files)
- Verification Level: L2 (Migration applies successfully)

## Phase Summary

Phase 2 generates and applies the Drizzle migration to create new tables and modify existing ones in the PostgreSQL database.

- 5 tasks: generate, review, add manual SQL, migrate, verify
- Creates 4 new tables in database
- Modifies 3 existing tables
- Adds partial unique index (FR-012)

## Completion Checklist

### Migration Tasks
- [ ] Task 2.1: drizzle-kit generate completed
- [ ] Task 2.2: Generated SQL reviewed and verified
- [ ] Task 2.3: Manual SQL added (partial unique index)
- [ ] Task 2.4: drizzle-kit migrate completed
- [ ] Task 2.5: Database schema verified

### Database Tables Created
- [ ] `bots` - Bot configurations
- [ ] `bot_settings` - Per-bot settings (JSONB)
- [ ] `bot_users` - User-bot relationships
- [ ] `bot_messages` - Per-bot message overrides

### Database Tables Modified
- [ ] `user_subscriptions` - bot_id column added
- [ ] `renewal_tariffs` - bot_id column added
- [ ] `codes` - bot_id column added

### Constraints Created
- [ ] FK: bot_settings.bot_id -> bots.id CASCADE
- [ ] FK: bot_users.user_id -> users.telegram_id CASCADE
- [ ] FK: bot_users.bot_id -> bots.id CASCADE
- [ ] FK: bot_messages.bot_id -> bots.id CASCADE
- [ ] FK: user_subscriptions.bot_id -> bots.id CASCADE
- [ ] FK: renewal_tariffs.bot_id -> bots.id CASCADE
- [ ] FK: codes.bot_id -> bots.id CASCADE
- [ ] UNIQUE: bots.name
- [ ] UNIQUE: bot_settings.bot_id
- [ ] UNIQUE: bot_users(user_id, bot_id)
- [ ] UNIQUE: bot_messages(bot_id, type, lang)
- [ ] UNIQUE: renewal_tariffs(subscription_id, period_days, bot_id)

### Indexes Created
- [ ] idx_user_subscriptions_bot
- [ ] idx_user_subscriptions_user_bot
- [ ] idx_renewal_tariffs_bot
- [ ] idx_codes_bot
- [ ] uq_user_subscriptions_active (partial unique index)

## E2E Verification Procedures

Copy from Design Doc Phase 2 verification:

### 1. Generate Migration
```bash
pnpm drizzle-kit generate
```

### 2. Review Migration File
Open `drizzle/migrations/XXXX_*.sql` and verify structure.

### 3. Apply Migration
```bash
pnpm drizzle-kit migrate
```

### 4. Verify Tables Created
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('bots', 'bot_settings', 'bot_users', 'bot_messages');
```

Expected: 4 rows

### 5. Verify Partial Unique Index
```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE indexname = 'uq_user_subscriptions_active';
```

Expected: 1 row with the partial unique index definition

### 6. Verify FK Constraints
```sql
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_name IN ('bot_settings', 'bot_users', 'bot_messages',
                   'user_subscriptions', 'renewal_tariffs', 'codes');
```

Expected: Multiple FK constraints

## Quality Gates

- [ ] Migration file generated
- [ ] Manual SQL additions made (partial unique index)
- [ ] Migration applied to database without errors
- [ ] All 4 new tables exist in database
- [ ] All new columns exist in modified tables
- [ ] All FK constraints properly configured with CASCADE
- [ ] All indexes created including partial unique index

## Phase 2 Deliverables

| Deliverable | Status |
|------------|--------|
| Migration file generated | Pending |
| Migration file reviewed | Pending |
| Manual SQL added | Pending |
| Migration applied | Pending |
| bots table exists | Pending |
| bot_settings table exists | Pending |
| bot_users table exists | Pending |
| bot_messages table exists | Pending |
| Modified columns exist | Pending |
| FK constraints exist | Pending |
| Indexes exist | Pending |
| Partial unique index exists | Pending |

---

**Test Resolution Progress**: Phase 2 = Database ready for repository implementation

**Next Steps**: Proceed to Phase 3: Create Repositories
