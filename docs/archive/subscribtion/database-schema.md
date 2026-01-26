# Database Schema Design

## Table of Contents

1. [⚠️ IMPLEMENTATION STATUS](#️-implementation-status)
2. [Overview](#overview)
3. [IMPORTANT: Two Subscription Types](#important-two-subscription-types)
4. [Current Schema Analysis](#current-schema-analysis)
   - [Existing Tables](#existing-tables)
   - [subscriptions](#subscriptions)
   - [codes](#codes)
   - [users](#users)
5. [⭐ IMPLEMENTATION STATUS - Current State](#implementation-status---current-state)
6. [Required Schema Changes](#required-schema-changes)
   - [CRITICAL CHANGE: Create user_subscriptions Table](#critical-change-create-user_subscriptions-table)
   - [1. Extend subscriptions Table](#1-extend-subscriptions-table)
   - [2. Extend codes Table (Optional)](#2-extend-codes-table-optional)
   - [3. Create broadcast_history Table (Optional)](#3-create-broadcast_history-table-optional---future-enhancement)
7. [Database Migrations with Drizzle Kit](#database-migrations-with-drizzle-kit)
   - [Migration Workflow](#migration-workflow-for-unified-architecture)
   - [CRITICAL: Data Migration Steps](#critical-data-migration-steps)
   - [Step-by-Step Migration Process](#step-by-step-migration-process)
8. [Current Schema Files (AS-IS)](#current-schema-files-as-is)
9. [Target Schema Files (TO-BE) - After Migration](#target-schema-files-to-be---after-migration)
10. [Indexes](#indexes)
11. [Data Integrity](#data-integrity)
12. [Rollback Strategy](#rollback-strategy)
13. [Data Migration](#data-migration)
14. [Testing Data](#testing-data)
15. [Monitoring Queries](#monitoring-queries)
16. [Backup Considerations](#backup-considerations)

---

## ⚠️ IMPLEMENTATION STATUS

**CRITICAL:** The schema changes described in this document are **NOT YET IMPLEMENTED** in the codebase. This is a design document that describes the REQUIRED changes to support the subscription broadcast feature.

**Current Reality:**
- ✅ `subscriptions` table exists with ONLY: `id`, `name`, `scope`, `createdAt` fields
- ✅ `codes` table exists without `isActive` field
- ❌ `type` discriminator field does NOT exist - **MUST BE ADDED**
- ❌ Lifecycle fields (`isActive`, `updatedAt`, `closedAt`, `closedBy`) do NOT exist
- ❌ `SubscriptionType` enum constants do NOT exist

**Before implementing services:** You MUST apply the schema changes and migrations described in this document.

---

## Overview

The subscription broadcast feature extends the existing database schema with minimal changes. It leverages existing tables (`subscriptions`, `codes`, `users`) and adds new columns to support subscription lifecycle management.

## IMPORTANT: Two Subscription Types

The system now supports **TWO DISTINCT SUBSCRIPTION TYPES**:

1. **Signals Subscriptions** (`type: 'signals'`):
   - Existing subscriptions for automated trading signals
   - Connected to trading platform
   - Handle automatic signal distribution and notifications
   - These are the current subscriptions already in the system
   - **ONE per user** via `users.subscribeId` field

2. **Broadcast Subscriptions** (`type: 'subscription_{uid}'`):
   - NEW subscription type for manual broadcast feature
   - Created via `/subscription` menu → "Создать подписку" action
   - Used for manual content broadcasting to specific groups
   - Managers manually send messages to these subscribers
   - **Dynamic type generation**: Each broadcast subscription has unique type `subscription_{uid}` where `{uid}` is generated
   - **Multiple subscriptions per user**: Users subscribe via `codes` table (userId + subscriptionId)
   - **Identified by pattern**: Broadcast subscriptions have `type LIKE 'subscription_%'`

**Key Principle**: These two types must remain SEPARATE and INDEPENDENT. Managers should only interact with broadcast subscriptions through broadcast commands.

## Current Schema Analysis

### Existing Tables

#### subscriptions
```typescript
export const subscriptions = pgTable('subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),
  scope: jsonb('scope').$type<string[] | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Current Usage**:
- Stores subscription plans (e.g., "Premium", "VIP")
- Currently used for signals subscriptions
- `scope` field contains sectors/channels as JSON array
- Referenced by `users.subscribeId` and `codes.subscriptionId`

#### codes
```typescript
export const codes = pgTable('codes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: varchar('code').notNull(),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.telegramId),
  managerId: bigint('manager_id', { mode: 'number' }).references(() => managers.telegramId),
  activationDate: timestamp('activation_date'),
  expirationDate: timestamp('expiration_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Current Usage**:
- Links invitation codes to subscriptions
- Tracks code activation by users
- Already has `managerId` for audit trail

#### users
```typescript
export const users = pgTable('users', {
  telegramId: bigint('telegram_id', { mode: 'number' }).primaryKey().notNull(),
  username: varchar('username', { length: 100 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  lang: varchar('lang', { length: 10 }),
  isPremium: boolean('is_premium').default(false),
  subscribeId: bigint('subscribe_id', { mode: 'number' }).references(() => subscriptions.id),
  subscribeExpirationDate: timestamp('subscribe_expiration_date', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Current Usage**:
- Stores user information and subscription status
- `subscribeId` links user to subscription
- `isActive` flag already exists for user deactivation

## IMPLEMENTATION STATUS - Current State

⚠️ **IMPORTANT**: The `user_subscriptions` table described in this document is a **PROPOSED ARCHITECTURE** that is **NOT YET IMPLEMENTED**.

**Current Implementation (AS-IS)**:
- ✅ Users have **ONE signals subscription** via `users.subscribeId` (one-to-one relationship)
- ✅ Activation data stored in `codes` table with `userId`, `activationDate`, `expirationDate` fields
- ✅ Current system works for single subscription per user

**Proposed Architecture (TO-BE)**:
- 🎯 Introduce `user_subscriptions` table for many-to-many relationship
- 🎯 Users can have **MULTIPLE subscriptions** (both signals and broadcast types)
- 🎯 Clean separation: `codes` table becomes invitation code catalog only
- 🎯 Requires data migration from `users.subscribeId` and `codes.userId` to `user_subscriptions`

**Why the change?**
- Support multiple subscriptions per user (signals + broadcast subscriptions)
- Cleaner data model with proper separation of concerns
- Invitation codes separated from activation records

**Migration Status**: Data migration scripts required before implementation (see "Database Migrations with Drizzle Kit" section).

## Required Schema Changes

### CRITICAL CHANGE: Create `user_subscriptions` Table

⚠️ **PROPOSED ARCHITECTURE - Not yet implemented. This is the target state after migration.**

The most important change is introducing a **unified many-to-many relationship** table.

**Why this change?**
- **OLD**: `users.subscribeId` (one-to-one, only ONE signals subscription)
- **OLD**: `codes.userId`, `codes.activationDate`, `codes.expirationDate` (activation data mixed with invitation codes)
- **NEW**: `user_subscriptions` table (many-to-many, supports MULTIPLE subscriptions per user)
- **BENEFIT**: Users can have multiple subscriptions (both signals and broadcast types)
- **BENEFIT**: Cleaner separation: codes are just invitation codes, not activation records

**New Table Schema:**
```typescript
export const userSubscriptions = pgTable('user_subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.telegramId, { onDelete: 'cascade' }),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  activatedAt: timestamp('activated_at')  // WITHOUT timezone for consistency with codes table
    .notNull()
    .defaultNow(),
  expiresAt: timestamp('expires_at'),     // WITHOUT timezone
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at')      // WITHOUT timezone
    .defaultNow()
    .notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
```

**Key Decision**: Uses `timestamp` WITHOUT timezone to maintain consistency with the `codes` table. This avoids type mismatches during data migration from `codes.activationDate` and `codes.expirationDate`.

**Migration Note**: Data migration from old fields requires explicit casts:
- `users.subscribe_id::bigint` → `user_subscriptions.subscription_id`
- No casts needed for timestamps (types match)

**Constraints:**
```sql
-- Unique constraint: prevent duplicate subscriptions
ALTER TABLE user_subscriptions
ADD CONSTRAINT unique_user_subscription UNIQUE (user_id, subscription_id);

-- Performance indexes
CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_subscription ON user_subscriptions(subscription_id);
CREATE INDEX idx_user_subscriptions_user_active ON user_subscriptions(user_id, is_active) WHERE is_active = true;
```

### Fields to REMOVE from existing tables:

**users table:**
- ❌ `subscribeId` - Moved to `user_subscriptions.subscription_id`
- ❌ `subscribeExpirationDate` - Moved to `user_subscriptions.expires_at`

**codes table:**
- ❌ userId - REMOVED (activation tracking moved to user_subscriptions.user_id)
- ❌ activationDate - REMOVED (activation tracking moved to user_subscriptions.activatedAt)
- ❌ expirationDate - REMOVED (expiration tracking moved to user_subscriptions.expiresAt)

**Rationale:** Codes become **multi-use invitation codes** (no longer tied to a single user). User activation data moves to user_subscriptions table.

### 1. Extend `subscriptions` Table

**Current Status**: The `subscriptions` table already exists with core fields (`id`, `name`, `scope`, `createdAt`). This section describes adding NEW fields for type discrimination and lifecycle management.

Add `type` field to distinguish subscription types, plus lifecycle management fields:

```typescript
export const subscriptions = pgTable('subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),
  type: varchar('type', { length: 30 }).notNull().default('signals'), // NEW - CRITICAL
  scope: jsonb('scope').$type<string[] | null>(),
  isActive: boolean('is_active').notNull().default(true), // NEW
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(), // NEW
  closedAt: timestamp('closed_at', { withTimezone: true }), // NEW
  closedBy: bigint('closed_by', { mode: 'number' }).references(() => managers.telegramId), // NEW
});
```

**New Columns**:
- `type`: **CRITICAL** - Distinguishes between subscription types
  - `'signals'`: Automated trading signal subscriptions (ONE per user via users.subscribeId)
  - `'subscription_{uid}'`: Dynamic broadcast subscriptions (e.g., `'subscription_abc123'`)
  - Length: varchar(30) to accommodate dynamic UIDs
  - Default: `'signals'` for backward compatibility
  - **Identification**: Broadcast subscriptions match pattern `type LIKE 'subscription_%'`
- `isActive`: Boolean flag for soft delete (default: true)
- `updatedAt`: Track last modification timestamp
- `closedAt`: When subscription was closed
- `closedBy`: Which manager closed it

**Design Decision**: Using a single `type` discriminator column with dynamic values instead of separate tables because:
- Both types share the same core structure (id, name, scope, lifecycle)
- Simplifies foreign key relationships
- Easy to filter by type pattern in queries (LIKE 'subscription_%')
- Maintains backward compatibility with existing code
- Allows unlimited broadcast subscriptions without schema changes
- Each broadcast subscription is uniquely identifiable by its type UID

### 2. Extend `codes` Table (Optional)

Add `isActive` flag to invalidate codes when subscription closes:

```typescript
export const codes = pgTable('codes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: varchar('code').notNull(),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.telegramId),
  managerId: bigint('manager_id', { mode: 'number' }).references(() => managers.telegramId),
  activationDate: timestamp('activation_date'),
  expirationDate: timestamp('expiration_date'),
  isActive: boolean('is_active').notNull().default(true), // NEW
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**New Column**:
- `isActive`: Allows deactivating codes when subscription closes

### 3. Create `broadcast_history` Table (Optional - Future Enhancement)

Track broadcast history for analytics:

```typescript
export const broadcastHistory = pgTable('broadcast_history', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id),
  managerId: bigint('manager_id', { mode: 'number' })
    .notNull()
    .references(() => managers.telegramId),
  message: text('message').notNull(),
  recipientCount: integer('recipient_count').notNull(),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, sending, completed, failed
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
```

**Purpose**:
- Audit trail for all broadcasts
- Analytics on broadcast performance
- Troubleshooting failed broadcasts

## Migration Enhancements (APPLIED)

The generated migration was enhanced with the following fixes:

### 1. Transaction Wrapper
All migration operations wrapped in a transaction to ensure atomicity:
```sql
BEGIN;

-- All migration content

COMMIT;
```

### 2. Type Casts
Explicit type casts added for data migration to prevent type mismatches:
```sql
-- Cast subscribe_id from integer to bigint
INSERT INTO user_subscriptions (user_id, subscription_id, ...)
SELECT
  telegram_id,
  subscribe_id::bigint,  -- EXPLICIT CAST
  ...
FROM users
WHERE subscribe_id IS NOT NULL;
```

### 3. Unique Constraint Timing
Moved unique constraint BEFORE data migration to catch duplicates early:
```sql
-- After CREATE TABLE, before INSERT
ALTER TABLE user_subscriptions
ADD CONSTRAINT unique_user_subscription UNIQUE (user_id, subscription_id);

-- Then proceed with data migration
INSERT INTO user_subscriptions ...
```

### 4. Fixed Verification Logic
Changed from counting distinct users to counting all rows to ensure accurate data loss detection:
```sql
-- OLD (incorrect):
SELECT COUNT(DISTINCT user_id) INTO old_codes_count FROM codes WHERE user_id IS NOT NULL;

-- NEW (correct):
SELECT COUNT(*) INTO old_codes_count FROM codes WHERE user_id IS NOT NULL;
```

This ensures the migration detects if ANY activated codes fail to migrate, not just unique users.

## Database Migrations with Drizzle Kit

This project uses **Drizzle Kit** for managing database migrations. The unified architecture migration is a **multi-step process** with data migration.

### Migration Workflow for Unified Architecture (COMPLETED)

1. ✅ **Update Drizzle Schema Files** (create user_subscriptions, update users/codes)
2. ✅ **Generate Migration**: `pnpm run db:generate`
3. ✅ **Review Generated SQL**: Check files in `libs/db/migrations/`
4. ✅ **CRITICAL: Enhance with Data Migration** (transaction, casts, constraints)
5. ✅ **Apply Migration**: `pnpm run db:migrate`
6. ✅ **Verify Data** (run verification queries - all passed)
7. **Remove Old Fields** (deferred - old fields kept for safety)

### CRITICAL: Data Migration Steps

The migration MUST preserve all existing subscription data. This requires manual SQL after Drizzle generates the schema changes.

**Migration Phases:**

#### Phase 1: Create New Structure
```sql
-- Drizzle generates this automatically
CREATE TABLE user_subscriptions (...);
ALTER TABLE subscriptions ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'signals';
-- ... other subscriptions columns
ALTER TABLE codes ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
```

#### Phase 2: Migrate Existing Data (MANUAL - CRITICAL)
```sql
-- STEP 1: Migrate signals subscriptions from users table
INSERT INTO user_subscriptions (user_id, subscription_id, activated_at, expires_at, is_active)
SELECT
  telegram_id,
  subscribe_id,
  created_at, -- approximate activation date
  subscribe_expiration_date,
  true
FROM users
WHERE subscribe_id IS NOT NULL;

-- STEP 2: Migrate broadcast subscriptions from codes table (if any activated)
INSERT INTO user_subscriptions (user_id, subscription_id, activated_at, expires_at, is_active)
SELECT
  c.user_id,
  c.subscription_id,
  c.activation_date,
  c.expiration_date,
  true
FROM codes c
WHERE c.user_id IS NOT NULL
ON CONFLICT (user_id, subscription_id) DO NOTHING; -- Skip duplicates

-- STEP 3: CRITICAL VERIFICATION
DO $$
DECLARE
  old_signals_count INT;
  new_signals_count INT;
  old_codes_count INT;
  new_codes_count INT;
BEGIN
  -- Verify signals migration
  SELECT COUNT(*) INTO old_signals_count FROM users WHERE subscribe_id IS NOT NULL;
  SELECT COUNT(*) INTO new_signals_count FROM user_subscriptions;

  IF old_signals_count > new_signals_count THEN
    RAISE EXCEPTION 'Data migration incomplete: users had % signals subscriptions but user_subscriptions has only %',
      old_signals_count, new_signals_count;
  END IF;

  -- Verify codes migration: count rows migrated correctly
  SELECT COUNT(*) INTO old_codes_count FROM codes WHERE user_id IS NOT NULL;
  SELECT COUNT(*) INTO new_codes_count
  FROM user_subscriptions us
  WHERE EXISTS (
    SELECT 1 FROM codes c
    WHERE c.user_id = us.user_id
    AND c.subscription_id = us.subscription_id
    AND c.user_id IS NOT NULL
  );

  IF old_codes_count != new_codes_count THEN
    RAISE EXCEPTION 'Codes migration incomplete: % codes but only % migrated',
      old_codes_count, new_codes_count;
  END IF;

  RAISE NOTICE 'Migration verification: signals=%, codes=%, total=%',
    old_signals_count, old_codes_count, new_signals_count;
END $$;
```

#### Phase 3: Remove Old Fields (SEPARATE MIGRATION - only after verification)

⚠️ **DANGER ZONE**: Only execute after Phase 2 verification passes!

```sql
-- Remove from users table
ALTER TABLE users DROP COLUMN subscribe_id;
ALTER TABLE users DROP COLUMN subscribe_expiration_date;

-- Remove from codes table
ALTER TABLE codes DROP COLUMN user_id;
ALTER TABLE codes DROP COLUMN activation_date;
ALTER TABLE codes DROP COLUMN expiration_date;
```

### Rollback Strategy

If Phase 2 fails or data is incorrect:

```sql
-- Rollback: Restore old fields from user_subscriptions
ALTER TABLE users ADD COLUMN subscribe_id INTEGER REFERENCES subscriptions(id);
ALTER TABLE users ADD COLUMN subscribe_expiration_date TIMESTAMP WITH TIME ZONE;

UPDATE users u
SET subscribe_id = us.subscription_id,
    subscribe_expiration_date = us.expires_at
FROM user_subscriptions us
WHERE us.user_id = u.telegram_id;

-- Restore codes fields
ALTER TABLE codes ADD COLUMN user_id BIGINT REFERENCES users(telegram_id);
ALTER TABLE codes ADD COLUMN activation_date TIMESTAMP;
ALTER TABLE codes ADD COLUMN expiration_date TIMESTAMP WITH TIME ZONE;

UPDATE codes c
SET user_id = us.user_id,
    activation_date = us.activated_at,
    expiration_date = us.expires_at
FROM user_subscriptions us
WHERE us.subscription_id = c.subscription_id AND us.user_id IS NOT NULL;

-- Drop user_subscriptions table
DROP TABLE user_subscriptions CASCADE;
```

### Available Commands

```bash
# Generate migration from schema changes
pnpm run db:generate

# Apply pending migrations to database
pnpm run db:migrate

# Push schema directly to DB (dev only, no migration files)
pnpm run db:push

# Open Drizzle Studio (visual database browser)
pnpm run db:studio
```

### Step-by-Step Migration Process

#### Step 1: Update Schema Files

First, update the Drizzle schema files as shown in the "Drizzle Schema Files" section below. This includes:
- `libs/db/src/schema/subscriptions.ts` - Add `type`, `isActive`, `updatedAt`, `closedAt`, `closedBy`
- `libs/db/src/schema/codes.ts` - Add `isActive`
- `libs/db/src/schema/broadcast-history.ts` - Create new file (optional)

#### Step 2: Generate Migration

```bash
pnpm run db:generate
```

This will:
- Compare current schema with database state
- Generate SQL migration file in `libs/db/migrations/`
- Create a timestamped migration file (e.g., `20250115123456_add_subscription_lifecycle.sql`)

#### Step 3: Review Generated Migration

**CRITICAL**: Manually review the generated migration file before applying!

The generated migration should include:
```sql
-- Auto-generated by Drizzle Kit
ALTER TABLE "subscriptions" ADD COLUMN "type" varchar(50) DEFAULT 'signals' NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN "closed_at" timestamp with time zone;
ALTER TABLE "subscriptions" ADD COLUMN "closed_by" bigint;
-- ... more auto-generated SQL
```

**IMPORTANT**: After Drizzle generates the migration, you MUST manually add:

1. **Type constraint** (Drizzle doesn't generate CHECK constraints from varchar):
```sql
-- Only validate 'signals' type explicitly, allow any 'subscription_%' pattern
-- This allows unlimited broadcast subscriptions with dynamic UIDs
ALTER TABLE "subscriptions"
ADD CONSTRAINT chk_subscription_type
CHECK (type = 'signals' OR type LIKE 'subscription_%');
```

2. **Indexes for performance**:
```sql
CREATE INDEX idx_subscriptions_type ON subscriptions(type);
CREATE INDEX idx_subscriptions_type_active ON subscriptions(type, is_active) WHERE is_active = true;
CREATE INDEX idx_subscriptions_is_active ON subscriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_subscriptions_name ON subscriptions(name);
-- Index for broadcast subscription pattern matching
CREATE INDEX idx_subscriptions_broadcast ON subscriptions(type) WHERE type LIKE 'subscription_%';
```

3. **Auto-update trigger for `updated_at`**:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

4. **CRITICAL: Data migration for existing subscriptions**:
```sql
-- Set all existing subscriptions to 'signals' type for backward compatibility
-- Note: This UPDATE is only needed if column is added WITHOUT a default value
-- If the ALTER TABLE includes DEFAULT 'signals', existing rows will already have the value
UPDATE subscriptions SET type = 'signals' WHERE type IS NULL;
```

5. **Column comments** (optional but recommended):
```sql
COMMENT ON COLUMN subscriptions.type IS 'Subscription type: signals (ONE per user) or subscription_{uid} (broadcast subscriptions)';
COMMENT ON COLUMN subscriptions.is_active IS 'Subscription active status (soft delete)';
COMMENT ON COLUMN subscriptions.updated_at IS 'Last modification timestamp';
COMMENT ON COLUMN subscriptions.closed_at IS 'When subscription was closed';
COMMENT ON COLUMN subscriptions.closed_by IS 'Manager who closed the subscription';
```

#### Step 4: Apply Migration

After reviewing and enhancing the generated migration:

```bash
pnpm run db:migrate
```

This applies all pending migrations to the database.

### Manual Migration Enhancement Template

When Drizzle generates your migration, enhance it by appending this to the end of the file:

```sql
-- ====================================================================================
-- MANUAL ENHANCEMENTS (added after Drizzle generation)
-- ====================================================================================

-- 1. Type constraint for subscription types (signals or subscription_*)
DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT chk_subscription_type
  CHECK (type = 'signals' OR type LIKE 'subscription_%');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_type ON subscriptions(type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_type_active ON subscriptions(type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_name ON subscriptions(name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_broadcast ON subscriptions(type) WHERE type LIKE 'subscription_%';

-- 3. Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. CRITICAL: Migrate existing data
-- Only set type for rows that don't have it (if column added without default)
UPDATE subscriptions SET type = 'signals' WHERE type IS NULL;

-- 5. Column comments
COMMENT ON COLUMN subscriptions.type IS 'Subscription type: signals (ONE per user) or subscription_{uid} (broadcast subscriptions)';
COMMENT ON COLUMN subscriptions.is_active IS 'Subscription active status (soft delete)';
COMMENT ON COLUMN subscriptions.updated_at IS 'Last modification timestamp';
COMMENT ON COLUMN subscriptions.closed_at IS 'When subscription was closed';
COMMENT ON COLUMN subscriptions.closed_by IS 'Manager who closed the subscription';
```

### For Codes Table

When you update `codes.ts` schema and generate migration, enhance with:

```sql
-- Indexes for codes table
CREATE INDEX IF NOT EXISTS idx_codes_is_active ON codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_codes_subscription_active ON codes(subscription_id, is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_codes_code_unique_active ON codes(code) WHERE is_active = true AND user_id IS NULL;

-- Column comment
COMMENT ON COLUMN codes.is_active IS 'Code active status (invalidated when subscription closes)';
```

### For Broadcast History Table (Optional)

When you create `broadcast-history.ts` schema and generate migration, enhance with:

```sql
-- Indexes for broadcast_history
CREATE INDEX IF NOT EXISTS idx_broadcast_history_subscription ON broadcast_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_history_manager ON broadcast_history(manager_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_history_status ON broadcast_history(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_history_created_at ON broadcast_history(created_at DESC);

-- Status constraint
DO $$ BEGIN
  ALTER TABLE broadcast_history ADD CONSTRAINT chk_broadcast_status
  CHECK (status IN ('pending', 'sending', 'completed', 'failed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Counts constraint
DO $$ BEGIN
  ALTER TABLE broadcast_history ADD CONSTRAINT chk_broadcast_counts
  CHECK (success_count >= 0 AND failure_count >= 0 AND recipient_count > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Comments
COMMENT ON TABLE broadcast_history IS 'Audit trail for subscription broadcasts';
COMMENT ON COLUMN broadcast_history.status IS 'Broadcast status: pending, sending, completed, failed, cancelled';
```

### Migration Best Practices

1. **Always review generated SQL** before applying
2. **Test migrations on development database** first
3. **Backup production database** before running migrations
4. **Manually enhance** with indexes, constraints, triggers, comments
5. **Include data migration scripts** for backward compatibility
6. **Use `IF NOT EXISTS`** clauses for idempotent enhancements
7. **Use DO blocks** for conditional constraint creation

### Why Manual Enhancements?

Drizzle Kit generates basic ALTER TABLE statements but doesn't automatically create:
- CHECK constraints for enums/types
- Custom indexes (especially partial indexes)
- Triggers and functions
- Data migration logic
- Column/table comments

These must be added manually to the generated migration file.

## Current Schema Files (AS-IS)

**These are the CURRENT implementations** in the codebase. This represents the state BEFORE migration to unified `user_subscriptions` architecture.

### Current `libs/db/src/schema/subscriptions.ts` (AS-IS)

```typescript
import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  jsonb,
} from 'drizzle-orm/pg-core';

export const subscriptions = pgTable('subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),
  scope: jsonb('scope').$type<string[] | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
```

**Current State**:
- ✅ Basic subscription structure with `id`, `name`, `scope`, `createdAt`
- ❌ No `type` discriminator field yet
- ❌ No lifecycle management fields (`isActive`, `updatedAt`, `closedAt`, `closedBy`)

### Current `libs/db/src/schema/codes.ts` (AS-IS)

```typescript
import { pgTable, timestamp, varchar, bigint } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';
import { users } from './users';
import { managers } from './managers';

export const codes = pgTable('codes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: varchar('code').notNull(),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.telegramId), // WILL BE REMOVED
  managerId: bigint('manager_id', { mode: 'number' }).references(() => managers.telegramId),
  activationDate: timestamp('activation_date'), // WILL BE REMOVED
  expirationDate: timestamp('expiration_date'), // WILL BE REMOVED
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Code = typeof codes.$inferSelect;
export type NewCode = typeof codes.$inferInsert;
```

**Current State**:
- ✅ Has `userId`, `activationDate`, `expirationDate` (will be moved to `user_subscriptions`)
- ❌ No `isActive` field yet
- ⚠️ Mixing invitation codes with activation records (will be separated)

### Current `libs/db/src/schema/users.ts` (AS-IS)

```typescript
import { pgTable, timestamp, varchar, bigint, boolean, integer } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';

export const users = pgTable('users', {
  telegramId: bigint('telegram_id', { mode: 'number' }).primaryKey().notNull(),
  username: varchar('username', { length: 100 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  lang: varchar('lang', { length: 10 }),
  isPremium: boolean('is_premium').default(false),
  subscribeId: bigint('subscribe_id', { mode: 'number' }).references(() => subscriptions.id), // WILL BE REMOVED
  subscribeExpirationDate: timestamp('subscribe_expiration_date', { withTimezone: true }), // WILL BE REMOVED
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Current State**:
- ✅ Has `subscribeId` and `subscribeExpirationDate` (one subscription per user)
- ⚠️ Will be replaced by `user_subscriptions` many-to-many table

---

## Target Schema Files (TO-BE) - After Migration

⚠️ **WARNING**: These are TARGET schemas after migration to unified `user_subscriptions` architecture. **Do not implement yet without data migration scripts.** See "Database Migrations with Drizzle Kit" section for migration process.

### Target `libs/db/src/schema/user-subscriptions.ts` (TO-BE - NEW FILE)

```typescript
import { pgTable, timestamp, bigint, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { subscriptions } from './subscriptions';

// NEW TABLE: Replaces users.subscribeId and codes.userId with many-to-many relationship
export const userSubscriptions = pgTable('user_subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.telegramId, { onDelete: 'cascade' }), // NEW: replaces users.subscribeId
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }), // NEW: replaces codes.userId
  activatedAt: timestamp('activated_at', { withTimezone: true })
    .notNull()
    .defaultNow(), // NEW: replaces codes.activationDate
  expiresAt: timestamp('expires_at', { withTimezone: true }), // NEW: replaces codes.expirationDate and users.subscribeExpirationDate
  isActive: boolean('is_active').notNull().default(true), // NEW
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
```

### Target `libs/db/src/schema/subscriptions.ts` (TO-BE)

```typescript
import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { managers } from './managers';

// NEW: Define subscription type constant for signals
export const SubscriptionType = {
  SIGNALS: 'signals',
} as const;

// NEW: Helper to generate broadcast subscription type
import { nanoid } from 'nanoid';

export function generateSubscriptionUID(): string {
  return nanoid(10); // Generates 10-character UID (e.g., 'V1StGXR8_Z')
}

export function generateBroadcastSubscriptionType(): string {
  return `subscription_${generateSubscriptionUID()}`;
}

// NEW: Helper to check if subscription is broadcast type
export function isBroadcastSubscription(type: string): boolean {
  return type.startsWith('subscription_');
}

export const subscriptions = pgTable('subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),
  type: varchar('type', { length: 30 }).notNull().default(SubscriptionType.SIGNALS), // NEW - supports dynamic 'subscription_{uid}'
  scope: jsonb('scope').$type<string[] | null>(),
  isActive: boolean('is_active').notNull().default(true), // NEW
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(), // NEW
  closedAt: timestamp('closed_at', { withTimezone: true }), // NEW
  closedBy: bigint('closed_by', { mode: 'number' }).references(() => managers.telegramId), // NEW
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
```

### Target `libs/db/src/schema/codes.ts` (TO-BE)

**Fields removed in unified architecture:**
- `userId` → Moved to `user_subscriptions.userId`
- `activationDate` → Moved to `user_subscriptions.activatedAt`
- `expirationDate` → Moved to `user_subscriptions.expiresAt`

**Rationale:** Codes become multi-use invitation codes (no longer tied to a single user).

```typescript
import { pgTable, timestamp, varchar, bigint, boolean } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';
import { managers } from './managers';

export const codes = pgTable('codes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: varchar('code').notNull(),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id),
  managerId: bigint('manager_id', { mode: 'number' }).references(() => managers.telegramId),
  isActive: boolean('is_active').notNull().default(true), // NEW
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Code = typeof codes.$inferSelect;
export type NewCode = typeof codes.$inferInsert;
```

### Target `libs/db/src/schema/broadcast-history.ts` (TO-BE - NEW FILE)

```typescript
import {
  pgTable,
  timestamp,
  varchar,
  bigint,
  integer,
  text,
} from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';
import { managers } from './managers';

// NEW TABLE: Optional future enhancement for broadcast analytics
export const broadcastHistory = pgTable('broadcast_history', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(), // NEW
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }), // NEW
  managerId: bigint('manager_id', { mode: 'number' })
    .notNull()
    .references(() => managers.telegramId, { onDelete: 'set null' }), // NEW
  message: text('message').notNull(), // NEW
  recipientCount: integer('recipient_count').notNull(), // NEW
  successCount: integer('success_count').default(0), // NEW
  failureCount: integer('failure_count').default(0), // NEW
  status: varchar('status', { length: 20 }).notNull().default('pending'), // NEW
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), // NEW
  completedAt: timestamp('completed_at', { withTimezone: true }), // NEW
});

export type BroadcastHistory = typeof broadcastHistory.$inferSelect;
export type NewBroadcastHistory = typeof broadcastHistory.$inferInsert;
```

## Indexes

### Performance Optimization

1. **Active Subscriptions**: Partial index on `is_active = true` for fast filtering
2. **Subscription Name**: B-tree index for duplicate name checks
3. **Active Codes**: Partial index for unused active codes
4. **Subscription Codes**: Composite index for subscription code lookups
5. **Broadcast History**: Indexes on subscription, manager, status, and date

### Query Patterns

**Find Active Broadcast Subscriptions** (for broadcast commands):
```sql
SELECT * FROM subscriptions
WHERE type LIKE 'subscription_%' AND is_active = true
ORDER BY created_at DESC;
-- Uses: idx_subscriptions_broadcast + idx_subscriptions_type_active (optimal)
```

**Find Active Signals Subscriptions** (for trading signals):
```sql
SELECT * FROM subscriptions
WHERE type = 'signals' AND is_active = true
ORDER BY created_at DESC;
-- Uses: idx_subscriptions_type_active (optimal)
```

**Find All Active Subscriptions** (any type):
```sql
SELECT * FROM subscriptions WHERE is_active = true ORDER BY created_at DESC;
-- Uses: idx_subscriptions_is_active
```

**Find Active Codes for Subscription**:
```sql
SELECT * FROM codes
WHERE subscription_id = 123 AND is_active = true AND user_id IS NULL;
-- Uses: idx_codes_subscription_active
```

**Count Subscribers**:
```sql
SELECT COUNT(*) FROM users
WHERE subscribe_id = 123 AND is_active = true;
-- Uses: existing indexes on users table
```

**Recent Broadcasts by Manager**:
```sql
SELECT * FROM broadcast_history
WHERE manager_id = 456
ORDER BY created_at DESC
LIMIT 10;
-- Uses: idx_broadcast_history_manager + idx_broadcast_history_created_at
```

## Data Integrity

### Constraints

1. **Subscription Name**: NOT NULL, unique name validation in service layer
2. **Code Uniqueness**: Unique partial index on active unused codes
3. **Foreign Keys**: All references with appropriate ON DELETE actions
4. **Check Constraints**: Broadcast counts must be non-negative
5. **Status Values**: Enum-like CHECK constraint on broadcast status

### Cascade Behavior

- **Subscription Deletion**: Cascade to broadcast_history (rare, for cleanup)
- **Manager Deletion**: SET NULL on closedBy and managerId (preserve history)
- **User Deletion**: SET NULL on codes.userId (preserve code history)

## Rollback Strategy

### Migration Rollback

**Rollback Migration 1**:
```sql
-- Drop trigger and function
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_subscriptions_name;
DROP INDEX IF EXISTS idx_subscriptions_is_active;
DROP INDEX IF EXISTS idx_subscriptions_type_active;
DROP INDEX IF EXISTS idx_subscriptions_type;

-- Drop constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscription_type;

-- Drop columns (CRITICAL: includes type discriminator)
ALTER TABLE subscriptions DROP COLUMN IF EXISTS closed_by;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS closed_at;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS updated_at;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS is_active;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS type;
```

**Rollback Migration 2**:
```sql
DROP INDEX IF EXISTS idx_codes_code_unique_active;
DROP INDEX IF EXISTS idx_codes_subscription_active;
DROP INDEX IF EXISTS idx_codes_is_active;
ALTER TABLE codes DROP COLUMN IF EXISTS is_active;
```

**Rollback Migration 3**:
```sql
DROP TABLE IF EXISTS broadcast_history CASCADE;
```

## Data Migration

### CRITICAL: Existing Data Handling

**Migration Strategy**:

The migration MUST set all existing subscriptions to `type = 'signals'` to maintain backward compatibility and ensure proper separation between signals trading subscriptions and new analytical subscriptions.

**Step 1: Set subscription types** (included in Migration 1):
```sql
-- CRITICAL: All existing subscriptions are signals subscriptions
-- This UPDATE statement is included in the migration file
UPDATE subscriptions SET type = 'signals' WHERE type IS NULL;
```

**Step 2: Verify data migration**:
```sql
-- Check that all existing subscriptions are properly typed
SELECT type, COUNT(*) FROM subscriptions GROUP BY type;
-- Expected result: All existing subscriptions should be 'signals'

-- Verify no NULL types exist
SELECT COUNT(*) FROM subscriptions WHERE type IS NULL;
-- Expected result: 0
```

**Step 3: Set all subscriptions and codes to active** (default values handle this):
```sql
-- After adding is_active column with default true, no action needed
-- All existing subscriptions will be active by default
-- All existing codes will be active by default
```

### Post-Migration Verification

After running migrations, verify the data:

```sql
-- 1. Check subscription types distribution
SELECT
  type,
  is_active,
  COUNT(*) as count
FROM subscriptions
GROUP BY type, is_active;

-- 2. Verify all existing subscriptions are signals
SELECT name, type FROM subscriptions WHERE type = 'signals';

-- 3. Verify no analytical subscriptions exist yet (before feature launch)
SELECT COUNT(*) FROM subscriptions WHERE type = 'analytical';
-- Expected: 0

-- 4. Check indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'subscriptions';
-- Expected: idx_subscriptions_type, idx_subscriptions_type_active, etc.
```

## Testing Data

### Seed Data for Development

```sql
-- Create test signals subscriptions (existing type)
INSERT INTO subscriptions (name, type, scope, is_active) VALUES
  ('Premium Signals', 'signals', '["forex", "crypto"]', true),
  ('VIP Trading Signals', 'signals', '["*"]', true);

-- PREREQUISITE: Assumes subscriptions 1-2 already exist as signals subscriptions

-- Create test broadcast subscriptions (IDs will be 3, 4, 5 assuming 1-2 exist)
-- Each has unique dynamic type: subscription_{uid}
INSERT INTO subscriptions (name, type, scope, is_active) VALUES
  ('Premium Analytics Broadcast', 'subscription_abc123', NULL, true),
  ('VIP Market Analysis', 'subscription_xyz789', NULL, true),
  ('Closed Analytics Group', 'subscription_old456', NULL, false);

-- Create test codes for broadcast subscriptions
INSERT INTO codes (code, subscription_id, manager_id, is_active) VALUES
  ('BCAST001ABC', 3, 123456789, true),  -- broadcast subscription
  ('BCAST002XYZ', 4, 123456789, true),  -- broadcast subscription
  ('BCAST003OLD', 5, 123456789, false); -- closed broadcast subscription

-- Create test codes for signals subscriptions
INSERT INTO codes (code, subscription_id, manager_id, is_active) VALUES
  ('SIG_001ABC', 1, 123456789, true),
  ('SIG_002XYZ', 2, 123456789, true);

-- Create test broadcast history (only for broadcast subscriptions)
INSERT INTO broadcast_history
  (subscription_id, manager_id, message, recipient_count, success_count, failure_count, status)
VALUES
  (3, 123456789, 'Test broadcast message', 10, 9, 1, 'completed'),
  (4, 123456789, 'VIP market analysis update', 5, 5, 0, 'completed');
```

## Monitoring Queries

### Health Checks

**Active Subscriptions Count by Type**:
```sql
SELECT
  CASE
    WHEN type = 'signals' THEN 'signals'
    WHEN type LIKE 'subscription_%' THEN 'broadcast'
    ELSE 'other'
  END as subscription_category,
  COUNT(*) as active_count
FROM subscriptions
WHERE is_active = true
GROUP BY subscription_category;
-- Shows Signals vs Broadcast subscription counts
```

**Total Active Subscriptions**:
```sql
SELECT COUNT(*) as active_subscriptions FROM subscriptions WHERE is_active = true;
```

**Broadcast Subscriptions Only** (for broadcast feature monitoring):
```sql
SELECT COUNT(*) as broadcast_subscriptions
FROM subscriptions
WHERE type LIKE 'subscription_%' AND is_active = true;
```

**Unused Active Codes**:
```sql
SELECT COUNT(*) as unused_codes FROM codes
WHERE is_active = true AND user_id IS NULL;
```

**Broadcast Success Rate (Last 24h)**:
```sql
SELECT
  COUNT(*) as total_broadcasts,
  SUM(success_count) as total_success,
  SUM(failure_count) as total_failures,
  ROUND(100.0 * SUM(success_count) / NULLIF(SUM(recipient_count), 0), 2) as success_rate_pct
FROM broadcast_history
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

## Backup Considerations

- Regular backups of subscriptions table (business critical)
- Point-in-time recovery for accidental deletions
- Archive broadcast_history older than 90 days
- Backup before running migrations (manual or automated)
