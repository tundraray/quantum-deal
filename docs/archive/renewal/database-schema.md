# Subscription Renewal Database Schema

## Table of Contents

1. [Overview](#overview)
2. [Table Definitions](#table-definitions)
3. [Relationships](#relationships)
4. [Queries](#queries)
5. [Migrations](#migrations)
6. [Indexes](#indexes)

## Overview

The renewal system uses two primary tables to manage tariffs and track payment transactions. These tables integrate with the existing subscription system while maintaining separation of concerns.

### Design Principles

- **Dual pricing model**: Global tariffs + subscription-specific overrides
- **Flexible periods**: Any number of days (not fixed tiers)
- **Complete audit trail**: Full payment state machine
- **Referential integrity**: Foreign keys with appropriate cascade rules
- **Performance**: Strategic indexes for common queries

## Table Definitions

### renewal_tariffs

Stores pricing configuration for subscription renewals in Telegram Stars.

```sql
CREATE TABLE renewal_tariffs (
  id BIGSERIAL PRIMARY KEY,
  
  -- NULL = global tariff, NOT NULL = subscription-specific override
  subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  -- Renewal period in days (any positive integer)
  period_days INTEGER NOT NULL CHECK (period_days > 0 AND period_days <= 3650),
  
  -- Price in Telegram Stars
  price_stars INTEGER NOT NULL CHECK (price_stars > 0),
  
  -- Display name for UI (e.g., "1 month", "3 months")
  display_name VARCHAR(100) NOT NULL,
  
  -- Optional description
  description VARCHAR(500),
  
  -- Is this tariff active?
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Sort order for display in UI
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one tariff per (subscription, period) combination
  CONSTRAINT uq_renewal_tariff_subscription_period 
    UNIQUE (subscription_id, period_days)
);

-- Indexes
CREATE INDEX idx_renewal_tariffs_subscription_id 
  ON renewal_tariffs(subscription_id);

CREATE INDEX idx_renewal_tariffs_active 
  ON renewal_tariffs(is_active) 
  WHERE is_active = true;

CREATE INDEX idx_renewal_tariffs_sort 
  ON renewal_tariffs(subscription_id, sort_order, period_days);
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| id | BIGSERIAL | Primary key |
| subscription_id | BIGINT NULL | NULL for global, ID for subscription-specific |
| period_days | INTEGER | Renewal period (1-3650 days, ~10 years max) |
| price_stars | INTEGER | Price in Telegram Stars (must be positive) |
| display_name | VARCHAR(100) | UI label (e.g., "1 month", "1 месяц") |
| description | VARCHAR(500) | Optional additional info |
| is_active | BOOLEAN | Active flag (soft delete) |
| sort_order | INTEGER | Display order (lower = first) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Constraints**:

- `period_days`: Must be 1-3650 (prevent unreasonable values)
- `price_stars`: Must be positive
- `uq_renewal_tariff_subscription_period`: Prevents duplicate tariffs for same (subscription, period)

### payment_transactions

Complete audit trail for all Telegram Stars payment transactions.

```sql
CREATE TABLE payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  
  -- User making the payment
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  
  -- Subscription being renewed
  user_subscription_id BIGINT NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  
  -- Tariff used for this payment (nullable for data retention)
  tariff_id BIGINT REFERENCES renewal_tariffs(id) ON DELETE SET NULL,
  
  -- Telegram payment identifiers
  telegram_invoice_id VARCHAR(255),
  telegram_payment_charge_id VARCHAR(255),
  
  -- Payment amount in Telegram Stars
  amount_stars INTEGER NOT NULL CHECK (amount_stars > 0),
  
  -- Renewal period in days (denormalized for audit)
  period_days INTEGER NOT NULL CHECK (period_days > 0),
  
  -- Current payment state
  state VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'paid', 'completed', 'failed', 'refunded', 'expired', 'cancelled')),
  
  -- State transition timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Failure/cancellation/refund details
  failure_reason VARCHAR(500),
  cancellation_reason VARCHAR(500),
  refund_reason VARCHAR(500),
  refund_amount INTEGER CHECK (refund_amount >= 0),
  
  -- Additional metadata (JSONB for flexibility)
  metadata JSONB NOT NULL DEFAULT '{}',
  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payment_transactions_user_id 
  ON payment_transactions(user_id);

CREATE INDEX idx_payment_transactions_state 
  ON payment_transactions(state);

CREATE INDEX idx_payment_transactions_telegram_invoice_id 
  ON payment_transactions(telegram_invoice_id) 
  WHERE telegram_invoice_id IS NOT NULL;

CREATE INDEX idx_payment_transactions_created_at 
  ON payment_transactions(created_at DESC);

CREATE INDEX idx_payment_transactions_user_subscription 
  ON payment_transactions(user_subscription_id);

-- Composite index for pending payment cleanup
CREATE INDEX idx_payment_transactions_pending_cleanup 
  ON payment_transactions(state, created_at) 
  WHERE state = 'pending';
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| id | BIGSERIAL | Primary key |
| user_id | BIGINT | User making payment (FK to users.telegram_id) |
| user_subscription_id | BIGINT | Subscription being renewed (FK) |
| tariff_id | BIGINT NULL | Tariff used (NULL if tariff deleted) |
| telegram_invoice_id | VARCHAR | Telegram invoice identifier |
| telegram_payment_charge_id | VARCHAR | Telegram payment charge ID |
| amount_stars | INTEGER | Payment amount in Stars |
| period_days | INTEGER | Renewal period (denormalized for audit) |
| state | VARCHAR(20) | Current payment state |
| created_at | TIMESTAMPTZ | Transaction created |
| paid_at | TIMESTAMPTZ | Payment confirmed by Telegram |
| completed_at | TIMESTAMPTZ | Subscription successfully extended |
| failed_at | TIMESTAMPTZ | Payment failed |
| refunded_at | TIMESTAMPTZ | Payment refunded |
| expired_at | TIMESTAMPTZ | Invoice expired |
| cancelled_at | TIMESTAMPTZ | User cancelled |
| failure_reason | VARCHAR(500) | Why payment failed |
| cancellation_reason | VARCHAR(500) | Why user cancelled |
| refund_reason | VARCHAR(500) | Why refund issued |
| refund_amount | INTEGER | Amount refunded (in Stars) |
| metadata | JSONB | Additional data |
| updated_at | TIMESTAMPTZ | Last update |

**Payment States**:

| State | Description | Terminal | Next States |
|-------|-------------|----------|-------------|
| pending | Invoice created, awaiting payment | No | paid, cancelled, expired, failed |
| paid | Payment confirmed by Telegram | No | completed, failed |
| completed | Subscription successfully renewed | Yes | refunded |
| failed | Payment failed | Yes | - |
| refunded | Payment refunded | Yes | - |
| expired | Invoice expired (24h timeout) | Yes | - |
| cancelled | User cancelled before payment | Yes | - |

## Relationships

```
┌──────────────┐
│ subscriptions│
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────────┐         ┌─────────────────┐
│ renewal_tariffs  │         │ users           │
│                  │         └────────┬────────┘
│ subscription_id ◄┼──┐               │
│   (nullable)     │  │               │ 1:N
└──────────────────┘  │               │
       │              │               ▼
       │ 1:N          │      ┌────────────────────┐
       │              │      │ user_subscriptions │
       │              │      └─────────┬──────────┘
       │              │                │
       │              │                │ 1:N
       ▼              │                │
┌─────────────────────┴───┐            │
│ payment_transactions    │            │
│                         │            │
│ tariff_id (nullable)    │◄───────────┘
│ user_subscription_id    │
│ user_id                 │
└─────────────────────────┘
```

**Relationship Details**:

1. **subscriptions → renewal_tariffs** (1:N)
   - One subscription can have multiple tariffs (different periods)
   - NULL subscription_id = global tariff

2. **renewal_tariffs → payment_transactions** (1:N)
   - One tariff used in many payments
   - ON DELETE SET NULL (preserve audit trail)

3. **user_subscriptions → payment_transactions** (1:N)
   - One subscription can have multiple renewal attempts
   - ON DELETE CASCADE (clean up payments with subscription)

4. **users → payment_transactions** (1:N)
   - One user can make multiple payments
   - ON DELETE CASCADE (GDPR compliance)

## Queries

### Common Read Queries

#### Get Tariffs for Subscription

```sql
-- Get all active tariffs for a specific subscription
-- Returns subscription-specific tariffs + global tariffs
SELECT 
  rt.id,
  rt.subscription_id,
  rt.period_days,
  rt.price_stars,
  rt.display_name,
  rt.description,
  CASE 
    WHEN rt.subscription_id IS NULL THEN 'global'
    ELSE 'subscription_specific'
  END as tariff_type
FROM renewal_tariffs rt
WHERE rt.is_active = true
  AND (rt.subscription_id = $1 OR rt.subscription_id IS NULL)
ORDER BY 
  rt.subscription_id NULLS LAST,  -- Subscription-specific first
  rt.sort_order,
  rt.period_days;
```

**TypeScript (Drizzle)**:
```typescript
const tariffs = await db
  .select()
  .from(renewalTariffs)
  .where(
    and(
      eq(renewalTariffs.isActive, true),
      or(
        eq(renewalTariffs.subscriptionId, subscriptionId),
        isNull(renewalTariffs.subscriptionId),
      ),
    ),
  )
  .orderBy(
    renewalTariffs.subscriptionId, // NULL last (global)
    renewalTariffs.sortOrder,
    renewalTariffs.periodDays,
  );
```

#### Get Global Tariffs Only

```sql
SELECT *
FROM renewal_tariffs
WHERE subscription_id IS NULL
  AND is_active = true
ORDER BY sort_order, period_days;
```

#### Get User Payment History

```sql
SELECT 
  pt.id,
  pt.state,
  pt.amount_stars,
  pt.period_days,
  pt.created_at,
  pt.completed_at,
  s.name as subscription_name,
  rt.display_name as tariff_name
FROM payment_transactions pt
JOIN user_subscriptions us ON pt.user_subscription_id = us.id
JOIN subscriptions s ON us.subscription_id = s.id
LEFT JOIN renewal_tariffs rt ON pt.tariff_id = rt.id
WHERE pt.user_id = $1
ORDER BY pt.created_at DESC
LIMIT 20 OFFSET $2;
```

#### Find Payment by Telegram Invoice ID

```sql
SELECT *
FROM payment_transactions
WHERE telegram_invoice_id = $1
LIMIT 1;
```

#### Get Pending Payments for Cleanup

```sql
-- Find pending payments older than 24 hours
SELECT *
FROM payment_transactions
WHERE state = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours';
```

### Common Write Queries

#### Create Payment Transaction

```sql
INSERT INTO payment_transactions (
  user_id,
  user_subscription_id,
  tariff_id,
  amount_stars,
  period_days,
  state,
  metadata
) VALUES (
  $1, -- user_id
  $2, -- user_subscription_id
  $3, -- tariff_id
  $4, -- amount_stars
  $5, -- period_days
  'pending',
  $6  -- metadata
)
RETURNING *;
```

#### Update Payment State

```sql
-- Transition from PENDING to PAID
UPDATE payment_transactions
SET 
  state = 'paid',
  paid_at = NOW(),
  telegram_invoice_id = $2,
  telegram_payment_charge_id = $3,
  updated_at = NOW()
WHERE id = $1
  AND state = 'pending'
RETURNING *;
```

```sql
-- Transition from PAID to COMPLETED
UPDATE payment_transactions
SET 
  state = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
WHERE id = $1
  AND state = 'paid'
RETURNING *;
```

```sql
-- Mark as EXPIRED
UPDATE payment_transactions
SET 
  state = 'expired',
  expired_at = NOW(),
  updated_at = NOW()
WHERE id = $1
  AND state = 'pending'
RETURNING *;
```

#### Extend Subscription

```sql
-- Add days to subscription expiry
UPDATE user_subscriptions
SET 
  expires_at = CASE
    WHEN expires_at > NOW() THEN expires_at + INTERVAL '$2 days'
    ELSE NOW() + INTERVAL '$2 days'
  END,
  is_active = true,  -- Reactivate if expired
  updated_at = NOW()
WHERE id = $1
RETURNING *;
```

**TypeScript (Drizzle)**:
```typescript
await db
  .update(userSubscriptions)
  .set({
    expiresAt: sql`
      CASE 
        WHEN ${userSubscriptions.expiresAt} > NOW() 
        THEN ${userSubscriptions.expiresAt} + INTERVAL '${periodDays} days'
        ELSE NOW() + INTERVAL '${periodDays} days'
      END
    `,
    isActive: true,
    updatedAt: new Date(),
  })
  .where(eq(userSubscriptions.id, userSubscriptionId));
```

### Analytics Queries

#### Payment Success Rate

```sql
-- Success rate by state (last 30 days)
SELECT 
  state,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY state
ORDER BY count DESC;
```

#### Revenue by Period

```sql
-- Revenue grouped by renewal period
SELECT 
  period_days,
  COUNT(*) as renewals,
  SUM(amount_stars) as total_stars,
  ROUND(AVG(amount_stars), 2) as avg_stars
FROM payment_transactions
WHERE state = 'completed'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY period_days
ORDER BY period_days;
```

#### Failed Payments Analysis

```sql
-- Top failure reasons
SELECT 
  failure_reason,
  COUNT(*) as count
FROM payment_transactions
WHERE state = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY failure_reason
ORDER BY count DESC
LIMIT 10;
```

#### User Renewal Patterns

```sql
-- Users with multiple renewals
SELECT 
  user_id,
  COUNT(*) as renewal_count,
  SUM(amount_stars) as total_spent,
  MIN(created_at) as first_renewal,
  MAX(created_at) as last_renewal
FROM payment_transactions
WHERE state = 'completed'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY renewal_count DESC;
```

## Migrations

### Initial Migration

**File**: `libs/db/migrations/YYYYMMDD_create_renewal_tables.sql`

```sql
-- Create renewal_tariffs table
CREATE TABLE renewal_tariffs (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE CASCADE,
  period_days INTEGER NOT NULL CHECK (period_days > 0 AND period_days <= 3650),
  price_stars INTEGER NOT NULL CHECK (price_stars > 0),
  display_name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_renewal_tariff_subscription_period 
    UNIQUE (subscription_id, period_days)
);

CREATE INDEX idx_renewal_tariffs_subscription_id 
  ON renewal_tariffs(subscription_id);

CREATE INDEX idx_renewal_tariffs_active 
  ON renewal_tariffs(is_active) 
  WHERE is_active = true;

CREATE INDEX idx_renewal_tariffs_sort 
  ON renewal_tariffs(subscription_id, sort_order, period_days);

-- Create payment_transactions table
CREATE TABLE payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  user_subscription_id BIGINT NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  tariff_id BIGINT REFERENCES renewal_tariffs(id) ON DELETE SET NULL,
  telegram_invoice_id VARCHAR(255),
  telegram_payment_charge_id VARCHAR(255),
  amount_stars INTEGER NOT NULL CHECK (amount_stars > 0),
  period_days INTEGER NOT NULL CHECK (period_days > 0),
  state VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'paid', 'completed', 'failed', 'refunded', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  failure_reason VARCHAR(500),
  cancellation_reason VARCHAR(500),
  refund_reason VARCHAR(500),
  refund_amount INTEGER CHECK (refund_amount >= 0),
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_user_id 
  ON payment_transactions(user_id);

CREATE INDEX idx_payment_transactions_state 
  ON payment_transactions(state);

CREATE INDEX idx_payment_transactions_telegram_invoice_id 
  ON payment_transactions(telegram_invoice_id) 
  WHERE telegram_invoice_id IS NOT NULL;

CREATE INDEX idx_payment_transactions_created_at 
  ON payment_transactions(created_at DESC);

CREATE INDEX idx_payment_transactions_user_subscription 
  ON payment_transactions(user_subscription_id);

CREATE INDEX idx_payment_transactions_pending_cleanup 
  ON payment_transactions(state, created_at) 
  WHERE state = 'pending';
```

### Seed Migration

**File**: `scripts/seed-renewal-tariffs.ts`

```typescript
import { db } from '../libs/db/src';
import { renewalTariffs } from '../libs/db/src/schema';

async function seedRenewalTariffs() {
  console.log('Seeding renewal tariffs...');
  
  const globalTariffs = [
    {
      subscriptionId: null,
      periodDays: 30,
      priceStars: 100,
      displayName: '1 month',
      description: 'Renew for 1 month',
      sortOrder: 1,
    },
    {
      subscriptionId: null,
      periodDays: 90,
      priceStars: 250,
      displayName: '3 months',
      description: 'Renew for 3 months (~17% discount)',
      sortOrder: 2,
    },
    {
      subscriptionId: null,
      periodDays: 180,
      priceStars: 450,
      displayName: '6 months',
      description: 'Renew for 6 months (~25% discount)',
      sortOrder: 3,
    },
    {
      subscriptionId: null,
      periodDays: 365,
      priceStars: 800,
      displayName: '12 months',
      description: 'Renew for 12 months (~33% discount)',
      sortOrder: 4,
    },
  ];
  
  for (const tariff of globalTariffs) {
    await db.insert(renewalTariffs).values(tariff).onConflictDoNothing();
  }
  
  console.log(`Seeded ${globalTariffs.length} global tariffs`);
}

seedRenewalTariffs()
  .catch(console.error)
  .finally(() => process.exit(0));
```

## Indexes

### Performance Indexes

**renewal_tariffs**:
```sql
-- Fast lookup by subscription
idx_renewal_tariffs_subscription_id (subscription_id)

-- Filter active tariffs only
idx_renewal_tariffs_active (is_active) WHERE is_active = true

-- UI display order
idx_renewal_tariffs_sort (subscription_id, sort_order, period_days)
```

**payment_transactions**:
```sql
-- User payment history
idx_payment_transactions_user_id (user_id)

-- State-based queries
idx_payment_transactions_state (state)

-- Telegram invoice lookup (webhook)
idx_payment_transactions_telegram_invoice_id (telegram_invoice_id) 
  WHERE telegram_invoice_id IS NOT NULL

-- Analytics (time-based)
idx_payment_transactions_created_at (created_at DESC)

-- Subscription renewal history
idx_payment_transactions_user_subscription (user_subscription_id)

-- Pending cleanup cron
idx_payment_transactions_pending_cleanup (state, created_at) 
  WHERE state = 'pending'
```

### Index Usage Patterns

| Query | Index Used | Performance |
|-------|-----------|-------------|
| Get tariffs for subscription | idx_renewal_tariffs_subscription_id | O(log n) |
| Find payment by invoice ID | idx_payment_transactions_telegram_invoice_id | O(1) |
| User payment history | idx_payment_transactions_user_id | O(log n) |
| Pending payment cleanup | idx_payment_transactions_pending_cleanup | O(log n) |
| Analytics by state | idx_payment_transactions_state | O(log n) |

## Best Practices

### Transaction Integrity

Always use database transactions for state changes:

```typescript
await db.transaction(async (tx) => {
  // Update payment state
  await tx
    .update(paymentTransactions)
    .set({ state: 'paid', paidAt: new Date() })
    .where(eq(paymentTransactions.id, transactionId));
  
  // Extend subscription
  await tx
    .update(userSubscriptions)
    .set({ expiresAt: sql`expires_at + INTERVAL '${periodDays} days'` })
    .where(eq(userSubscriptions.id, userSubscriptionId));
});
```

### Soft Deletes

Use `is_active = false` for tariffs instead of DELETE:

```sql
-- Deactivate tariff (soft delete)
UPDATE renewal_tariffs
SET is_active = false, updated_at = NOW()
WHERE id = $1;
```

**Why**: Preserves audit trail in payment_transactions.tariff_id

### Denormalization

`payment_transactions` denormalizes data for audit purposes:
- `amount_stars` - copied from tariff (tariff price may change)
- `period_days` - copied from tariff (tariff may be deleted)

**Benefit**: Complete audit trail even if tariff deleted/modified

## Related Documentation

- [Architecture](./architecture.md) - System design
- [Telegram Stars Integration](./telegram-stars-integration.md) - Payment API
- [Implementation Plan](./implementation-plan.md) - Development guide

---

**Version**: 1.0
**Last Updated**: 2025-01-21

