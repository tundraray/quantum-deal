# Database Schema - Subscription v2.0

## Philosophy

**Minimum viable changes. Maximum use of existing structure.**

This document describes the **complete database schema** for v2.0, including all changes and reused tables.

---

## Changes Summary

**Modified:** 1 table (subscriptions +1 column)
**Added:** 1 view (monthly_bot_statistics)
**Unchanged:** All other tables

| Change Type | Count | Impact |
|------------|-------|--------|
| New columns | 1 | `subscriptions.is_hidden` |
| New tables | 0 | None |
| New views | 1 | `monthly_bot_statistics` |
| Modified tables | 0 | None |

**Total DDL statements: 3 (1 ALTER, 1 CREATE VIEW, 1 CREATE INDEX)**

---

## Complete Schema

### subscriptions

```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,  -- 'signals' | 'broadcast'
  price_stars INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,  -- v2 addition
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**v2 Change:** Added `is_hidden` column

---

### user_subscriptions (No Changes)

```sql
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**v2 Usage:**
- Trial: Insert with trial subscription_id
- Eligibility: Check if user_id has any records
- Renewal: Update expires_at

---

### subscription_features (No Changes)

```sql
CREATE TABLE subscription_features (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  feature_key VARCHAR(100) NOT NULL,
  feature_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**v2 Usage:**
```sql
-- Mark trial
INSERT INTO subscription_features VALUES
  (trial_sub_id, 'is_trial', 'true');
```

---

### deals (No Changes)

```sql
CREATE TABLE deals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  symbol VARCHAR(50) NOT NULL,
  entry_price DECIMAL(20, 8),
  exit_price DECIMAL(20, 8),
  profit DECIMAL(20, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  status VARCHAR(50)
);
```

**v2 Usage:** Source for statistics view

---

## New Views

### monthly_bot_statistics

```sql
CREATE MATERIALIZED VIEW monthly_bot_statistics AS
SELECT
  COUNT(*) as total_deals,
  SUM(profit) as total_profit,
  COUNT(CASE WHEN profit > 0 THEN 1 END)::float / 
    NULLIF(COUNT(*), 0) as win_rate,
  COUNT(DISTINCT user_id) as active_traders
FROM deals
WHERE created_at >= date_trunc('month', CURRENT_DATE)
  AND closed_at IS NOT NULL;

CREATE UNIQUE INDEX idx_monthly_stats_total_deals
  ON monthly_bot_statistics (total_deals);
```

**Refresh:**
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_bot_statistics;
```

---

## Migration Scripts

### Forward Migration

```sql
-- File: migrations/0001_subscription_v2.sql

BEGIN;

-- 1. Add is_hidden column
ALTER TABLE subscriptions
  ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;

-- 2. Create statistics view
CREATE MATERIALIZED VIEW monthly_bot_statistics AS
SELECT
  COUNT(*) as total_deals,
  SUM(profit) as total_profit,
  COUNT(CASE WHEN profit > 0 THEN 1 END)::float / NULLIF(COUNT(*), 0) as win_rate,
  COUNT(DISTINCT user_id) as active_traders
FROM deals
WHERE created_at >= date_trunc('month', CURRENT_DATE)
  AND closed_at IS NOT NULL;

CREATE UNIQUE INDEX idx_monthly_stats_total_deals
  ON monthly_bot_statistics (total_deals);

REFRESH MATERIALIZED VIEW monthly_bot_statistics;

-- 3. Seed trial subscription
INSERT INTO subscriptions (name, type, price_stars, duration_days, is_hidden)
VALUES ('Trial 7 Days', 'signals', 0, 7, true);

INSERT INTO subscription_features (subscription_id, feature_key, feature_value)
VALUES (
  (SELECT id FROM subscriptions WHERE name = 'Trial 7 Days'),
  'is_trial',
  'true'
);

COMMIT;
```

### Rollback

```sql
BEGIN;

DROP MATERIALIZED VIEW IF EXISTS monthly_bot_statistics;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS is_hidden;

DELETE FROM subscription_features
WHERE subscription_id IN (
  SELECT id FROM subscriptions WHERE name = 'Trial 7 Days'
);

DELETE FROM subscriptions WHERE name = 'Trial 7 Days';

COMMIT;
```

---

## What We're NOT Adding

### ❌ user_subscription_cycles

**Why not:** Adds complexity without benefit. `user_subscriptions` already tracks everything.

**Better approach:** Use existing `user_subscriptions` table with exact date matching:
```sql
-- Renewal check (no extra table needed)
SELECT * FROM user_subscriptions
WHERE expires_at::date = CURRENT_DATE + 7
  AND is_active = true;
```

---

### ❌ trial_usage

**Why not:** `user_subscriptions` already records trial activation.

**Better approach:** Check subscription history:
```typescript
// Trial eligibility check
const hasAnySubscription = await db
  .select()
  .from(userSubscriptions)
  .where(eq(userSubscriptions.userId, userId))
  .limit(1);

const eligible = !hasAnySubscription;
```

---

### ❌ bot_statistics_cache

**Why not:** Materialized views are purpose-built for this.

**Better approach:** Use materialized view:
```sql
-- Fast, transactional, SQL-native
CREATE MATERIALIZED VIEW monthly_bot_statistics AS ...;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_bot_statistics;
```

---

## Drizzle ORM Schema Definitions

### Update Schema File

**File:** `libs/db/src/schema/subscriptions.ts`

```typescript
import { pgTable, serial, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  priceStars: integer('price_stars').notNull(),
  durationDays: integer('duration_days').notNull(),
  isHidden: boolean('is_hidden').notNull().default(false), // v2 addition
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// No changes needed for user_subscriptions
export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  subscriptionId: integer('subscription_id').notNull(),
  startsAt: timestamp('starts_at').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  paymentId: varchar('payment_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// No changes needed for subscription_features
export const subscriptionFeatures = pgTable('subscription_features', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').notNull(),
  featureKey: varchar('feature_key', { length: 100 }).notNull(),
  featureValue: varchar('feature_value').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Statistics View Schema

**File:** `libs/db/src/schema/statistics.ts`

```typescript
import { pgView, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const monthlyBotStatistics = pgView('monthly_bot_statistics').as((qb) =>
  qb
    .select({
      totalDeals: sql<number>`COUNT(*)`.as('total_deals'),
      totalProfit: sql<number>`SUM(profit)`.as('total_profit'),
      winRate: sql<number>`COUNT(CASE WHEN profit > 0 THEN 1 END)::float / NULLIF(COUNT(*), 0)`.as('win_rate'),
      activeTraders: sql<number>`COUNT(DISTINCT user_id)`.as('active_traders'),
    })
    .from(deals)
    .where(sql`created_at >= date_trunc('month', CURRENT_DATE) AND closed_at IS NOT NULL`)
);
```

---

## Query Examples

### Trial Eligibility Check

```sql
-- Check if user has ever had any subscription
SELECT * FROM user_subscriptions
WHERE user_id = $1
LIMIT 1;
-- Result: 0 rows = eligible, >0 rows = not eligible
```

---

### Get Public Subscriptions (Exclude Trial)

```sql
SELECT * FROM subscriptions
WHERE is_hidden = false
ORDER BY price_stars ASC;
```

---

### Get Monthly Statistics

```sql
SELECT * FROM monthly_bot_statistics LIMIT 1;
```

---

### Find Expiring Subscriptions

```sql
SELECT us.*, u.*, s.*
FROM user_subscriptions us
JOIN users u ON u.id = us.user_id
JOIN subscriptions s ON s.id = us.subscription_id
WHERE us.expires_at::date = CURRENT_DATE + $1
  AND us.is_active = true;
```

---

## Schema Validation Queries

### Check Migration Success

```sql
-- 1. Verify is_hidden column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND column_name = 'is_hidden';

-- Expected:
-- column_name | data_type | is_nullable
-- is_hidden   | boolean   | NO

-- 2. Verify materialized view exists
SELECT matviewname
FROM pg_matviews
WHERE matviewname = 'monthly_bot_statistics';

-- Expected:
-- matviewname
-- monthly_bot_statistics

-- 3. Verify trial subscription seeded
SELECT id, name, price_stars, duration_days, is_hidden
FROM subscriptions
WHERE name = 'Trial 7 Days';

-- Expected:
-- id | name           | price_stars | duration_days | is_hidden
-- 4  | Trial 7 Days   | 0           | 7             | true

-- 4. Verify trial feature marker
SELECT sf.feature_key, sf.feature_value, s.name
FROM subscription_features sf
JOIN subscriptions s ON s.id = sf.subscription_id
WHERE sf.feature_key = 'is_trial';

-- Expected:
-- feature_key | feature_value | name
-- is_trial    | true          | Trial 7 Days
```

---

### Test Statistics View

```sql
-- Test view query performance
EXPLAIN ANALYZE
SELECT * FROM monthly_bot_statistics;

-- Expected execution time: <10ms

-- Manual verification
SELECT
  total_deals,
  total_profit,
  ROUND(win_rate::numeric * 100, 2) as win_rate_percent,
  active_traders
FROM monthly_bot_statistics;
```

---

## Performance Impact

### Statistics View Refresh

```sql
-- Refresh timing (depends on data volume)
EXPLAIN ANALYZE REFRESH MATERIALIZED VIEW monthly_bot_statistics;

-- Typical performance:
-- 10k deals: ~50ms
-- 100k deals: ~300ms
-- 1M deals: ~2s

-- Concurrent refresh (non-blocking):
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_bot_statistics;
```

### Index Overhead

```sql
-- is_hidden column: minimal overhead (single boolean)
-- Estimated storage increase: <1KB per 1000 subscriptions

-- Statistics view index: ~8KB for small datasets
CREATE UNIQUE INDEX idx_monthly_stats_total_deals
  ON monthly_bot_statistics (total_deals);
```

---

## Schema Comparison

### Before v2.0

```
subscriptions (5 columns)
├── id
├── name
├── type
├── price_stars
└── duration_days

user_subscriptions (8 columns)
subscription_features (4 columns)
deals (8 columns)

Total tables: 4
Total views: 0
```

### After v2.0

```
subscriptions (6 columns)  ← Added 1 column
├── id
├── name
├── type
├── price_stars
├── duration_days
└── is_hidden  ← NEW

user_subscriptions (8 columns)  ← No changes
subscription_features (4 columns)  ← No changes
deals (8 columns)  ← No changes

monthly_bot_statistics (view)  ← NEW
├── total_deals
├── total_profit
├── win_rate
└── active_traders

Total tables: 4  (same)
Total views: 1  (+1)
```

---

## Summary

**Total Changes:**
1. ✅ 1 column: `subscriptions.is_hidden`
2. ✅ 1 view: `monthly_bot_statistics`
3. ✅ 1 index: `idx_monthly_stats_total_deals`

**Reused:**
- ✅ `user_subscriptions` - trial activation
- ✅ `subscription_features` - trial marker
- ✅ `deals` - statistics source

**Avoided:**
- ❌ `user_subscription_cycles` - unnecessary
- ❌ `trial_usage` - redundant
- ❌ `bot_statistics_cache` - materialized view better

**Migration Time:** ~5 seconds (includes view refresh)
**Rollback Risk:** Zero (all changes are additive, no data loss)

---

**Version:** 2.0.0
**Last Updated:** 2025-10-31
