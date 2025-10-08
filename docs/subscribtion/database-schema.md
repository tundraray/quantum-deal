# Database Schema Design

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
  subscribeId: integer('subscribe_id').references(() => subscriptions.id),
  subscribeExpirationDate: timestamp('subscribe_expiration_date', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Current Usage**:
- Stores user information and subscription status
- `subscribeId` links user to subscription
- `isActive` flag already exists for user deactivation

## Required Schema Changes

### 1. Extend `subscriptions` Table

Add `type` field to distinguish subscription types, plus lifecycle management fields:

```typescript
export const subscriptions = pgTable('subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('signals'), // NEW - CRITICAL
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
  - Length: varchar(50) to accommodate dynamic UIDs
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

## Database Migrations with Drizzle Kit

This project uses **Drizzle Kit** for managing database migrations. The migration process is automated through schema changes.

### Migration Workflow

1. **Update Drizzle Schema Files** (see sections below)
2. **Generate Migration**: `pnpm run db:generate`
3. **Review Generated SQL**: Check files in `libs/db/migrations/`
4. **Apply Migration**: `pnpm run db:migrate`

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
ALTER TABLE "subscriptions" ADD COLUMN "type" varchar(20) DEFAULT 'signals' NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN "category" varchar(50);
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

## Drizzle Schema Files

### Updated `libs/db/src/schema/subscriptions.ts`

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

// Define subscription type constant for signals
export const SubscriptionType = {
  SIGNALS: 'signals',
} as const;

// Helper to generate broadcast subscription type
import { nanoid } from 'nanoid';

export function generateSubscriptionUID(): string {
  return nanoid(10); // Generates 10-character UID (e.g., 'V1StGXR8_Z')
}

export function generateBroadcastSubscriptionType(): string {
  return `subscription_${generateSubscriptionUID()}`;
}

// Helper to check if subscription is broadcast type
export function isBroadcastSubscription(type: string): boolean {
  return type.startsWith('subscription_');
}

export const subscriptions = pgTable('subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),
  type: varchar('type', { length: 50 }).notNull().default(SubscriptionType.SIGNALS), // NEW - supports dynamic 'subscription_{uid}'
  scope: jsonb('scope').$type<string[] | null>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  closedBy: bigint('closed_by', { mode: 'number' }).references(() => managers.telegramId),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
```

### Updated `libs/db/src/schema/codes.ts`

```typescript
import { pgTable, timestamp, varchar, bigint, boolean } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';
import { users } from './users';
import { managers } from './managers';

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
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Code = typeof codes.$inferSelect;
export type NewCode = typeof codes.$inferInsert;
```

### New `libs/db/src/schema/broadcast-history.ts`

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

export const broadcastHistory = pgTable('broadcast_history', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  managerId: bigint('manager_id', { mode: 'number' })
    .notNull()
    .references(() => managers.telegramId, { onDelete: 'set null' }),
  message: text('message').notNull(),
  recipientCount: integer('recipient_count').notNull(),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
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

-- Create test broadcast subscriptions (new type for broadcast feature)
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
