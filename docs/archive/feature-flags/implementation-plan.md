# Feature Flags Implementation Plan

**Version**: 2.0
**Last Updated**: 2025-10-16
**Status**: Active

## Executive Summary

This document provides a comprehensive, step-by-step implementation plan for the feature flags system in the Quantum Deal Telegram bot. The system manages **2 filtering features** that control how trading signals are delivered to users based on their subscription tier.

**Core Principle**: Signal delivery is core bot functionality available to all active subscribers. Feature flags control only the filtering behavior applied to those signals.

**Features**:
1. `TIER_BASED_FILTERING` - System-controlled filtering by subscription tier (Basic + VIP)
2. `CUSTOM_USER_FILTERING` - User-configurable filtering preferences (VIP only)

**Timeline**: 1-2 weeks (5 phases)
**Estimated Effort**: 40-60 developer hours

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UserManagementMiddleware                      │
│  • Loads user from database                                      │
│  • Fetches active subscriptions                                  │
│  • Loads feature flags via FeatureFlagService                    │
│  • Attaches UserWithFeatures to context                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Command Handlers                            │
│  • Use @RequireFeature decorator                                 │
│  • Check features with hasFeature() helper                       │
│  • Access ctx.user.enabledFeatures                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FeatureFlagService                           │
│  • Query feature flags from database (READ-ONLY)                 │
│  • Cache results                                                 │
│  • Aggregate features from all active subscriptions              │
└─────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions**:
- Features are managed via direct SQL (bot only reads)
- User settings stored in `user_subscription_features` table
- Features aggregated from all active subscriptions (union)
- Middleware loads features once per request
- Guards enforce feature access at handler level

## Pre-Migration Checklist

Before starting implementation, ensure all prerequisites are met:

### Database Safety

| Task | Command | Purpose |
|------|---------|---------|
| **Backup database** | `pg_dump quantum_deal > backup_$(date +%Y%m%d).sql` | Create recovery point |
| **Verify DB connection** | `psql -d quantum_deal -c "SELECT version();"` | Ensure database accessible |
| **Check existing tables** | `psql -d quantum_deal -c "\dt"` | Verify base tables exist |
| **Test on staging** | `DATABASE_URL=<staging> pnpm db:migrate` | Validate migration safety |
| **Review migration SQL** | `cat libs/db/migrations/*.sql` | Inspect generated SQL |
| **Verify Drizzle config** | `cat drizzle.config.ts` | Ensure correct credentials |
| **Check disk space** | `df -h` | Confirm sufficient storage |

### Environment Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Verify TypeScript compilation
pnpm build

# 3. Run existing tests
pnpm test

# 4. Check database connectivity
pnpm db:studio

# 5. Create staging database copy
createdb quantum_deal_staging --template=quantum_deal
```

### Code Review Preparation

- [ ] Read all documentation (README.md, database-schema.md, FEATURE_CATALOG.md)
- [ ] Understand existing codebase structure
- [ ] Review current subscription system
- [ ] Identify files that need modification
- [ ] Set up feature branch: `git checkout -b feature/feature-flags`

---

## Phase 1: Database & Repository Layer

**Duration**: 1-2 days
**Goal**: Create database schema, run migrations, implement repository layer

### 1.1 Create Database Schema

**File**: `libs/db/src/schema/subscription-features.ts`

```typescript
import {
  pgTable,
  bigint,
  varchar,
  boolean,
  jsonb,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions';

/**
 * Feature Flag Keys Enum
 *
 * NOTE: Signal delivery is core functionality, not a feature flag.
 * These 2 features control only filtering behavior.
 *
 * TIER_BASED_FILTERING: Available on ALL tiers (Basic + VIP)
 * CUSTOM_USER_FILTERING: Available on VIP tier only
 */
export enum FeatureFlag {
  // Filtering Features (2 features only)
  TIER_BASED_FILTERING = 'tier_based_filtering',    // Basic + VIP
  CUSTOM_USER_FILTERING = 'custom_user_filtering',  // VIP only
}

/**
 * Feature Configuration Type
 *
 * Generic configuration object for feature-specific settings.
 */
export type FeatureConfig = Record<string, unknown>;

/**
 * Subscription Features Table
 *
 * Maps features to subscriptions with optional configuration.
 * Enables fine-grained control over what features are available.
 */
export const subscriptionFeatures = pgTable(
  'subscription_features',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),

    featureKey: varchar('feature_key', { length: 100 }).notNull(),

    isEnabled: boolean('is_enabled').notNull().default(true),

    /**
     * Optional feature-specific configuration in JSONB format.
     *
     * Examples:
     * - TIER_BASED_FILTERING: { sectors: ["crypto", "forex", "stocks"] }
     * - CUSTOM_USER_FILTERING: {} (no subscription-level config needed)
     */
    config: jsonb('config').$type<FeatureConfig>().default({}),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Unique constraint: one feature per subscription
    uniqueSubscriptionFeature: unique('uq_subscription_feature').on(
      table.subscriptionId,
      table.featureKey,
    ),
  }),
);

export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type NewSubscriptionFeature = typeof subscriptionFeatures.$inferInsert;
```

**File**: `libs/db/src/schema/user-subscription-features.ts`

```typescript
import {
  pgTable,
  serial,
  bigint,
  varchar,
  jsonb,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * User Subscription Features Settings Type
 *
 * Stores user-specific configuration for enabled features.
 */
export type UserFeatureSettings = Record<string, unknown>;

/**
 * User Subscription Features Table
 *
 * Stores user-level configuration for features they have access to.
 * This allows users to customize how enabled features behave.
 *
 * Examples:
 * - CUSTOM_USER_FILTERING: { symbols: ['GBPUSD.a', 'EURUSD.a', 'BTCUSD.a'] }
 *
 * NOTE: TIER_BASED_FILTERING does not require user settings - it's configured
 * at the subscription level via subscription_features.config.sectors
 */
export const userSubscriptionFeatures = pgTable(
  'user_subscription_features',
  {
    id: serial('id').primaryKey(),

    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.telegramId, { onDelete: 'cascade' }),

    featureKey: varchar('feature_key', { length: 50 }).notNull(),

    /**
     * User-specific settings for this feature in JSONB format.
     * Structure depends on the feature.
     */
    settings: jsonb('settings').$type<UserFeatureSettings>().notNull().default({}),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at').notNull().defaultNow(),

    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint: one settings record per user per feature
    uniqueUserFeature: unique('unique_user_feature').on(
      table.userId,
      table.featureKey,
    ),
  }),
);

export type UserSubscriptionFeature = typeof userSubscriptionFeatures.$inferSelect;
export type NewUserSubscriptionFeature = typeof userSubscriptionFeatures.$inferInsert;
```

**Update**: `libs/db/src/schema/index.ts`

```typescript
// Add exports
export * from './subscription-features';
export * from './user-subscription-features';
```

### 1.2 Generate and Run Migration

```bash
# Generate migration
pnpm db:generate

# Review generated SQL
cat libs/db/migrations/*_subscription_features.sql

# Run migration on staging first
DATABASE_URL=$STAGING_DATABASE_URL pnpm db:migrate

# Verify tables created
psql $STAGING_DATABASE_URL -c "\d subscription_features"
psql $STAGING_DATABASE_URL -c "\d user_subscription_features"

# If validation passes, run on production
pnpm db:migrate
```

**Expected Migration SQL**:

```sql
-- Create subscription_features table
CREATE TABLE subscription_features (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_subscription_feature UNIQUE (subscription_id, feature_key)
);

-- Create indexes
CREATE INDEX idx_subscription_features_subscription_id
  ON subscription_features(subscription_id);

CREATE INDEX idx_subscription_features_feature_key
  ON subscription_features(feature_key);

CREATE INDEX idx_subscription_features_enabled
  ON subscription_features(subscription_id, feature_key)
  WHERE is_enabled = true;

-- Create user_subscription_features table
CREATE TABLE user_subscription_features (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_feature UNIQUE(user_id, feature_key)
);

-- Create indexes
CREATE INDEX idx_user_subscription_features_user_id
  ON user_subscription_features(user_id);

CREATE INDEX idx_user_subscription_features_feature_key
  ON user_subscription_features(feature_key);

CREATE INDEX idx_user_subscription_features_active
  ON user_subscription_features(user_id, is_active);

CREATE INDEX idx_user_subscription_features_jsonb
  ON user_subscription_features USING GIN(settings);
```

### 1.3 Seed Existing Subscriptions

**File**: `scripts/seed-feature-flags.ts`

```typescript
import { db } from '../libs/db/src/db';
import { subscriptions, subscriptionFeatures } from '../libs/db/src/schema';
import { FeatureFlag } from '../libs/db/src/schema/subscription-features';
import { eq } from 'drizzle-orm';

/**
 * Seed feature flags for existing subscriptions
 *
 * NOTE: Signal delivery is core functionality, not a feature flag.
 * Only filtering features are seeded based on tier.
 */
async function seedFeatureFlags() {
  console.log('🌱 Starting feature flags seeding...\n');

  // Get all active subscriptions
  const allSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.isActive, true));

  console.log(`📊 Found ${allSubscriptions.length} active subscriptions\n`);

  let totalFeatures = 0;

  for (const subscription of allSubscriptions) {
    let features: Array<{ key: FeatureFlag; config: any }> = [];

    // Determine features based on subscription type and name
    if (subscription.type === 'signals') {
      const name = subscription.name.toLowerCase();

      if (name.includes('vip')) {
        // VIP Signals: Both filtering features
        features = [
          {
            key: FeatureFlag.TIER_BASED_FILTERING,
            config: {
              // Migrate scope if it exists
              sectors: subscription.scope || [],
            },
          },
          {
            key: FeatureFlag.CUSTOM_USER_FILTERING,
            config: {},
          },
        ];
      } else if (name.includes('basic')) {
        // Basic Signals: TIER_BASED_FILTERING only
        features = [
          {
            key: FeatureFlag.TIER_BASED_FILTERING,
            config: {
              // Migrate scope if it exists
              sectors: subscription.scope || [],
            },
          },
        ];
      }
    }

    // Insert features
    for (const feature of features) {
      await db
        .insert(subscriptionFeatures)
        .values({
          subscriptionId: subscription.id,
          featureKey: feature.key,
          isEnabled: true,
          config: feature.config,
        })
        .onConflictDoNothing();

      totalFeatures++;
    }

    console.log(
      `✅ ${subscription.name} (ID: ${subscription.id}): ${features.length} features`
    );
  }

  console.log(`\n✨ Seeding completed! Added ${totalFeatures} total features.\n`);
}

seedFeatureFlags()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
```

**Run seeding**:

```bash
# Run on staging first
DATABASE_URL=$STAGING_DATABASE_URL npx ts-node scripts/seed-feature-flags.ts

# Verify results
psql $STAGING_DATABASE_URL -c "
  SELECT s.id, s.name, s.type, COUNT(sf.id) as feature_count
  FROM subscriptions s
  LEFT JOIN subscription_features sf ON s.id = sf.subscription_id
  WHERE s.is_active = true
  GROUP BY s.id, s.name, s.type
  ORDER BY s.id;
"

# If validation passes, run on production
npx ts-node scripts/seed-feature-flags.ts
```

### 1.4 Create Repositories

**File**: `libs/db/src/repositories/subscription-features.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { db } from '../db';
import {
  subscriptionFeatures,
  FeatureFlag,
  FeatureConfig,
  SubscriptionFeature,
} from '../schema/subscription-features';
import { userSubscriptions } from '../schema/user-subscriptions';
import { subscriptions } from '../schema/subscriptions';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class SubscriptionFeaturesRepository {
  /**
   * Get all enabled features for a specific subscription
   */
  async getFeaturesBySubscriptionId(
    subscriptionId: number,
  ): Promise<SubscriptionFeature[]> {
    return db
      .select()
      .from(subscriptionFeatures)
      .where(
        and(
          eq(subscriptionFeatures.subscriptionId, subscriptionId),
          eq(subscriptionFeatures.isEnabled, true),
        ),
      );
  }

  /**
   * Get all enabled features for a user (aggregated from all active subscriptions)
   */
  async getFeaturesByUserId(userId: number): Promise<SubscriptionFeature[]> {
    return db
      .selectDistinct({
        id: subscriptionFeatures.id,
        subscriptionId: subscriptionFeatures.subscriptionId,
        featureKey: subscriptionFeatures.featureKey,
        isEnabled: subscriptionFeatures.isEnabled,
        config: subscriptionFeatures.config,
        createdAt: subscriptionFeatures.createdAt,
        updatedAt: subscriptionFeatures.updatedAt,
      })
      .from(subscriptionFeatures)
      .innerJoin(
        userSubscriptions,
        eq(subscriptionFeatures.subscriptionId, userSubscriptions.subscriptionId),
      )
      .innerJoin(
        subscriptions,
        eq(userSubscriptions.subscriptionId, subscriptions.id),
      )
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.isActive, true),
          eq(subscriptions.isActive, true),
          eq(subscriptionFeatures.isEnabled, true),
        ),
      );
  }

  /**
   * Check if a user has a specific feature
   */
  async hasFeature(userId: number, featureKey: FeatureFlag): Promise<boolean> {
    const result = await db
      .select({ exists: sql<number>`1` })
      .from(subscriptionFeatures)
      .innerJoin(
        userSubscriptions,
        eq(subscriptionFeatures.subscriptionId, userSubscriptions.subscriptionId),
      )
      .innerJoin(
        subscriptions,
        eq(userSubscriptions.subscriptionId, subscriptions.id),
      )
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(subscriptionFeatures.featureKey, featureKey),
          eq(subscriptionFeatures.isEnabled, true),
          eq(userSubscriptions.isActive, true),
          eq(subscriptions.isActive, true),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get feature with configuration
   */
  async getFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
  ): Promise<SubscriptionFeature | null> {
    const result = await db
      .select()
      .from(subscriptionFeatures)
      .where(
        and(
          eq(subscriptionFeatures.subscriptionId, subscriptionId),
          eq(subscriptionFeatures.featureKey, featureKey),
        ),
      )
      .limit(1);

    return result[0] || null;
  }
}
```

**File**: `libs/db/src/repositories/user-subscription-features.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { db } from '../db';
import {
  userSubscriptionFeatures,
  UserSubscriptionFeature,
  UserFeatureSettings,
} from '../schema/user-subscription-features';
import { FeatureFlag } from '../schema/subscription-features';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class UserSubscriptionFeaturesRepository {
  /**
   * Get user's settings for a specific feature
   */
  async getUserFeatureSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<UserSubscriptionFeature | null> {
    const result = await db
      .select()
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
          eq(userSubscriptionFeatures.isActive, true),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get all user's feature settings
   */
  async getAllUserSettings(userId: number): Promise<UserSubscriptionFeature[]> {
    return db
      .select()
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.isActive, true),
        ),
      );
  }

  /**
   * Create or update user feature settings
   */
  async upsertUserSettings(
    userId: number,
    featureKey: FeatureFlag,
    settings: UserFeatureSettings,
  ): Promise<UserSubscriptionFeature> {
    const [result] = await db
      .insert(userSubscriptionFeatures)
      .values({
        userId,
        featureKey,
        settings,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [userSubscriptionFeatures.userId, userSubscriptionFeatures.featureKey],
        set: {
          settings,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  /**
   * Delete user feature settings (reset to defaults)
   */
  async deleteUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await db
      .delete(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
        ),
      );
  }

  /**
   * Deactivate user settings (soft delete)
   */
  async deactivateUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await db
      .update(userSubscriptionFeatures)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(userSubscriptionFeatures.userId, userId),
          eq(userSubscriptionFeatures.featureKey, featureKey),
        ),
      );
  }
}
```

**Update**: `libs/db/src/repositories/index.ts`

```typescript
// Add exports
export * from './subscription-features.repository';
export * from './user-subscription-features.repository';
```

### 1.5 Update Database Module

**File**: `libs/db/src/db.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { SubscriptionFeaturesRepository } from './repositories/subscription-features.repository';
import { UserSubscriptionFeaturesRepository } from './repositories/user-subscription-features.repository';
// ... other imports

@Module({
  providers: [
    // ... existing repositories
    SubscriptionFeaturesRepository,
    UserSubscriptionFeaturesRepository,
  ],
  exports: [
    // ... existing repositories
    SubscriptionFeaturesRepository,
    UserSubscriptionFeaturesRepository,
  ],
})
export class DbModule {}
```

---

## Phase 2: Service Layer

**Duration**: 1-2 days
**Goal**: Implement business logic for feature flag management and user settings

### 2.1 Create Feature Flag Service

**File**: `libs/bot/src/services/feature-flag.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionFeaturesRepository } from '@quantumdeal/db';
import { FeatureFlag, FeatureConfig } from '@quantumdeal/db/schema';

export interface UserFeatures {
  enabledFeatures: Set<FeatureFlag>;
  featureConfigs: Map<FeatureFlag, FeatureConfig>;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    private readonly featuresRepository: SubscriptionFeaturesRepository,
  ) {}

  /**
   * Get all enabled features for a user
   *
   * This aggregates features from ALL active subscriptions (union).
   * If a feature appears in multiple subscriptions, configs are merged.
   */
  async getUserFeatures(userId: number): Promise<UserFeatures> {
    const features = await this.featuresRepository.getFeaturesByUserId(userId);

    const enabledFeatures = new Set<FeatureFlag>();
    const featureConfigs = new Map<FeatureFlag, FeatureConfig>();

    for (const feature of features) {
      const featureKey = feature.featureKey as FeatureFlag;
      enabledFeatures.add(featureKey);

      // Merge configs if feature appears in multiple subscriptions
      if (featureConfigs.has(featureKey)) {
        const existingConfig = featureConfigs.get(featureKey)!;
        featureConfigs.set(featureKey, {
          ...existingConfig,
          ...feature.config,
        });
      } else {
        featureConfigs.set(featureKey, feature.config);
      }
    }

    this.logger.debug(
      `User ${userId} has ${enabledFeatures.size} enabled features`,
    );

    return { enabledFeatures, featureConfigs };
  }

  /**
   * Check if a user has a specific feature
   */
  async isFeatureEnabled(
    userId: number,
    feature: FeatureFlag,
  ): Promise<boolean> {
    return this.featuresRepository.hasFeature(userId, feature);
  }

  /**
   * Check if user has feature (with pre-loaded context)
   * Use this with UserWithFeatures from middleware
   */
  hasFeature(userFeatures: UserFeatures, feature: FeatureFlag): boolean {
    return userFeatures.enabledFeatures.has(feature);
  }

  /**
   * Get feature configuration for a user
   */
  getFeatureConfig(
    userFeatures: UserFeatures,
    feature: FeatureFlag,
  ): FeatureConfig | null {
    return userFeatures.featureConfigs.get(feature) || null;
  }

  /**
   * Validate if feature key is valid
   */
  isValidFeature(key: string): key is FeatureFlag {
    return Object.values(FeatureFlag).includes(key as FeatureFlag);
  }
}
```

### 2.2 Create User Settings Service

**File**: `libs/bot/src/services/user-settings.service.ts`

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  UserSubscriptionFeaturesRepository,
  SubscriptionFeaturesRepository,
} from '@quantumdeal/db';
import {
  FeatureFlag,
  UserFeatureSettings,
} from '@quantumdeal/db/schema';
import { FeatureFlagService } from './feature-flag.service';

/**
 * Manages user-specific settings for enabled features
 */
@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(
    private readonly userFeaturesRepo: UserSubscriptionFeaturesRepository,
    private readonly subscriptionFeaturesRepo: SubscriptionFeaturesRepository,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  /**
   * Get user's settings for a feature
   */
  async getUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<UserFeatureSettings | null> {
    // Verify user has access to this feature
    const hasAccess = await this.subscriptionFeaturesRepo.hasFeature(
      userId,
      featureKey,
    );

    if (!hasAccess) {
      this.logger.warn(
        `User ${userId} attempted to access settings for unavailable feature ${featureKey}`,
      );
      return null;
    }

    const settings = await this.userFeaturesRepo.getUserFeatureSettings(
      userId,
      featureKey,
    );

    return settings?.settings || null;
  }

  /**
   * Save user's settings for a feature
   */
  async saveUserSettings(
    userId: number,
    featureKey: FeatureFlag,
    settings: UserFeatureSettings,
  ): Promise<void> {
    // Verify user has access to this feature
    const hasAccess = await this.subscriptionFeaturesRepo.hasFeature(
      userId,
      featureKey,
    );

    if (!hasAccess) {
      throw new BadRequestException(
        `Feature ${featureKey} not available in your subscription`,
      );
    }

    // Validate settings based on feature type
    this.validateSettings(featureKey, settings);

    await this.userFeaturesRepo.upsertUserSettings(
      userId,
      featureKey,
      settings,
    );

    this.logger.log(
      `User ${userId} updated settings for feature ${featureKey}`,
    );
  }

  /**
   * Reset user's settings to defaults
   */
  async resetUserSettings(
    userId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await this.userFeaturesRepo.deleteUserSettings(userId, featureKey);
    this.logger.log(
      `User ${userId} reset settings for feature ${featureKey}`,
    );
  }

  /**
   * Validate settings based on feature type
   */
  private validateSettings(
    featureKey: FeatureFlag,
    settings: UserFeatureSettings,
  ): void {
    switch (featureKey) {
      case FeatureFlag.TIER_BASED_FILTERING:
        this.validateTierFilteringSettings(settings);
        break;
      case FeatureFlag.CUSTOM_USER_FILTERING:
        this.validateCustomFilteringSettings(settings);
        break;
      default:
        throw new BadRequestException(`Unknown feature: ${featureKey}`);
    }
  }

  private validateTierFilteringSettings(settings: any): void {
    // TIER_BASED_FILTERING is configured at subscription level,
    // not at user level, so this should typically not be called
    throw new BadRequestException(
      'TIER_BASED_FILTERING is configured at subscription level, not user level',
    );
  }

  private validateCustomFilteringSettings(settings: any): void {
    if (settings.symbols !== undefined) {
      if (!Array.isArray(settings.symbols)) {
        throw new BadRequestException('symbols must be an array');
      }

      if (settings.symbols.some((symbol: any) => typeof symbol !== 'string')) {
        throw new BadRequestException(
          'symbols must be an array of strings (e.g., ["GBPUSD.a", "EURUSD.a"])',
        );
      }
    }
  }
}
```

### 2.3 Update User DTO

**File**: `libs/bot/src/interfaces/user.dto.ts`

```typescript
import { FeatureFlag, FeatureConfig } from '@quantumdeal/db/schema';

/**
 * User with subscriptions and feature flags
 */
export interface UserWithSubscriptions {
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  lang: string | null;
  isPremium: boolean;
  isActive: boolean;
  createdAt: Date;
  activeSubscriptions: ActiveSubscriptionDto[];

  // Feature flags (loaded by middleware)
  enabledFeatures: Set<FeatureFlag>;
  featureConfigs: Map<FeatureFlag, FeatureConfig>;
}

/**
 * Helper function to check if user has a feature
 */
export function hasFeature(
  user: UserWithSubscriptions,
  feature: FeatureFlag,
): boolean {
  return user.enabledFeatures.has(feature);
}

/**
 * Helper function to get feature config
 */
export function getFeatureConfig<T = FeatureConfig>(
  user: UserWithSubscriptions,
  feature: FeatureFlag,
): T | null {
  const config = user.featureConfigs.get(feature);
  return (config as T) || null;
}
```

### 2.4 Update Bot Module

**File**: `libs/bot/src/bot.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { FeatureFlagService } from './services/feature-flag.service';
import { UserSettingsService } from './services/user-settings.service';
import { DbModule } from '@quantumdeal/db';

@Module({
  imports: [DbModule],
  providers: [
    FeatureFlagService,
    UserSettingsService,
  ],
  exports: [
    FeatureFlagService,
    UserSettingsService,
  ],
})
export class BotModule {}
```

---

## Phase 3: Access Control

**Duration**: 1-2 days
**Goal**: Implement middleware, decorators, and guards for feature access control

### 3.1 Update User Management Middleware

**File**: `libs/bot/src/middleware/user-management.middleware.ts`

```typescript
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import {
  UsersRepository,
  UserSubscriptionsRepository,
} from '@quantumdeal/db';
import { FeatureFlagService } from '../services/feature-flag.service';
import { UserWithSubscriptions } from '../interfaces/user.dto';

@Injectable()
export class UserManagementMiddleware implements NestMiddleware {
  private readonly logger = new Logger(UserManagementMiddleware.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly subscriptionsRepository: UserSubscriptionsRepository,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async use(ctx: Context, next: () => Promise<void>) {
    if (!ctx.from?.id) {
      return next();
    }

    try {
      // Load user
      const user = await this.usersRepository.findByTelegramId(ctx.from.id);
      if (!user) {
        this.logger.debug(`User ${ctx.from.id} not found in database`);
        return next();
      }

      // Load active subscriptions
      const activeSubscriptions =
        await this.subscriptionsRepository.getActiveSubscriptions(
          user.telegramId,
        );

      // Load feature flags
      const { enabledFeatures, featureConfigs } =
        await this.featureFlagService.getUserFeatures(user.telegramId);

      // Attach enriched user to context
      (ctx as any).user = {
        ...user,
        activeSubscriptions,
        enabledFeatures,
        featureConfigs,
      } as UserWithSubscriptions;

      this.logger.debug(
        `User ${user.telegramId} loaded with ${enabledFeatures.size} features`,
      );
    } catch (error) {
      this.logger.error('Error in UserManagementMiddleware:', error);
    }

    await next();
  }
}
```

### 3.2 Create Feature Decorator

**File**: `libs/bot/src/decorators/require-feature.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { FeatureFlag } from '@quantumdeal/db/schema';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * Decorator to require a specific feature for a handler
 *
 * Usage:
 * ```typescript
 * @Command('filter')
 * @RequireFeature(FeatureFlag.TIER_BASED_FILTERING)
 * async handleFilterCommand(@Ctx() ctx: UserContext) {
 *   // Only users with TIER_BASED_FILTERING can access
 * }
 * ```
 */
export const RequireFeature = (feature: FeatureFlag) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);
```

### 3.3 Create Feature Guard

**File**: `libs/bot/src/guards/feature.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { UserContext } from '../interfaces/user-context.interface';
import { hasFeature } from '../interfaces/user.dto';

@Injectable()
export class FeatureGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.get<FeatureFlag>(
      REQUIRE_FEATURE_KEY,
      context.getHandler(),
    );

    if (!requiredFeature) {
      // No feature requirement, allow access
      return true;
    }

    const ctx = context.switchToHttp().getRequest() as UserContext;

    if (!ctx.user) {
      this.logger.warn('No user in context for feature check');
      return false;
    }

    const hasAccess = hasFeature(ctx.user, requiredFeature);

    if (!hasAccess) {
      this.logger.log(
        `User ${ctx.user.telegramId} denied access to feature ${requiredFeature}`,
      );
    }

    return hasAccess;
  }
}
```

### 3.4 Create Scene Feature Helper

**File**: `libs/bot/src/helpers/feature-scene.helper.ts`

```typescript
import { FeatureFlag } from '@quantumdeal/db/schema';
import { UserContext } from '../interfaces/user-context.interface';
import { hasFeature } from '../interfaces/user.dto';

/**
 * Check if user has required feature in scene
 *
 * Usage:
 * ```typescript
 * @SceneEnter()
 * async onEnter(@Ctx() ctx: UserContext) {
 *   if (!checkFeatureAccess(ctx, FeatureFlag.CUSTOM_USER_FILTERING)) {
 *     await sendFeatureNotAvailable(ctx, FeatureFlag.CUSTOM_USER_FILTERING);
 *     await ctx.scene.leave();
 *     return;
 *   }
 *   // Continue with scene
 * }
 * ```
 */
export function checkFeatureAccess(
  ctx: UserContext,
  feature: FeatureFlag,
): boolean {
  if (!ctx.user) {
    return false;
  }
  return hasFeature(ctx.user, feature);
}

/**
 * Send feature not available message with upgrade CTA
 */
export async function sendFeatureNotAvailable(
  ctx: UserContext,
  feature: FeatureFlag,
): Promise<void> {
  let message: string;

  if (feature === FeatureFlag.TIER_BASED_FILTERING) {
    // This should rarely happen as TIER_BASED_FILTERING is available to all tiers
    message = `
❌ Feature Not Available

Tier-based filtering is not available in your current subscription.

NOTE: All active subscribers receive trading signals.

Please contact support if you see this message.
`.trim();
  } else if (feature === FeatureFlag.CUSTOM_USER_FILTERING) {
    message = `
❌ Custom Filtering Not Available

Custom user filtering is only available for VIP subscribers.

Your current subscription includes:
• ✅ Trading signals (all tiers)
• ✅ Tier-based filtering (system-controlled by subscription)

✨ Upgrade to VIP to unlock:
• Custom user filtering (choose specific instruments)
• Personalize which signals you receive

Use /upgrade to learn more about VIP benefits.
`.trim();
  } else {
    message = '❌ This feature is not available in your subscription.';
  }

  await ctx.reply(message);
}
```

---

## Phase 4: UI Implementation - Telegram Scenes

**Duration**: 2-3 days
**Goal**: Implement Telegram scenes for user to configure filtering preferences

This phase implements the complete UI flow documented in `telegram-ui-flow.md`.

### 4.1 Create Filter Settings Scene

**File**: `libs/bot/src/scenes/filter-settings.scene.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Scene, SceneEnter, Action, Ctx } from '@quantumdeal/telegraf';
import { Markup } from 'telegraf';
import { UserContext } from '../interfaces/user-context.interface';
import { UserSettingsService } from '../services/user-settings.service';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { db, instruments } from '@quantumdeal/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  checkFeatureAccess,
  sendFeatureNotAvailable,
} from '../helpers/feature-scene.helper';

/**
 * NOTE: This scene requires the instruments table to be created first.
 * See docs/feature-flags/CRITICAL_GAPS_ANALYSIS.md for implementation.
 */

interface FilterSession {
  selectedSymbols: Set<string>;  // Store symbol names, not IDs
  originalSymbols: Set<string>;
  currentGroup: string | null;
  currentPage: number;
}

@Injectable()
@Scene('filter-settings')
export class FilterSettingsScene {
  private sessions = new Map<number, FilterSession>();

  constructor(
    private readonly userSettingsService: UserSettingsService,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: UserContext) {
    // Check feature access
    if (!checkFeatureAccess(ctx, FeatureFlag.CUSTOM_USER_FILTERING)) {
      await sendFeatureNotAvailable(ctx, FeatureFlag.CUSTOM_USER_FILTERING);
      await ctx.scene.leave();
      return;
    }

    // Initialize session
    await this.initializeSession(ctx);

    // Show main menu
    await this.showMainMenu(ctx);
  }

  private async initializeSession(ctx: UserContext) {
    const userId = ctx.from!.id;

    // Load current user settings
    const settings = await this.userSettingsService.getUserSettings(
      userId,
      FeatureFlag.CUSTOM_USER_FILTERING,
    );

    // Settings store symbol names like ['GBPUSD.a', 'EURUSD.a']
    const symbols = (settings?.symbols as string[]) || [];

    this.sessions.set(userId, {
      selectedSymbols: new Set(symbols),
      originalSymbols: new Set(symbols),
      currentGroup: null,
      currentPage: 0,
    });
  }

  private async showMainMenu(ctx: UserContext) {
    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    // Count total active instruments
    const totalInstruments = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(instruments)
      .where(eq(instruments.isActive, true))
      .then(r => r[0]?.count || 0);

    const selectedCount = session.selectedSymbols.size;

    let statusText: string;
    if (selectedCount === 0) {
      statusText = `✅ Все инструменты (${totalInstruments})`;
    } else {
      statusText = `📊 Выбрано: ${selectedCount} из ${totalInstruments}`;
    }

    const message = `
🎯 Фильтр инструментов

Текущий статус:
${statusText}

Выберите категорию:
`.trim();

    const buttons = [
      [Markup.button.callback('💱 Валюты (28)', 'group:forex')],
      [Markup.button.callback('🛢️ Товары (7)', 'group:commodities')],
      [Markup.button.callback('💰 Криптовалюты (2)', 'group:crypto')],
      [Markup.button.callback('📈 Акции (35)', 'group:stocks')],
      [
        Markup.button.callback('✅ Выбрать все', 'select_all'),
        Markup.button.callback('🗑️ Очистить фильтры', 'clear_filters'),
      ],
      [Markup.button.callback('❌ Закрыть', 'close')],
    ];

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
  }

  @Action(/^group:(.+)$/)
  async onSelectGroup(@Ctx() ctx: UserContext) {
    const match = ctx.match as RegExpMatchArray;
    const group = match[1];

    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;
    session.currentGroup = group;
    session.currentPage = 0;

    if (group === 'stocks') {
      await this.showStocksSubgroups(ctx);
    } else {
      await this.showGroupList(ctx, group);
    }
  }

  private async showGroupList(ctx: UserContext, group: string, page = 0) {
    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    // Get instruments for this group via direct query
    const groupInstruments = await db
      .select()
      .from(instruments)
      .where(
        and(
          eq(instruments.group, group),
          eq(instruments.isActive, true),
        ),
      )
      .orderBy(instruments.sortOrder, instruments.symbol);

    const selectedCount = groupInstruments.filter((i) =>
      session.selectedSymbols.has(i.symbol),
    ).length;

    // Pagination
    const itemsPerPage = 10;
    const totalPages = Math.ceil(groupInstruments.length / itemsPerPage);
    const startIdx = page * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, groupInstruments.length);
    const pageInstruments = groupInstruments.slice(startIdx, endIdx);

    const groupNames: Record<string, string> = {
      forex: 'Валюты',
      commodities: 'Товары',
      crypto: 'Криптовалюты',
    };

    const message = `
💱 ${groupNames[group]} (${groupInstruments.length} инструментов)

Выбрано: ${selectedCount} из ${groupInstruments.length}
`.trim();

    const buttons: any[] = [];

    // Select all / Deselect all buttons
    buttons.push([
      Markup.button.callback('✅ Выбрать всю группу', `select_group:${group}`),
      Markup.button.callback('🗑️ Отменить выбор', `deselect_group:${group}`),
    ]);

    // Instrument buttons
    for (const instrument of pageInstruments) {
      const isSelected = session.selectedSymbols.has(instrument.symbol);
      const checkbox = isSelected ? '☑️' : '☐';
      buttons.push([
        Markup.button.callback(
          `${checkbox} ${instrument.symbol}`,
          `toggle:${instrument.symbol}`,
        ),
      ]);
    }

    // Pagination buttons
    if (totalPages > 1) {
      const paginationRow: any[] = [];
      if (page > 0) {
        paginationRow.push(
          Markup.button.callback('◀️ Пред', `page:${group}:${page - 1}`),
        );
      }
      paginationRow.push(
        Markup.button.callback('💾 Сохранить', `save:${group}`),
      );
      if (page < totalPages - 1) {
        paginationRow.push(
          Markup.button.callback('След ▶️', `page:${group}:${page + 1}`),
        );
      }
      buttons.push(paginationRow);
    } else {
      buttons.push([Markup.button.callback('💾 Сохранить', `save:${group}`)]);
    }

    // Back button
    buttons.push([Markup.button.callback('◀️ Назад в меню', 'back_to_main')]);

    await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
  }

  @Action(/^toggle:(.+)$/)
  async onToggleInstrument(@Ctx() ctx: UserContext) {
    const match = ctx.match as RegExpMatchArray;
    const symbol = match[1];  // Symbol name like 'GBPUSD.a'

    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    if (session.selectedSymbols.has(symbol)) {
      session.selectedSymbols.delete(symbol);
    } else {
      session.selectedSymbols.add(symbol);
    }

    // Refresh current screen
    await this.showGroupList(ctx, session.currentGroup!, session.currentPage);
  }

  @Action(/^select_group:(.+)$/)
  async onSelectAllGroup(@Ctx() ctx: UserContext) {
    const match = ctx.match as RegExpMatchArray;
    const group = match[1];

    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    // Get instruments for this group
    const groupInstruments = await db
      .select()
      .from(instruments)
      .where(
        and(
          eq(instruments.group, group),
          eq(instruments.isActive, true),
        ),
      );

    for (const instrument of groupInstruments) {
      session.selectedSymbols.add(instrument.symbol);
    }

    await this.showGroupList(ctx, group, session.currentPage);
  }

  @Action(/^deselect_group:(.+)$/)
  async onDeselectAllGroup(@Ctx() ctx: UserContext) {
    const match = ctx.match as RegExpMatchArray;
    const group = match[1];

    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    // Get instruments for this group
    const groupInstruments = await db
      .select()
      .from(instruments)
      .where(
        and(
          eq(instruments.group, group),
          eq(instruments.isActive, true),
        ),
      );

    for (const instrument of groupInstruments) {
      session.selectedSymbols.delete(instrument.symbol);
    }

    await this.showGroupList(ctx, group, session.currentPage);
  }

  @Action(/^page:(.+):(\d+)$/)
  async onPageChange(@Ctx() ctx: UserContext) {
    const match = ctx.match as RegExpMatchArray;
    const group = match[1];
    const page = parseInt(match[2], 10);

    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;
    session.currentPage = page;

    await this.showGroupList(ctx, group, page);
  }

  @Action(/^save:(.+)$/)
  async onSave(@Ctx() ctx: UserContext) {
    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    // Save to database - store symbol names
    await this.userSettingsService.saveUserSettings(
      userId,
      FeatureFlag.CUSTOM_USER_FILTERING,
      {
        symbols: Array.from(session.selectedSymbols),
      },
    );

    // Update original state
    session.originalSymbols = new Set(session.selectedSymbols);

    await this.showConfirmation(ctx);
  }

  private async showConfirmation(ctx: UserContext) {
    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    const selectedCount = session.selectedSymbols.size;

    // Count total active instruments
    const totalInstruments = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(instruments)
      .where(eq(instruments.isActive, true))
      .then(r => r[0]?.count || 0);

    const message = `
✅ Фильтр сохранён!

Вы будете получать сигналы только по выбранным инструментам.

Всего выбрано: ${selectedCount} из ${totalInstruments}
`.trim();

    const buttons = [
      [Markup.button.callback('✏️ Изменить фильтр', 'edit_filters')],
      [Markup.button.callback('🗑️ Очистить фильтр', 'clear_filters_confirm')],
      [Markup.button.callback('❌ Закрыть', 'close')],
    ];

    await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
  }

  @Action('select_all')
  async onSelectAll(@Ctx() ctx: UserContext) {
    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    // Clear all selections (default = receive all signals)
    session.selectedSymbols.clear();

    await this.userSettingsService.resetUserSettings(
      userId,
      FeatureFlag.CUSTOM_USER_FILTERING,
    );

    await ctx.answerCbQuery('✅ Все фильтры сброшены. Вы получаете все сигналы.');
    await this.showMainMenu(ctx);
  }

  @Action('clear_filters')
  async onClearFilters(@Ctx() ctx: UserContext) {
    const message = `
⚠️ Подтверждение

Вы уверены, что хотите очистить все фильтры?

После очистки вы снова будете получать сигналы по всем инструментам.
`.trim();

    const buttons = [
      [Markup.button.callback('✅ Да, очистить', 'clear_filters_confirm')],
      [Markup.button.callback('❌ Отмена', 'back_to_main')],
    ];

    await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
  }

  @Action('clear_filters_confirm')
  async onClearFiltersConfirm(@Ctx() ctx: UserContext) {
    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    session.selectedSymbols.clear();
    await this.userSettingsService.resetUserSettings(
      userId,
      FeatureFlag.CUSTOM_USER_FILTERING,
    );

    await ctx.answerCbQuery('✅ Фильтры очищены');
    await this.showMainMenu(ctx);
  }

  @Action('back_to_main')
  async onBackToMain(@Ctx() ctx: UserContext) {
    const userId = ctx.from!.id;
    const session = this.sessions.get(userId)!;

    // Discard changes
    session.selectedSymbols = new Set(session.originalSymbols);

    await this.showMainMenu(ctx);
  }

  @Action('close')
  async onClose(@Ctx() ctx: UserContext) {
    const userId = ctx.from!.id;
    this.sessions.delete(userId);

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await ctx.scene.leave();
  }

  private async showStocksSubgroups(ctx: UserContext) {
    const message = `
📈 Акции (35 инструментов)

Выберите подгруппу:
`.trim();

    const buttons = [
      [Markup.button.callback('🇪🇺 Европейские (7)', 'subgroup:european')],
      [Markup.button.callback('🇺🇸 Американские (28)', 'subgroup:us')],
      [
        Markup.button.callback('✅ Выбрать все акции', 'select_all_stocks'),
        Markup.button.callback('🗑️ Отменить выбор', 'deselect_all_stocks'),
      ],
      [Markup.button.callback('◀️ Назад в меню', 'back_to_main')],
    ];

    await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
  }

  @Action(/^subgroup:(.+)$/)
  async onSelectSubgroup(@Ctx() ctx: UserContext) {
    const match = ctx.match as RegExpMatchArray;
    const subgroup = match[1];

    await this.showGroupList(ctx, subgroup);
  }
}
```

### 4.2 Register Scene in Bot Module

**File**: `libs/bot/src/bot.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { FilterSettingsScene } from './scenes/filter-settings.scene';

@Module({
  imports: [DbModule],
  providers: [
    FeatureFlagService,
    UserSettingsService,
    FilterSettingsScene, // Add scene
  ],
  exports: [
    FeatureFlagService,
    UserSettingsService,
  ],
})
export class BotModule {}
```

### 4.3 Add Filter Command

**File**: `libs/bot/src/commands/filter.commands.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Command, Ctx } from '@quantumdeal/telegraf';
import { UserContext } from '../interfaces/user-context.interface';
import { hasFeature } from '../interfaces/user.dto';
import { FeatureFlag } from '@quantumdeal/db/schema';

@Injectable()
export class FilterCommands {
  @Command('filter')
  async onFilterCommand(@Ctx() ctx: UserContext) {
    if (!ctx.user) {
      await ctx.reply('Please /start the bot first.');
      return;
    }

    // Check if user has CUSTOM_USER_FILTERING feature (VIP only)
    // Note: TIER_BASED_FILTERING is available to all tiers but is system-managed
    if (!hasFeature(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING)) {
      await ctx.reply(
        '❌ Custom filtering is not available in your subscription.\n\n' +
        'NOTE: All subscribers receive signals filtered by subscription tier.\n\n' +
        'Upgrade to VIP to unlock custom user filtering:\n' +
        '• Choose specific instruments\n' +
        '• Personalize your signal delivery\n\n' +
        'Use /upgrade for more information.',
      );
      return;
    }

    // Enter filter settings scene
    await ctx.scene.enter('filter-settings');
  }
}
```

---

## Phase 5: Integration & Testing

**Duration**: 2-3 days
**Goal**: Integrate feature flags into webhook processing, test end-to-end

### 5.1 Update Webhook Processor

**File**: `libs/bot/src/services/webhook-processor.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import {
  SubscriptionsRepository,
  UserSubscriptionsRepository,
  UserSubscriptionFeaturesRepository,
} from '@quantumdeal/db';
import { FeatureFlag, instruments } from '@quantumdeal/db/schema';
import { MergedOrder } from '../interfaces/merged-order.interface';
import { db } from '@quantumdeal/db';
import { eq, sql } from 'drizzle-orm';

/**
 * NOTE: This service requires the instruments table to be created.
 * See docs/feature-flags/CRITICAL_GAPS_ANALYSIS.md for implementation.
 */

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly userSubscriptionsRepo: UserSubscriptionsRepository,
    private readonly userFeaturesRepo: UserSubscriptionFeaturesRepository,
  ) {}

  /**
   * Process incoming webhook and broadcast to eligible users
   *
   * Uses the correct pattern:
   * 1. findBySector() - Get subscriptions for this sector (TIER_BASED_FILTERING)
   * 2. getEligibleUsers() - Get active users for each subscription
   * 3. Apply CUSTOM_USER_FILTERING if user has that feature
   */
  async processWebhook(order: MergedOrder): Promise<void> {
    // Step 1: Find subscriptions by sector (TIER_BASED_FILTERING)
    // This applies tier-based filtering at the subscription level
    const subscriptions = await this.subscriptionsRepo.findBySector(
      order.sector,
    );

    this.logger.log(
      `Found ${subscriptions.length} subscriptions for sector ${order.sector}`,
    );

    for (const subscription of subscriptions) {
      // Step 2: Get eligible users for this subscription
      // This gets all active users with this subscription
      const eligibleUsers = await this.getEligibleUsers(
        subscription.subscriptionId,
      );

      this.logger.log(
        `Processing ${eligibleUsers.length} eligible users for subscription ${subscription.subscriptionId}`,
      );

      for (const user of eligibleUsers) {
        // Step 3: Apply custom user filtering (if user has CUSTOM_USER_FILTERING feature)
        const shouldSend = await this.shouldSendSignal(
          user.userId,
          order,
          subscription.hasCustomFiltering,
        );

        if (shouldSend) {
          await this.sendSignalToUser(user.userId, order);
        }
      }
    }
  }

  /**
   * Get eligible users for a subscription
   * Returns active users with active subscriptions
   */
  private async getEligibleUsers(
    subscriptionId: number,
  ): Promise<Array<{ userId: number; isActive: boolean }>> {
    return this.userSubscriptionsRepo.findActiveUsers(subscriptionId);
  }

  /**
   * Determine if signal should be sent to user
   */
  private async shouldSendSignal(
    userId: number,
    order: MergedOrder,
    hasCustomFilteringFeature: boolean,
  ): Promise<boolean> {
    // If user doesn't have CUSTOM_USER_FILTERING feature, send all signals
    if (!hasCustomFilteringFeature) {
      return true;
    }

    // Check if user has configured custom filtering
    const userSettings = await this.userFeaturesRepo.getUserFeatureSettings(
      userId,
      FeatureFlag.CUSTOM_USER_FILTERING,
    );

    // No settings configured = receive all signals
    if (!userSettings || !userSettings.settings) {
      return true;
    }

    // Apply custom filtering based on symbol names
    return this.applyCustomFiltering(userId, order, userSettings.settings);
  }

  /**
   * Apply custom user filtering
   * Checks if signal matches user's symbol filter
   */
  private async applyCustomFiltering(
    userId: number,
    order: MergedOrder,
    settings: any,
  ): Promise<boolean> {
    const { symbols } = settings;

    // No symbol filter configured = receive all signals
    if (!symbols || symbols.length === 0) {
      return true;
    }

    // Get instrument symbol from order
    const instrument = await db
      .select()
      .from(instruments)
      .where(eq(instruments.id, order.instrumentId))
      .limit(1)
      .then(r => r[0]);

    if (!instrument) {
      this.logger.warn(
        `Instrument ${order.instrumentId} not found for user ${userId}`,
      );
      return false;
    }

    // Check if instrument symbol is in user's whitelist
    const isAllowed = symbols.includes(instrument.symbol);

    if (!isAllowed) {
      this.logger.debug(
        `User ${userId} filtered: symbol ${instrument.symbol} not in whitelist`,
      );
    }

    return isAllowed;
  }

  /**
   * Send signal to user via Telegram
   */
  private async sendSignalToUser(
    userId: number,
    order: MergedOrder,
  ): Promise<void> {
    this.logger.log(`Sending signal to user ${userId}`);
    // Implementation: send Telegram message
    // this.bot.telegram.sendMessage(userId, formatSignalMessage(order));
  }
}
```

### 5.2 Update Subscriptions Repository

**File**: `libs/db/src/repositories/subscriptions.repository.ts`

Add method to find subscriptions by sector with custom filtering check:

```typescript
/**
 * Find subscriptions by sector with custom filtering check
 *
 * This replaces the deprecated subscription.scope field usage.
 * Now queries subscription_features.config.sectors instead.
 */
async findBySector(sector: string): Promise<SubscriptionWithFeatures[]> {
  const result = await this.db
    .select({
      subscriptionId: subscriptions.id,
      subscriptionName: subscriptions.name,
      hasCustomFiltering: sql<boolean>`
        CASE WHEN sf_custom.is_enabled = true THEN true ELSE false END
      `,
    })
    .from(subscriptions)
    .innerJoin(
      subscriptionFeatures,
      eq(subscriptions.id, subscriptionFeatures.subscriptionId),
    )
    .leftJoin(
      sql`subscription_features sf_custom`,
      sql`subscriptions.id = sf_custom.subscription_id AND sf_custom.feature_key = 'custom_user_filtering'`,
    )
    .where(
      and(
        eq(subscriptions.isActive, true),
        eq(subscriptionFeatures.featureKey, 'tier_based_filtering'),
        eq(subscriptionFeatures.isEnabled, true),
        sql`${subscriptionFeatures.config}->>'sectors' @> ${JSON.stringify([sector])}`,
      ),
    );

  return result;
}

interface SubscriptionWithFeatures {
  subscriptionId: number;
  subscriptionName: string;
  hasCustomFiltering: boolean;
}
```

### 5.3 Manual Testing Checklist

- [ ] Basic user cannot access `/filter` command (shows upgrade message for custom filtering)
- [ ] Basic user receives signals filtered by TIER_BASED_FILTERING (subscription sectors)
- [ ] VIP user can access `/filter` command (enters scene)
- [ ] VIP user can select instruments across different groups
- [ ] VIP user can save custom filter settings
- [ ] VIP user can clear custom filter settings
- [ ] Custom filter settings persist after bot restart
- [ ] Webhook filtering works correctly:
  - [ ] TIER_BASED_FILTERING applies to Basic users (by sector)
  - [ ] TIER_BASED_FILTERING + CUSTOM_USER_FILTERING apply to VIP users
- [ ] User with multiple subscriptions gets union of features
- [ ] Downgrade from VIP to Basic:
  - [ ] Removes CUSTOM_USER_FILTERING feature
  - [ ] Keeps TIER_BASED_FILTERING
  - [ ] Preserves custom settings (inactive until upgrade)
- [ ] Upgrade from Basic to VIP:
  - [ ] Grants CUSTOM_USER_FILTERING feature
  - [ ] Keeps TIER_BASED_FILTERING
  - [ ] Restores previously saved custom settings (if any)

---

## Rollout Strategy

### Stage 1: Staging Deployment (2-3 days)

1. **Deploy to staging environment**
   ```bash
   # Deploy staging
   git push staging feature/feature-flags

   # Run migrations
   DATABASE_URL=$STAGING_DB pnpm db:migrate

   # Seed features
   DATABASE_URL=$STAGING_DB npx ts-node scripts/seed-feature-flags.ts
   ```

2. **Test with internal accounts**
   - Create test Basic user
   - Create test VIP user
   - Test all UI flows
   - Verify webhook filtering

3. **Monitor logs and metrics**
   ```bash
   # Watch logs
   tail -f /var/log/quantum-deal/bot.log | grep feature

   # Check database
   psql $STAGING_DB -c "SELECT COUNT(*) FROM subscription_features"
   ```

### Stage 2: Pilot Users (3-5 days)

1. **Select pilot group**
   - 10-20 VIP users
   - 10-20 Basic users
   - Mix of active and occasional users

2. **Enable for pilot users**
   ```sql
   -- Mark pilot users in database
   UPDATE users SET is_pilot = true WHERE telegram_id IN (...);
   ```

3. **Collect feedback**
   - Monitor support tickets
   - Track feature usage
   - Identify UX issues

4. **Iterate based on feedback**

### Stage 3: Full Production (1-2 days)

1. **Deploy to production**
   ```bash
   # Create backup
   pg_dump quantum_deal > backup_pre_feature_flags.sql

   # Deploy
   git push production main

   # Run migrations
   pnpm db:migrate

   # Seed features
   npx ts-node scripts/seed-feature-flags.ts
   ```

2. **Monitor metrics**
   - Feature check latency
   - Database query times
   - Error rates
   - Feature adoption rates

3. **Announce to users**
   - Broadcast message about new features
   - Update documentation
   - Notify support team

---

## Monitoring & Metrics

### Application Metrics

```typescript
// Add to FeatureFlagService
async getUserFeatures(userId: number): Promise<UserFeatures> {
  const startTime = Date.now();

  const features = await this.featuresRepository.getFeaturesByUserId(userId);

  const duration = Date.now() - startTime;
  this.logger.log({
    event: 'feature_load',
    userId,
    duration,
    featureCount: features.length,
  });

  // ... rest of method
}
```

### Database Queries to Monitor

```sql
-- Query performance
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%subscription_features%'
ORDER BY mean_time DESC
LIMIT 10;

-- Feature adoption
SELECT
  sf.feature_key,
  COUNT(DISTINCT us.user_id) as user_count
FROM subscription_features sf
JOIN user_subscriptions us ON sf.subscription_id = us.subscription_id
WHERE sf.is_enabled = true
  AND us.is_active = true
GROUP BY sf.feature_key;

-- User settings distribution
SELECT
  feature_key,
  COUNT(*) as users_with_settings,
  AVG(jsonb_array_length(settings->'instruments')) as avg_instruments_selected
FROM user_subscription_features
WHERE is_active = true
  AND feature_key = 'custom_user_filtering'
GROUP BY feature_key;
```

### Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Feature load time | < 50ms | > 100ms |
| Database query time | < 20ms | > 50ms |
| Webhook processing delay | < 500ms | > 1000ms |
| Error rate | < 0.1% | > 1% |

---

## Rollback Plan

### If Critical Issues Occur

**1. Immediate Rollback (Code)**

```bash
# Revert deployment
git revert HEAD
git push production main

# Restart services
pm2 restart quantum-deal
```

**2. Database Rollback (if needed)**

```bash
# Restore from backup
psql quantum_deal < backup_pre_feature_flags.sql

# Or drop new tables
psql quantum_deal -c "DROP TABLE user_subscription_features CASCADE"
psql quantum_deal -c "DROP TABLE subscription_features CASCADE"
```

**3. Gradual Rollback (Feature Flags)**

```sql
-- Disable all features (without dropping tables)
UPDATE subscription_features SET is_enabled = false;

-- Or disable for specific subscription
UPDATE subscription_features
SET is_enabled = false
WHERE subscription_id = X;
```

### Rollback Testing

Test rollback procedure on staging before production:

```bash
# On staging
1. Deploy feature flags
2. Create test data
3. Execute rollback
4. Verify system works
```

---

## Post-Launch Checklist

### Week 1 After Launch

- [ ] Monitor all metrics daily
- [ ] Review error logs
- [ ] Collect user feedback
- [ ] Track feature adoption rates
- [ ] Verify performance targets met

### Week 2-4 After Launch

- [ ] Analyze feature usage patterns
- [ ] Identify optimization opportunities
- [ ] Plan next iteration
- [ ] Update documentation based on learnings
- [ ] Train support team on new features

### Continuous Monitoring

```sql
-- Weekly feature usage report
SELECT
  DATE_TRUNC('week', created_at) as week,
  feature_key,
  COUNT(*) as new_users
FROM user_subscription_features
WHERE created_at >= NOW() - INTERVAL '4 weeks'
GROUP BY week, feature_key
ORDER BY week DESC, feature_key;
```

---

## Related Documentation

- [README.md](./README.md) - Architecture overview
- [database-schema.md](./database-schema.md) - Database design
- [FEATURE_CATALOG.md](./FEATURE_CATALOG.md) - Feature specifications
- [examples.md](./examples.md) - Code examples
- [telegram-ui-flow.md](./telegram-ui-flow.md) - UI mockups
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Developer cheat sheet

---

## Support

For implementation questions or issues:
1. Review this implementation plan
2. Check related documentation
3. Review test cases in `/test/e2e/`
4. Contact development team lead

---

**Implementation Plan Version**: 2.0
**Last Updated**: 2025-10-16
**Status**: Active
