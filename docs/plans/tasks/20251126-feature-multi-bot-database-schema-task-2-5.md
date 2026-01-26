# Task: Verify Database Schema in PostgreSQL

Metadata:
- Phase: 2 (Generate and Apply Migration)
- Dependencies: Task 2.4 (migration applied)
- Provides: Verified database schema
- Size: Small (verification only)
- Verification Level: L2 (All schema elements exist)

## Implementation Content

Verify that all tables, columns, constraints, and indexes were created correctly in the PostgreSQL database.

## Target Files
- None (database verification only)

## Implementation Steps

### 1. Connect to Database
```bash
# Using psql
psql $DATABASE_URL

# Or use your preferred database client
```

### 2. Verify New Tables Exist

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('bots', 'bot_settings', 'bot_users', 'bot_messages');
```

**Expected**: 4 rows returned

### 3. Verify bots Table Structure

```sql
\d+ bots
```

**Expected columns**:
- id (bigint, PK, generated always as identity)
- token (character varying(100), NOT NULL)
- name (character varying(100), NOT NULL, UNIQUE)
- username (character varying(100))
- webhook_path (character varying(100))
- is_dynamic (boolean, NOT NULL, default true)
- is_active (boolean, NOT NULL, default true)
- created_at (timestamp with time zone, NOT NULL, default now())
- updated_at (timestamp with time zone, NOT NULL, default now())

### 4. Verify bot_settings Table Structure

```sql
\d+ bot_settings
```

**Expected**:
- bot_id has UNIQUE constraint
- FK to bots(id) with CASCADE

### 5. Verify bot_users Table Structure

```sql
\d+ bot_users
```

**Expected**:
- UNIQUE constraint on (user_id, bot_id)
- FK to users(telegram_id) with CASCADE
- FK to bots(id) with CASCADE

### 6. Verify bot_messages Table Structure

```sql
\d+ bot_messages
```

**Expected**:
- UNIQUE constraint on (bot_id, type, lang)
- FK to bots(id) with CASCADE

### 7. Verify Modified Tables

```sql
-- Check user_subscriptions.bot_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_subscriptions' AND column_name = 'bot_id';

-- Check renewal_tariffs.bot_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'renewal_tariffs' AND column_name = 'bot_id';

-- Check codes.bot_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'codes' AND column_name = 'bot_id';
```

**Expected**: All 3 queries return 1 row with bot_id, bigint, YES (nullable)

### 8. Verify Foreign Key Constraints

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'bots';
```

**Expected**: Multiple rows showing FKs from bot_settings, bot_users, bot_messages, user_subscriptions, renewal_tariffs, codes

### 9. Verify Indexes

```sql
\di
```

**Expected indexes** (among others):
- idx_user_subscriptions_bot
- idx_user_subscriptions_user_bot
- idx_renewal_tariffs_bot
- idx_codes_bot

### 10. Verify Partial Unique Index (FR-012)

```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE indexname = 'uq_user_subscriptions_active';
```

**Expected**:
```
       indexname            |                                  indexdef
----------------------------+----------------------------------------------------------------------------
 uq_user_subscriptions_active | CREATE UNIQUE INDEX uq_user_subscriptions_active ON public.user_subscriptions USING btree (user_id, subscription_id, bot_id) WHERE (is_active = true)
```

## Completion Criteria
- [x] All 4 new tables exist
- [x] All new columns added to existing tables
- [x] All FK constraints properly configured
- [x] All indexes created including partial unique index
- [x] CASCADE delete configured on all FKs

## Verification Checklist

| Element | Verified |
|---------|----------|
| bots table exists | [x] |
| bot_settings table exists | [x] |
| bot_users table exists | [x] |
| bot_messages table exists | [x] |
| user_subscriptions.bot_id exists | [x] |
| renewal_tariffs.bot_id exists | [x] |
| codes.bot_id exists | [x] |
| FK constraints reference bots | [x] |
| Indexes created | [x] |
| Partial unique index exists | [x] |

## Notes
- Impact scope: Verification only, no changes
- This completes Phase 2
- Phase 3 depends on this verification passing
