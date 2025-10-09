# Unified Subscription Architecture - Rollout Plan

## Executive Summary

This rollout plan provides a detailed, step-by-step migration from the current subscription architecture (users.subscribeId + codes.userId) to a unified `user_subscriptions` table. The migration is designed for **zero-downtime** with **dual-write strategy** and **rollback capability** at each phase.

**Current State (AS-IS):**
- Signals subscriptions: ONE per user via `users.subscribeId` (one-to-one)
- Broadcast activations: Via `codes.userId + activationDate + expirationDate`
- Mixed concerns: invitation codes contain activation data

**Target State (TO-BE):**
- Both subscription types: MULTIPLE per user via `user_subscriptions` (many-to-many)
- Clean separation: codes are invitation catalog only
- Unified query interface: single source of truth for all subscriptions

**Migration Strategy:**
1. Create new table without breaking existing functionality
2. Dual-write to both old and new systems
3. Migrate historical data with verification
4. Switch reads to new system
5. Remove old columns and code

---

## Phase 1: Schema & Repository Setup

**Goal:** Create `user_subscriptions` table and infrastructure without affecting current system.

**Duration:** 1 day
**Risk:** Low (additive changes only)

### Step 1.1: Create Schema File

**File:** `libs/db/src/schema/user-subscriptions.ts`

```typescript
import { pgTable, timestamp, bigint, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { subscriptions } from './subscriptions';

export const userSubscriptions = pgTable('user_subscriptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.telegramId, { onDelete: 'cascade' }),
  subscriptionId: bigint('subscription_id', { mode: 'number' })
    .notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  activatedAt: timestamp('activated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
```

**Commands:**
```bash
# Create schema file
cd "D:\git\github\tg-bots\quantum-deal"
# Use Write tool to create the file above
```

### Step 1.2: Export Schema

**File:** `libs/db/src/schema/index.ts`

Add export:
```typescript
export * from './user-subscriptions';
```

### Step 1.3: Generate Migration

**Commands:**
```bash
cd "D:\git\github\tg-bots\quantum-deal"
pnpm run db:generate
```

**Review generated migration file** in `libs/db/migrations/[timestamp]_create_user_subscriptions.sql`

### Step 1.4: Enhance Migration with Indexes

**Manually append to migration file:**

```sql
-- ====================================================================================
-- MANUAL ENHANCEMENTS (added after Drizzle generation)
-- ====================================================================================

-- 1. Unique constraint: prevent duplicate subscriptions
DO $$ BEGIN
  ALTER TABLE user_subscriptions
  ADD CONSTRAINT unique_user_subscription UNIQUE (user_id, subscription_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user
  ON user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription
  ON user_subscriptions(subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_active
  ON user_subscriptions(user_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires
  ON user_subscriptions(expires_at)
  WHERE expires_at IS NOT NULL AND is_active = true;

-- 3. Column comments
COMMENT ON TABLE user_subscriptions IS 'Unified many-to-many relationship between users and subscriptions';
COMMENT ON COLUMN user_subscriptions.user_id IS 'User telegram ID - replaces users.subscribeId';
COMMENT ON COLUMN user_subscriptions.subscription_id IS 'Subscription ID - replaces codes.userId linkage';
COMMENT ON COLUMN user_subscriptions.activated_at IS 'Activation timestamp - replaces codes.activationDate';
COMMENT ON COLUMN user_subscriptions.expires_at IS 'Expiration timestamp - replaces codes.expirationDate and users.subscribeExpirationDate';
```

### Step 1.5: Apply Migration

**Commands:**
```bash
pnpm run db:migrate
```

**Verify:**
```bash
pnpm run db:studio
# Check that user_subscriptions table exists with indexes
```

### Step 1.6: Create Repository

**File:** `libs/db/src/repositories/user-subscriptions.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import {
  userSubscriptions,
  NewUserSubscription,
  UserSubscription,
  subscriptions,
  users
} from '../schema';

@Injectable()
export class UserSubscriptionsRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async create(data: NewUserSubscription): Promise<UserSubscription> {
    const [result] = await this.db
      .insert(userSubscriptions)
      .values(data)
      .returning();
    return result;
  }

  async findByUserId(userId: number): Promise<UserSubscription[]> {
    return await this.db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.isActive, true)
        )
      )
      .orderBy(desc(userSubscriptions.activatedAt));
  }

  async findByUserIdAndType(
    userId: number,
    subscriptionType: string
  ): Promise<Array<UserSubscription & { subscription: typeof subscriptions.$inferSelect }>> {
    return await this.db
      .select({
        userSubscription: userSubscriptions,
        subscription: subscriptions,
      })
      .from(userSubscriptions)
      .innerJoin(subscriptions, eq(subscriptions.id, userSubscriptions.subscriptionId))
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.isActive, true),
          eq(subscriptions.type, subscriptionType)
        )
      );
  }

  async findBySubscriptionId(subscriptionId: number): Promise<UserSubscription[]> {
    return await this.db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.subscriptionId, subscriptionId),
          eq(userSubscriptions.isActive, true)
        )
      );
  }

  async isUserSubscribed(userId: number, subscriptionId: number): Promise<boolean> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.subscriptionId, subscriptionId),
          eq(userSubscriptions.isActive, true)
        )
      );

    return (result?.count ?? 0) > 0;
  }

  async activate(
    userId: number,
    subscriptionId: number,
    expiresAt?: Date
  ): Promise<UserSubscription> {
    return await this.create({
      userId,
      subscriptionId,
      expiresAt: expiresAt ?? null,
      isActive: true,
    });
  }

  async deactivate(userId: number, subscriptionId: number): Promise<void> {
    await this.db
      .update(userSubscriptions)
      .set({ isActive: false })
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.subscriptionId, subscriptionId)
        )
      );
  }

  async findExpiring(
    daysFromNow: number,
    subscriptionType?: string
  ): Promise<Array<{
    user: typeof users.$inferSelect;
    subscription: typeof subscriptions.$inferSelect;
    userSubscription: UserSubscription;
  }>> {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + daysFromNow);

    const query = this.db
      .select({
        userSubscription: userSubscriptions,
        subscription: subscriptions,
        user: users,
      })
      .from(userSubscriptions)
      .innerJoin(subscriptions, eq(subscriptions.id, userSubscriptions.subscriptionId))
      .innerJoin(users, eq(users.telegramId, userSubscriptions.userId))
      .where(
        and(
          eq(userSubscriptions.isActive, true),
          sql`${userSubscriptions.expiresAt} <= ${expiryThreshold}`,
          sql`${userSubscriptions.expiresAt} > NOW()`
        )
      );

    if (subscriptionType) {
      query.where(eq(subscriptions.type, subscriptionType));
    }

    return await query;
  }
}
```

### Step 1.7: Register Repository

**File:** `libs/db/src/db.module.ts`

```typescript
import { UserSubscriptionsRepository } from './repositories/user-subscriptions.repository';

@Module({
  providers: [
    // ... existing repositories
    UserSubscriptionsRepository,
  ],
  exports: [
    // ... existing repositories
    UserSubscriptionsRepository,
  ],
})
export class DbModule {}
```

### Success Criteria Phase 1

- [ ] `user_subscriptions` table exists in database
- [ ] All indexes created successfully
- [ ] `UserSubscriptionsRepository` class created
- [ ] Repository registered in `DbModule`
- [ ] No errors in `pnpm run build`
- [ ] Existing bot functionality unchanged

### Testing Phase 1

```bash
# Run build
pnpm run build

# Test repository (create test file)
# libs/db/src/repositories/__tests__/user-subscriptions.repository.spec.ts
pnpm test user-subscriptions.repository
```

### Rollback Phase 1

```sql
-- Drop table and indexes
DROP TABLE IF EXISTS user_subscriptions CASCADE;
```

```bash
# Revert code changes
git checkout libs/db/src/schema/user-subscriptions.ts
git checkout libs/db/src/schema/index.ts
git checkout libs/db/src/repositories/user-subscriptions.repository.ts
git checkout libs/db/src/db.module.ts
```

---

## Phase 2: Dual-Write Implementation

**Goal:** Write to BOTH old system (users.subscribeId, codes.userId) AND new system (user_subscriptions) simultaneously.

**Duration:** 2 days
**Risk:** Medium (code changes, requires testing)

### Step 2.1: Create Dual-Write Service

**File:** `libs/db/src/services/subscription-sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { CodesRepository } from '../repositories/codes.repository';
import { UserSubscriptionsRepository } from '../repositories/user-subscriptions.repository';

/**
 * Dual-write service: writes to BOTH old and new subscription systems
 * Used during migration period to maintain consistency
 */
@Injectable()
export class SubscriptionSyncService {
  private readonly logger = new Logger(SubscriptionSyncService.name);

  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly codesRepo: CodesRepository,
    private readonly userSubscriptionsRepo: UserSubscriptionsRepository,
  ) {}

  /**
   * Activate subscription - writes to BOTH systems
   * Old: users.subscribeId + codes.userId/activationDate/expirationDate
   * New: user_subscriptions table
   */
  async activateSubscription(
    userId: number,
    subscriptionId: number,
    expiresAt?: Date,
    codeId?: number,
  ): Promise<void> {
    try {
      // WRITE 1: New system (primary going forward)
      await this.userSubscriptionsRepo.activate(userId, subscriptionId, expiresAt);
      this.logger.log(`[NEW] Activated subscription ${subscriptionId} for user ${userId}`);

      // WRITE 2: Old system (backward compatibility)
      // Update users.subscribeId if signals subscription
      const subscription = await this.getSubscriptionType(subscriptionId);
      if (subscription?.type === 'signals') {
        await this.usersRepo.updateSubscription(userId, subscriptionId, expiresAt);
        this.logger.log(`[OLD] Updated users.subscribeId for user ${userId}`);
      }

      // Update codes table if code was used
      if (codeId) {
        await this.codesRepo.updateActivation(codeId, userId, new Date(), expiresAt);
        this.logger.log(`[OLD] Updated codes.userId for code ${codeId}`);
      }
    } catch (error) {
      this.logger.error(`Dual-write activation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Deactivate subscription - writes to BOTH systems
   */
  async deactivateSubscription(
    userId: number,
    subscriptionId: number,
  ): Promise<void> {
    try {
      // WRITE 1: New system
      await this.userSubscriptionsRepo.deactivate(userId, subscriptionId);
      this.logger.log(`[NEW] Deactivated subscription ${subscriptionId} for user ${userId}`);

      // WRITE 2: Old system
      const subscription = await this.getSubscriptionType(subscriptionId);
      if (subscription?.type === 'signals') {
        await this.usersRepo.updateSubscription(userId, null, null);
        this.logger.log(`[OLD] Cleared users.subscribeId for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Dual-write deactivation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getSubscriptionType(subscriptionId: number) {
    // Helper to determine subscription type
    // Implementation depends on your subscriptions repository
    return null; // Placeholder
  }
}
```

### Step 2.2: Update UsersRepository

**File:** `libs/db/src/repositories/users.repository.ts`

Add methods for old system updates:

```typescript
async updateSubscription(
  userId: number,
  subscriptionId: number | null,
  expiresAt: Date | null,
): Promise<void> {
  await this.db
    .update(users)
    .set({
      subscribeId: subscriptionId,
      subscribeExpirationDate: expiresAt,
    })
    .where(eq(users.telegramId, userId));
}
```

### Step 2.3: Update CodesRepository

**File:** `libs/db/src/repositories/codes.repository.ts`

Add methods for old system updates:

```typescript
async updateActivation(
  codeId: number,
  userId: number,
  activationDate: Date,
  expirationDate?: Date,
): Promise<void> {
  await this.db
    .update(codes)
    .set({
      userId,
      activationDate,
      expirationDate: expirationDate ?? null,
    })
    .where(eq(codes.id, codeId));
}
```

### Step 2.4: Update Bot Activation Logic

**File:** `libs/bot/src/services/subscription-activation.service.ts` (or wherever activation happens)

Replace direct repository calls with dual-write service:

```typescript
// OLD CODE:
// await this.usersRepo.updateSubscription(userId, subscriptionId, expiresAt);
// await this.codesRepo.updateActivation(codeId, userId, new Date(), expiresAt);

// NEW CODE (dual-write):
await this.subscriptionSyncService.activateSubscription(
  userId,
  subscriptionId,
  expiresAt,
  codeId,
);
```

### Success Criteria Phase 2

- [ ] `SubscriptionSyncService` created
- [ ] All activation flows use dual-write
- [ ] Both systems receive writes (verified in logs)
- [ ] No data loss during dual-write period
- [ ] Existing bot functionality works

### Testing Phase 2

**Manual Testing:**
1. Activate subscription via invite code
2. Check `user_subscriptions` table - record exists
3. Check `users.subscribeId` - updated (if signals)
4. Check `codes.userId` - updated
5. Verify logs show dual writes

**Automated Testing:**
```typescript
describe('SubscriptionSyncService', () => {
  it('should write to both old and new systems', async () => {
    await service.activateSubscription(userId, subscriptionId, expiresAt, codeId);

    // Verify new system
    const newRecord = await userSubscriptionsRepo.findByUserId(userId);
    expect(newRecord).toHaveLength(1);

    // Verify old system
    const user = await usersRepo.findById(userId);
    expect(user.subscribeId).toBe(subscriptionId);
  });
});
```

### Rollback Phase 2

```bash
# Revert code changes
git checkout libs/db/src/services/subscription-sync.service.ts
git checkout libs/db/src/repositories/users.repository.ts
git checkout libs/db/src/repositories/codes.repository.ts
git checkout libs/bot/src/services/subscription-activation.service.ts

# Data remains in both systems - no data loss
```

---

## Phase 3: Data Migration

**Goal:** Migrate ALL historical data from old system to new system with verification.

**Duration:** 1 day (+ buffer for large datasets)
**Risk:** High (data integrity critical)

### Step 3.1: Create Migration Script

**File:** `scripts/migrate-subscriptions.ts`

```typescript
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrateSubscriptions() {
  await client.connect();

  console.log('Starting subscription data migration...');

  try {
    // Start transaction
    await client.query('BEGIN');

    // STEP 1: Migrate signals subscriptions from users table
    console.log('Step 1: Migrating signals subscriptions from users...');
    const signalsResult = await client.query(`
      INSERT INTO user_subscriptions (user_id, subscription_id, activated_at, expires_at, is_active)
      SELECT
        telegram_id,
        subscribe_id,
        created_at,
        subscribe_expiration_date,
        true
      FROM users
      WHERE subscribe_id IS NOT NULL
      ON CONFLICT (user_id, subscription_id) DO NOTHING
      RETURNING id
    `);
    console.log(`✓ Migrated ${signalsResult.rowCount} signals subscriptions`);

    // STEP 2: Migrate broadcast subscriptions from codes table
    console.log('Step 2: Migrating broadcast subscriptions from codes...');
    const codesResult = await client.query(`
      INSERT INTO user_subscriptions (user_id, subscription_id, activated_at, expires_at, is_active)
      SELECT
        c.user_id,
        c.subscription_id,
        COALESCE(c.activation_date, c.created_at),
        c.expiration_date,
        true
      FROM codes c
      WHERE c.user_id IS NOT NULL
      ON CONFLICT (user_id, subscription_id) DO NOTHING
      RETURNING id
    `);
    console.log(`✓ Migrated ${codesResult.rowCount} broadcast subscriptions`);

    // STEP 3: Verification
    console.log('Step 3: Verifying migration...');

    const oldSignalsCount = await client.query(`
      SELECT COUNT(*) FROM users WHERE subscribe_id IS NOT NULL
    `);

    const oldCodesCount = await client.query(`
      SELECT COUNT(*) FROM codes WHERE user_id IS NOT NULL
    `);

    const newTotalCount = await client.query(`
      SELECT COUNT(*) FROM user_subscriptions
    `);

    const oldCount = parseInt(oldSignalsCount.rows[0].count) + parseInt(oldCodesCount.rows[0].count);
    const newCount = parseInt(newTotalCount.rows[0].count);

    console.log(`Old system total: ${oldCount} (signals: ${oldSignalsCount.rows[0].count}, codes: ${oldCodesCount.rows[0].count})`);
    console.log(`New system total: ${newCount}`);

    if (newCount < oldCount) {
      throw new Error(`Migration incomplete: expected at least ${oldCount}, got ${newCount}`);
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrateSubscriptions().catch(console.error);
```

### Step 3.2: Run Migration

**Commands:**
```bash
cd "D:\git\github\tg-bots\quantum-deal"

# Backup database first
pg_dump $DATABASE_URL > backup_before_migration.sql

# Run migration script
npx ts-node scripts/migrate-subscriptions.ts
```

### Step 3.3: Verify Data

**SQL Verification Queries:**

```sql
-- 1. Check total counts match
SELECT 'OLD SYSTEM' as source,
  (SELECT COUNT(*) FROM users WHERE subscribe_id IS NOT NULL) +
  (SELECT COUNT(*) FROM codes WHERE user_id IS NOT NULL) as count
UNION ALL
SELECT 'NEW SYSTEM' as source, COUNT(*) as count FROM user_subscriptions;

-- 2. Check for data discrepancies
SELECT
  u.telegram_id,
  u.subscribe_id as old_subscription,
  us.subscription_id as new_subscription,
  u.subscribe_expiration_date as old_expires,
  us.expires_at as new_expires
FROM users u
LEFT JOIN user_subscriptions us ON us.user_id = u.telegram_id
  AND us.subscription_id = u.subscribe_id
WHERE u.subscribe_id IS NOT NULL
  AND us.id IS NULL;
-- Should return 0 rows

-- 3. Check codes migration
SELECT
  c.user_id,
  c.subscription_id,
  us.id as migrated_record
FROM codes c
LEFT JOIN user_subscriptions us ON us.user_id = c.user_id
  AND us.subscription_id = c.subscription_id
WHERE c.user_id IS NOT NULL
  AND us.id IS NULL;
-- Should return 0 rows

-- 4. Sample comparison
SELECT
  us.*,
  u.subscribe_id,
  u.subscribe_expiration_date
FROM user_subscriptions us
JOIN users u ON u.telegram_id = us.user_id
LIMIT 10;
```

### Step 3.4: Create Sync Verification Job

**File:** `libs/db/src/jobs/verify-subscription-sync.job.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

/**
 * Periodic job to verify old and new systems are in sync during dual-write period
 */
@Injectable()
export class VerifySubscriptionSyncJob {
  private readonly logger = new Logger(VerifySubscriptionSyncJob.name);

  constructor(private readonly db: NodePgDatabase) {}

  @Cron(CronExpression.EVERY_HOUR)
  async verifySyncStatus() {
    this.logger.log('Starting subscription sync verification...');

    try {
      // Check signals subscriptions sync
      const [signalsCheck] = await this.db.execute(sql`
        SELECT COUNT(*) as missing_count
        FROM users u
        WHERE u.subscribe_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_subscriptions us
          WHERE us.user_id = u.telegram_id
          AND us.subscription_id = u.subscribe_id
          AND us.is_active = true
        )
      `);

      if (signalsCheck.missing_count > 0) {
        this.logger.error(`❌ Found ${signalsCheck.missing_count} signals subscriptions not in new system`);
      }

      // Check codes sync
      const [codesCheck] = await this.db.execute(sql`
        SELECT COUNT(*) as missing_count
        FROM codes c
        WHERE c.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_subscriptions us
          WHERE us.user_id = c.user_id
          AND us.subscription_id = c.subscription_id
          AND us.is_active = true
        )
      `);

      if (codesCheck.missing_count > 0) {
        this.logger.error(`❌ Found ${codesCheck.missing_count} code activations not in new system`);
      }

      if (signalsCheck.missing_count === 0 && codesCheck.missing_count === 0) {
        this.logger.log('✅ Subscription sync verification passed');
      }
    } catch (error) {
      this.logger.error(`Sync verification failed: ${error.message}`, error.stack);
    }
  }
}
```

### Success Criteria Phase 3

- [ ] Migration script runs without errors
- [ ] All historical data migrated to `user_subscriptions`
- [ ] Verification queries show 0 discrepancies
- [ ] Sync verification job passes
- [ ] Database backup created before migration

### Testing Phase 3

**Verification Checklist:**
1. Run all verification queries - all should return 0 missing rows
2. Check sync verification job logs - should pass
3. Sample 10-20 users manually - verify data matches
4. Check edge cases: expired subscriptions, multiple subscriptions
5. Verify total counts: `SELECT COUNT(*) FROM user_subscriptions` >= old system total

### Rollback Phase 3

**Data is already in both systems** - no rollback needed. The old system data remains untouched.

If new system data is corrupted:
```sql
-- Clear new system
TRUNCATE user_subscriptions;

-- Re-run migration script
npx ts-node scripts/migrate-subscriptions.ts
```

---

## Phase 4: Read Cutover

**Goal:** Switch all READ operations to new system while keeping dual-write active.

**Duration:** 2 days
**Risk:** Medium (query logic changes)

### Step 4.1: Create Read Adapter Service

**File:** `libs/db/src/services/subscription-read.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { UserSubscriptionsRepository } from '../repositories/user-subscriptions.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';

/**
 * Unified read interface for subscriptions
 * Reads from NEW system (user_subscriptions table)
 */
@Injectable()
export class SubscriptionReadService {
  constructor(
    private readonly userSubscriptionsRepo: UserSubscriptionsRepository,
    private readonly subscriptionsRepo: SubscriptionsRepository,
  ) {}

  /**
   * Get all active subscriptions for a user
   * Replaces: users.subscribeId query + codes.userId queries
   */
  async getUserSubscriptions(userId: number) {
    const userSubs = await this.userSubscriptionsRepo.findByUserId(userId);

    // Fetch full subscription details
    const subscriptions = await Promise.all(
      userSubs.map(async (us) => {
        const sub = await this.subscriptionsRepo.findById(us.subscriptionId);
        return {
          ...sub,
          activatedAt: us.activatedAt,
          expiresAt: us.expiresAt,
          isActive: us.isActive,
        };
      })
    );

    return subscriptions;
  }

  /**
   * Check if user has specific subscription
   */
  async hasSubscription(userId: number, subscriptionId: number): Promise<boolean> {
    return await this.userSubscriptionsRepo.isUserSubscribed(userId, subscriptionId);
  }

  /**
   * Get users with expiring subscriptions
   * Replaces: UsersRepository.findUsersWithExpiringSubscriptions()
   */
  async getExpiringSubscriptions(daysFromNow: number, subscriptionType?: string) {
    return await this.userSubscriptionsRepo.findExpiring(daysFromNow, subscriptionType);
  }

  /**
   * Get all subscribers for a subscription
   * Replaces: UsersRepository.findBySubscription()
   */
  async getSubscriptionUsers(subscriptionId: number) {
    const userSubs = await this.userSubscriptionsRepo.findBySubscriptionId(subscriptionId);
    return userSubs.map(us => us.userId);
  }
}
```

### Step 4.2: Update Service Layer

**Files to update:**

1. **Subscription Expiration Service**
   ```typescript
   // File: libs/bot/src/services/subscription-expiration.service.ts

   // OLD:
   // const users = await this.usersRepo.findUsersWithExpiringSubscriptions(daysFromNow);

   // NEW:
   const expiring = await this.subscriptionReadService.getExpiringSubscriptions(daysFromNow, 'signals');
   ```

2. **Broadcast Service**
   ```typescript
   // File: libs/masterbot/src/services/broadcast.service.ts

   // OLD:
   // const subscribers = await this.usersRepo.findBySubscription(subscriptionId);

   // NEW:
   const userIds = await this.subscriptionReadService.getSubscriptionUsers(subscriptionId);
   const subscribers = await this.usersRepo.findByIds(userIds);
   ```

3. **User Profile Service**
   ```typescript
   // File: libs/bot/src/services/user-profile.service.ts

   // OLD:
   // const user = await this.usersRepo.findById(userId);
   // const subscription = user.subscribeId ? await this.subscriptionsRepo.findById(user.subscribeId) : null;

   // NEW:
   const subscriptions = await this.subscriptionReadService.getUserSubscriptions(userId);
   ```

### Step 4.3: Update UsersRepository

**File:** `libs/db/src/repositories/users.repository.ts`

Add helper method for batch user fetching:

```typescript
async findByIds(userIds: number[]): Promise<User[]> {
  if (userIds.length === 0) return [];

  return await this.db
    .select()
    .from(users)
    .where(sql`${users.telegramId} = ANY(${userIds})`);
}
```

### Step 4.4: Feature Flag (Optional)

Create feature flag to toggle between old/new reads:

```typescript
// libs/framework/src/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_UNIFIED_SUBSCRIPTIONS: process.env.USE_UNIFIED_SUBSCRIPTIONS === 'true',
};

// In SubscriptionReadService:
async getUserSubscriptions(userId: number) {
  if (!FEATURE_FLAGS.USE_UNIFIED_SUBSCRIPTIONS) {
    // Fallback to old system
    return this.getOldSystemSubscriptions(userId);
  }

  // New system
  return this.getNewSystemSubscriptions(userId);
}
```

### Success Criteria Phase 4

- [ ] All read queries use new system
- [ ] No queries to `users.subscribeId` for reads
- [ ] No queries to `codes.userId` for reads
- [ ] Feature flag works (if implemented)
- [ ] Bot functionality unchanged from user perspective
- [ ] Performance metrics similar or better

### Testing Phase 4

**Comparison Testing:**
```typescript
describe('Read Cutover', () => {
  it('should return same data from old and new systems', async () => {
    // Read from old system
    const oldData = await oldSystemService.getUserSubscription(userId);

    // Read from new system
    const newData = await subscriptionReadService.getUserSubscriptions(userId);

    // Compare
    expect(newData).toMatchObject(oldData);
  });
});
```

**Load Testing:**
```bash
# Compare query performance
EXPLAIN ANALYZE SELECT ... FROM users WHERE subscribe_id = 123;
EXPLAIN ANALYZE SELECT ... FROM user_subscriptions WHERE user_id = 123;
```

### Rollback Phase 4

**Toggle feature flag:**
```bash
# .env
USE_UNIFIED_SUBSCRIPTIONS=false
```

**Or revert code:**
```bash
git checkout libs/db/src/services/subscription-read.service.ts
git checkout libs/bot/src/services/subscription-expiration.service.ts
git checkout libs/masterbot/src/services/broadcast.service.ts
git checkout libs/bot/src/services/user-profile.service.ts
```

---

## Phase 5: Cleanup & Optimization

**Goal:** Remove old system columns and optimize new system.

**Duration:** 1 day
**Risk:** Medium (irreversible changes)

### Step 5.1: Stop Dual-Write

**Remove dual-write service usage:**

```typescript
// Replace SubscriptionSyncService calls with direct UserSubscriptionsRepository calls

// OLD (dual-write):
await this.subscriptionSyncService.activateSubscription(userId, subscriptionId, expiresAt, codeId);

// NEW (single write):
await this.userSubscriptionsRepo.activate(userId, subscriptionId, expiresAt);
```

**Commands:**
```bash
# Find all usages
grep -r "SubscriptionSyncService" libs/
grep -r "subscriptionSyncService" libs/

# Replace with direct repository calls
```

### Step 5.2: Create Cleanup Migration

**Generate migration:**
```bash
pnpm run db:generate
```

**Manually create migration file:**

`libs/db/migrations/[timestamp]_remove_old_subscription_fields.sql`

```sql
-- ====================================================================================
-- CLEANUP: Remove old subscription fields
-- WARNING: Irreversible - ensure Phase 4 is stable before running!
-- ====================================================================================

-- STEP 1: Remove users table fields
ALTER TABLE users DROP COLUMN IF EXISTS subscribe_id;
ALTER TABLE users DROP COLUMN IF EXISTS subscribe_expiration_date;

-- STEP 2: Remove codes table fields
ALTER TABLE codes DROP COLUMN IF EXISTS user_id;
ALTER TABLE codes DROP COLUMN IF EXISTS activation_date;
ALTER TABLE codes DROP COLUMN IF EXISTS expiration_date;

-- STEP 3: Add comments
COMMENT ON TABLE user_subscriptions IS 'Unified subscription system - replaced users.subscribeId and codes.userId';
COMMENT ON TABLE codes IS 'Invitation codes - no longer stores activation data';

-- STEP 4: Verify cleanup
DO $$
DECLARE
  users_has_subscribe_id BOOLEAN;
  codes_has_user_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscribe_id'
  ) INTO users_has_subscribe_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'codes' AND column_name = 'user_id'
  ) INTO codes_has_user_id;

  IF users_has_subscribe_id OR codes_has_user_id THEN
    RAISE EXCEPTION 'Cleanup incomplete: old columns still exist';
  END IF;

  RAISE NOTICE 'Cleanup completed successfully';
END $$;
```

### Step 5.3: Update Schema Files

**Remove old fields from Drizzle schemas:**

1. **libs/db/src/schema/users.ts**
   ```typescript
   export const users = pgTable('users', {
     telegramId: bigint('telegram_id', { mode: 'number' }).primaryKey().notNull(),
     username: varchar('username', { length: 100 }),
     firstName: varchar('first_name', { length: 255 }),
     lastName: varchar('last_name', { length: 255 }),
     lang: varchar('lang', { length: 10 }),
     isPremium: boolean('is_premium').default(false),
     // REMOVED: subscribeId
     // REMOVED: subscribeExpirationDate
     isActive: boolean('is_active').notNull().default(true),
     createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
   });
   ```

2. **libs/db/src/schema/codes.ts**
   ```typescript
   export const codes = pgTable('codes', {
     id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
     code: varchar('code').notNull(),
     subscriptionId: bigint('subscription_id', { mode: 'number' })
       .notNull()
       .references(() => subscriptions.id),
     managerId: bigint('manager_id', { mode: 'number' }).references(() => managers.telegramId),
     // REMOVED: userId
     // REMOVED: activationDate
     // REMOVED: expirationDate
     isActive: boolean('is_active').notNull().default(true),
     createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
   });
   ```

### Step 5.4: Remove Deprecated Code

**Files to delete:**
- `libs/db/src/services/subscription-sync.service.ts` (dual-write service)

**Methods to remove from UsersRepository:**
- `updateSubscription()` (if only used for dual-write)

**Methods to remove from CodesRepository:**
- `updateActivation()` (if only used for dual-write)

### Step 5.5: Optimize Indexes

**Check index usage:**
```sql
-- Check unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user_subscriptions', 'subscriptions', 'codes')
ORDER BY idx_scan ASC;
```

**Add missing indexes if needed:**
```sql
-- Composite index for expiration checks
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active_expires
ON user_subscriptions(is_active, expires_at)
WHERE is_active = true AND expires_at IS NOT NULL;

-- Index for subscription type queries
CREATE INDEX IF NOT EXISTS idx_user_subs_subscription_type
ON user_subscriptions(subscription_id)
INCLUDE (user_id, expires_at, is_active);
```

### Success Criteria Phase 5

- [ ] Old columns removed from database
- [ ] Schema files updated
- [ ] Dual-write service removed
- [ ] All tests pass
- [ ] No references to old fields in code
- [ ] Database size reduced (optional: VACUUM FULL)

### Testing Phase 5

**Verify cleanup:**
```sql
-- 1. Check columns removed
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('subscribe_id', 'subscribe_expiration_date');
-- Should return 0 rows

SELECT column_name FROM information_schema.columns
WHERE table_name = 'codes' AND column_name IN ('user_id', 'activation_date', 'expiration_date');
-- Should return 0 rows

-- 2. Check data integrity
SELECT COUNT(*) FROM user_subscriptions WHERE user_id IS NULL;
-- Should return 0

SELECT COUNT(*) FROM user_subscriptions WHERE subscription_id IS NULL;
-- Should return 0
```

**Code verification:**
```bash
# Search for old field references
grep -r "subscribeId" libs/ src/
grep -r "subscribe_id" libs/ src/
grep -r "codes.userId" libs/ src/

# Should find no references
```

### Rollback Phase 5

**⚠️ CRITICAL: This phase is IRREVERSIBLE without backup**

**Restore from backup:**
```bash
# Restore database from backup
psql $DATABASE_URL < backup_before_cleanup.sql
```

**Or manually recreate columns:**
```sql
-- Add columns back
ALTER TABLE users ADD COLUMN subscribe_id BIGINT REFERENCES subscriptions(id);
ALTER TABLE users ADD COLUMN subscribe_expiration_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE codes ADD COLUMN user_id BIGINT REFERENCES users(telegram_id);
ALTER TABLE codes ADD COLUMN activation_date TIMESTAMP;
ALTER TABLE codes ADD COLUMN expiration_date TIMESTAMP WITH TIME ZONE;

-- Restore data from user_subscriptions
UPDATE users u
SET subscribe_id = us.subscription_id,
    subscribe_expiration_date = us.expires_at
FROM user_subscriptions us
WHERE us.user_id = u.telegram_id
  AND us.is_active = true;

-- Note: codes.userId cannot be restored (multi-use codes now)
```

---

## Phase 6: Monitoring & Validation

**Goal:** Verify system stability and monitor for issues.

**Duration:** 1 week (ongoing)
**Risk:** Low (observation only)

### Step 6.1: Add Monitoring Queries

**File:** `scripts/monitor-subscriptions.sql`

```sql
-- 1. Active subscriptions count
SELECT
  CASE
    WHEN s.type = 'signals' THEN 'Signals'
    WHEN s.type LIKE 'subscription_%' THEN 'Broadcast'
    ELSE 'Other'
  END as category,
  COUNT(DISTINCT us.user_id) as unique_users,
  COUNT(*) as total_subscriptions
FROM user_subscriptions us
JOIN subscriptions s ON s.id = us.subscription_id
WHERE us.is_active = true
GROUP BY category;

-- 2. Expiring subscriptions (next 7 days)
SELECT
  s.name,
  s.type,
  COUNT(*) as expiring_count,
  MIN(us.expires_at) as earliest_expiry
FROM user_subscriptions us
JOIN subscriptions s ON s.id = us.subscription_id
WHERE us.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND us.is_active = true
GROUP BY s.id, s.name, s.type;

-- 3. Data quality checks
SELECT
  'Orphaned user_subscriptions' as check_name,
  COUNT(*) as issue_count
FROM user_subscriptions us
LEFT JOIN users u ON u.telegram_id = us.user_id
WHERE u.telegram_id IS NULL
UNION ALL
SELECT
  'Invalid subscription references',
  COUNT(*)
FROM user_subscriptions us
LEFT JOIN subscriptions s ON s.id = us.subscription_id
WHERE s.id IS NULL;

-- 4. Performance metrics
SELECT
  'user_subscriptions' as table_name,
  pg_size_pretty(pg_total_relation_size('user_subscriptions')) as total_size,
  (SELECT COUNT(*) FROM user_subscriptions) as row_count;
```

### Step 6.2: Create Health Check Endpoint

**File:** `libs/bot/src/controllers/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { SubscriptionReadService } from '@db/services/subscription-read.service';

@Controller('health')
export class HealthController {
  constructor(private readonly subscriptionReadService: SubscriptionReadService) {}

  @Get('subscriptions')
  async checkSubscriptions() {
    try {
      // Sample query to verify system works
      const testUserId = 123456789; // Replace with test user
      const subscriptions = await this.subscriptionReadService.getUserSubscriptions(testUserId);

      return {
        status: 'healthy',
        system: 'unified_subscriptions',
        timestamp: new Date().toISOString(),
        sample_query: {
          user_id: testUserId,
          subscription_count: subscriptions.length,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        system: 'unified_subscriptions',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}
```

### Step 6.3: Setup Alerts

**Create alerting script:**

```typescript
// scripts/subscription-alerts.ts
import { Client } from 'pg';
import { WebClient } from '@slack/web-api'; // or Telegram bot

const db = new Client({ connectionString: process.env.DATABASE_URL });
const slack = new WebClient(process.env.SLACK_TOKEN);

async function checkDataQuality() {
  await db.connect();

  // Check for orphaned records
  const orphans = await db.query(`
    SELECT COUNT(*) FROM user_subscriptions us
    LEFT JOIN users u ON u.telegram_id = us.user_id
    WHERE u.telegram_id IS NULL
  `);

  if (parseInt(orphans.rows[0].count) > 0) {
    await slack.chat.postMessage({
      channel: '#alerts',
      text: `⚠️ Found ${orphans.rows[0].count} orphaned user_subscriptions records`,
    });
  }

  // Check for expiring subscriptions without notifications
  const expiringUnnotified = await db.query(`
    SELECT COUNT(*) FROM user_subscriptions
    WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      AND is_active = true
      AND notification_sent = false
  `);

  if (parseInt(expiringUnnotified.rows[0].count) > 10) {
    await slack.chat.postMessage({
      channel: '#alerts',
      text: `⚠️ ${expiringUnnotified.rows[0].count} subscriptions expiring soon without notifications`,
    });
  }

  await db.end();
}

checkDataQuality().catch(console.error);
```

**Setup cron job:**
```bash
# crontab -e
0 */6 * * * cd /path/to/project && npx ts-node scripts/subscription-alerts.ts
```

### Step 6.4: Performance Baseline

**Document query performance:**

```sql
-- Baseline query times
EXPLAIN (ANALYZE, BUFFERS)
SELECT us.*, s.*
FROM user_subscriptions us
JOIN subscriptions s ON s.id = us.subscription_id
WHERE us.user_id = 123456789 AND us.is_active = true;

-- Record execution time and plan
```

**Create performance dashboard query:**
```sql
-- Query performance over time
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_subscriptions,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
FROM user_subscriptions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Success Criteria Phase 6

- [ ] Monitoring queries run successfully
- [ ] Health check endpoint returns healthy
- [ ] Alerts configured and tested
- [ ] Performance baseline documented
- [ ] No data quality issues detected
- [ ] System stable for 1 week

### Testing Phase 6

**Daily checks:**
1. Run monitoring queries
2. Check health endpoint: `curl http://localhost:3000/health/subscriptions`
3. Review application logs for errors
4. Check database logs for slow queries
5. Verify user-reported issues (if any)

---

## Phase 7: Documentation & Training

**Goal:** Document new system and train team.

**Duration:** 2 days
**Risk:** Low

### Step 7.1: Update API Documentation

**File:** `docs/subscribtion/api-migration-guide.md`

```markdown
# Subscription API Migration Guide

## Overview
The subscription system has been migrated to a unified `user_subscriptions` table architecture.

## Key Changes

### OLD API (Deprecated)
```typescript
// Get user subscription
const user = await usersRepo.findById(userId);
const subscription = user.subscribeId;

// Check subscription
if (user.subscribeId) { ... }
```

### NEW API (Current)
```typescript
// Get user subscriptions (supports multiple)
const subscriptions = await subscriptionReadService.getUserSubscriptions(userId);

// Check specific subscription
const hasSignals = await subscriptionReadService.hasSubscription(userId, signalsId);
```

## Migration Examples

### Example 1: Get User Subscription
```typescript
// OLD
const user = await usersRepo.findById(userId);
if (user.subscribeId) {
  const subscription = await subscriptionsRepo.findById(user.subscribeId);
}

// NEW
const subscriptions = await subscriptionReadService.getUserSubscriptions(userId);
const signalsSubscription = subscriptions.find(s => s.type === 'signals');
```

### Example 2: Activate Subscription
```typescript
// OLD (dual-write period)
await subscriptionSyncService.activateSubscription(userId, subscriptionId, expiresAt, codeId);

// NEW
await userSubscriptionsRepo.activate(userId, subscriptionId, expiresAt);
```

### Example 3: Find Expiring Subscriptions
```typescript
// OLD
const users = await usersRepo.findUsersWithExpiringSubscriptions(7);

// NEW
const expiring = await subscriptionReadService.getExpiringSubscriptions(7, 'signals');
```
```

### Step 7.2: Create Architecture Diagram

**File:** `docs/subscribtion/unified-architecture-diagram.md`

```markdown
# Unified Subscription Architecture

## Entity Relationship Diagram

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│     users       │         │  user_subscriptions  │         │  subscriptions  │
│─────────────────│         │──────────────────────│         │─────────────────│
│ telegram_id (PK)│◄───────│ user_id (FK)         │────────►│ id (PK)         │
│ username        │         │ subscription_id (FK) │         │ name            │
│ first_name      │         │ activated_at         │         │ type            │
│ ...             │         │ expires_at           │         │ scope           │
└─────────────────┘         │ is_active            │         │ is_active       │
                            │ created_at           │         │ ...             │
                            └──────────────────────┘         └─────────────────┘
                                      │
                                      │
                            ┌──────────────────────┐
                            │       codes          │
                            │──────────────────────│
                            │ id (PK)              │
                            │ code                 │
                            │ subscription_id (FK) │───────►
                            │ manager_id (FK)      │
                            │ is_active            │
                            └──────────────────────┘
```

## Data Flow

### Activation Flow
```
User receives invite code
  ↓
Bot validates code
  ↓
Create record in user_subscriptions
  ↓
User has active subscription
```

### Expiration Check Flow
```
Cron job runs
  ↓
Query user_subscriptions for expiring records
  ↓
Send notifications
  ↓
Deactivate expired subscriptions
```
```

### Step 7.3: Create Team Training Guide

**File:** `docs/subscribtion/team-training.md`

```markdown
# Unified Subscriptions - Team Training Guide

## For Developers

### 1. Understanding the New Architecture
- Users can have MULTIPLE subscriptions (not just one)
- `user_subscriptions` table is the source of truth
- Old fields (`users.subscribeId`) have been removed

### 2. Common Queries

**Get user subscriptions:**
```typescript
const subscriptions = await subscriptionReadService.getUserSubscriptions(userId);
```

**Check if user has subscription:**
```typescript
const hasAccess = await subscriptionReadService.hasSubscription(userId, subscriptionId);
```

**Activate subscription:**
```typescript
await userSubscriptionsRepo.activate(userId, subscriptionId, expiresAt);
```

**Deactivate subscription:**
```typescript
await userSubscriptionsRepo.deactivate(userId, subscriptionId);
```

### 3. Testing Checklist
- [ ] Test activation flow
- [ ] Test expiration notifications
- [ ] Test multi-subscription users
- [ ] Test subscription queries

## For Support Team

### Troubleshooting User Subscriptions

**Check user subscriptions:**
```sql
SELECT
  us.*,
  s.name,
  s.type
FROM user_subscriptions us
JOIN subscriptions s ON s.id = us.subscription_id
WHERE us.user_id = <TELEGRAM_ID>
  AND us.is_active = true;
```

**Manually activate subscription:**
```sql
INSERT INTO user_subscriptions (user_id, subscription_id, expires_at)
VALUES (<USER_ID>, <SUBSCRIPTION_ID>, <EXPIRY_DATE>);
```

**Manually extend subscription:**
```sql
UPDATE user_subscriptions
SET expires_at = <NEW_EXPIRY_DATE>
WHERE user_id = <USER_ID>
  AND subscription_id = <SUBSCRIPTION_ID>;
```
```

### Step 7.4: Create Runbook

**File:** `docs/subscribtion/operations-runbook.md`

```markdown
# Subscription System Operations Runbook

## Common Operations

### 1. Manually Activate User Subscription
```sql
INSERT INTO user_subscriptions (user_id, subscription_id, expires_at, is_active)
VALUES (123456789, 1, '2025-12-31 23:59:59+00', true)
ON CONFLICT (user_id, subscription_id)
DO UPDATE SET
  is_active = true,
  expires_at = EXCLUDED.expires_at;
```

### 2. Extend Expiring Subscription
```sql
UPDATE user_subscriptions
SET expires_at = expires_at + INTERVAL '30 days'
WHERE user_id = 123456789
  AND subscription_id = 1;
```

### 3. Investigate Missing Subscription
```sql
-- Check if user ever had subscription
SELECT * FROM user_subscriptions
WHERE user_id = 123456789
ORDER BY created_at DESC;

-- Check code usage
SELECT c.*, us.*
FROM codes c
LEFT JOIN user_subscriptions us ON us.subscription_id = c.subscription_id
WHERE c.code = 'ABC123';
```

### 4. Fix Data Inconsistency
```sql
-- Find users with inactive subscriptions that should be active
SELECT us.*, s.name
FROM user_subscriptions us
JOIN subscriptions s ON s.id = us.subscription_id
WHERE us.is_active = false
  AND (us.expires_at IS NULL OR us.expires_at > NOW());

-- Reactivate if needed
UPDATE user_subscriptions
SET is_active = true
WHERE id IN (...);
```

## Emergency Procedures

### System Degradation
1. Check database connections: `SELECT COUNT(*) FROM pg_stat_activity`
2. Check slow queries: `SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10`
3. Check table bloat: `SELECT pg_size_pretty(pg_total_relation_size('user_subscriptions'))`

### Rollback to Old System (Emergency Only)
⚠️ This should never be needed if migration was followed correctly

See Phase 5 Rollback section in rollout-plan.md
```

### Success Criteria Phase 7

- [ ] API migration guide published
- [ ] Architecture diagram created
- [ ] Team training guide completed
- [ ] Operations runbook created
- [ ] Team members trained
- [ ] Documentation reviewed and approved

---

## Post-Migration Checklist

### Week 1
- [ ] Monitor error rates daily
- [ ] Run data quality checks daily
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Verify expiration notifications work

### Week 2-4
- [ ] Monitor error rates weekly
- [ ] Run data quality checks weekly
- [ ] Optimize slow queries if needed
- [ ] Document any issues and resolutions

### Month 2-3
- [ ] Performance review
- [ ] Capacity planning
- [ ] Index optimization
- [ ] Archive old migration scripts

---

## Rollback Strategy Summary

| Phase | Rollback Difficulty | Data Loss Risk | Rollback Method |
|-------|-------------------|---------------|-----------------|
| Phase 1 | Easy | None | Drop table, revert code |
| Phase 2 | Easy | None | Revert code, data in both systems |
| Phase 3 | Easy | None | Data in both systems, can re-migrate |
| Phase 4 | Easy | None | Toggle feature flag or revert code |
| Phase 5 | HARD | HIGH | Restore from backup (irreversible) |
| Phase 6 | N/A | None | Monitoring only |
| Phase 7 | N/A | None | Documentation only |

**CRITICAL:** Take database backup before Phase 5 (cleanup)!

---

## Success Metrics

### Technical Metrics
- [ ] Zero data loss during migration
- [ ] Query performance within 10% of baseline
- [ ] No increase in error rate
- [ ] All tests passing
- [ ] Code coverage maintained

### Business Metrics
- [ ] No user-reported subscription issues
- [ ] Expiration notifications delivered on time
- [ ] Activation flow works seamlessly
- [ ] Multi-subscription support functional

### Operational Metrics
- [ ] Database size optimized
- [ ] Index usage above 80%
- [ ] No orphaned records
- [ ] Monitoring alerts working
- [ ] Team trained and confident

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Schema & Repository | 1 day | None |
| Phase 2: Dual-Write | 2 days | Phase 1 complete |
| Phase 3: Data Migration | 1 day | Phase 2 stable |
| Phase 4: Read Cutover | 2 days | Phase 3 verified |
| Phase 5: Cleanup | 1 day | Phase 4 stable for 3+ days |
| Phase 6: Monitoring | 1 week | Phase 5 complete |
| Phase 7: Documentation | 2 days | Parallel with Phase 6 |

**Total Duration:** 2-3 weeks (with buffers)

---

## Contacts & Support

**Technical Lead:** [Name]
**Database Admin:** [Name]
**Product Owner:** [Name]

**Emergency Contact:** [Phone/Slack]
**Escalation Path:** Dev Team → Tech Lead → CTO

---

## Appendix

### A. SQL Reference Queries

**Find all user subscriptions:**
```sql
SELECT
  u.telegram_id,
  u.username,
  s.name as subscription_name,
  s.type,
  us.activated_at,
  us.expires_at,
  us.is_active
FROM user_subscriptions us
JOIN users u ON u.telegram_id = us.user_id
JOIN subscriptions s ON s.id = us.subscription_id
WHERE us.is_active = true
ORDER BY us.activated_at DESC;
```

**Subscription statistics:**
```sql
SELECT
  s.name,
  s.type,
  COUNT(DISTINCT us.user_id) as total_users,
  COUNT(CASE WHEN us.expires_at > NOW() THEN 1 END) as active_count,
  COUNT(CASE WHEN us.expires_at <= NOW() THEN 1 END) as expired_count
FROM subscriptions s
LEFT JOIN user_subscriptions us ON us.subscription_id = s.id
WHERE s.is_active = true
GROUP BY s.id, s.name, s.type
ORDER BY total_users DESC;
```

### B. TypeScript Type Definitions

```typescript
// User subscription with details
interface UserSubscriptionDetails {
  id: number;
  userId: number;
  subscriptionId: number;
  subscriptionName: string;
  subscriptionType: 'signals' | string; // 'signals' or 'subscription_{uid}'
  activatedAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  daysRemaining: number | null;
}

// Expiring subscription
interface ExpiringSubscription {
  user: {
    telegramId: number;
    username: string;
    lang: string;
  };
  subscription: {
    id: number;
    name: string;
    type: string;
  };
  expiresAt: Date;
  daysRemaining: number;
}
```

### C. Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Unique constraint violation on user_subscriptions` | User already has this subscription | Use ON CONFLICT DO UPDATE |
| `Foreign key violation on subscription_id` | Invalid subscription ID | Verify subscription exists |
| `null value in column "user_id"` | Missing user ID | Ensure user exists in users table |
| `Slow query on user_subscriptions` | Missing index | Check index usage, add if needed |

---

## Document Version

**Version:** 1.0
**Last Updated:** 2025-10-10
**Authors:** Claude Code
**Reviewers:** [Pending]

**Change Log:**
- 2025-10-10: Initial version created
