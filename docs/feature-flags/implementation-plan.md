# Feature Flags Implementation Plan

## Overview

This document provides a step-by-step implementation plan for the feature flags system. The implementation is divided into 4 phases, each building on the previous one.

> **Note**: Signal delivery is core functionality, not a feature flag.

**Core Features**: 2 filtering features
- TIER_BASED_FILTERING - System-controlled filtering by subscription tier
- CUSTOM_USER_FILTERING - User-configurable filtering preferences

**Estimated Timeline**: 1 week (depending on team size and testing requirements)

## Phase 1: Database and Repository Layer

**Duration**: 1-2 days
**Goal**: Create database schema and repository layer for feature flags

### Tasks

#### 1.1 Create Database Schema

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

// Note: Signal delivery is core functionality, not a feature flag
export enum FeatureFlag {
  // Filtering Features (2 features only)
  TIER_BASED_FILTERING = 'tier_based_filtering',
  CUSTOM_USER_FILTERING = 'custom_user_filtering',
}

export type FeatureConfig = Record<string, unknown>;

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
    // Values: 'tier_based_filtering' | 'custom_user_filtering'
    isEnabled: boolean('is_enabled').notNull().default(true),
    config: jsonb('config').$type<FeatureConfig>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueSubscriptionFeature: unique('uq_subscription_feature').on(
      table.subscriptionId,
      table.featureKey,
    ),
  }),
);

export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type NewSubscriptionFeature = typeof subscriptionFeatures.$inferInsert;
```

### Pre-Migration Checklist

Before running database migrations, ensure all prerequisites are met:

| Task | Command | Purpose |
|------|---------|---------|
| **Backup database** | `pg_dump quantum_deal > backup_$(date +%Y%m%d).sql` | Create recovery point before schema changes |
| **Verify DB connection** | `psql -d quantum_deal -c "SELECT version();"` | Ensure database is accessible |
| **Check existing tables** | `psql -d quantum_deal -c "\dt"` | Verify `subscriptions` table exists |
| **Test on staging** | `DATABASE_URL=<staging> pnpm migration:run` | Validate migration on non-production environment |
| **Review migration file** | `cat migrations/XXXXXX_add_subscription_features.sql` | Inspect generated SQL before applying |
| **Verify Drizzle config** | `cat drizzle.config.ts` | Ensure correct database credentials |
| **Check disk space** | `df -h` | Confirm sufficient storage for new table |
| **Stop application** | `pm2 stop quantum-deal` or `systemctl stop quantum-deal` | Prevent writes during migration |

**Migration Safety Steps:**

1. ✅ Run migration on **staging environment** first
2. ✅ Verify indexes are created: `\d subscription_features`
3. ✅ Test rollback: Keep backup SQL ready
4. ✅ Monitor migration logs for errors
5. ✅ Verify foreign key constraints are working

**Quick Rollback Command:**
```bash
# If migration fails, restore from backup
psql quantum_deal < backup_YYYYMMDD.sql
```

#### 1.2 Run Database Migration

```bash
# Generate migration
npx drizzle-kit generate:pg

# Review migration file
# Apply migration
npx drizzle-kit push:pg

# Verify table created
psql -d your_database -c "\d subscription_features"
```

#### 1.3 Create Repository

**File**: `libs/db/src/repositories/subscription-features.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { db } from '../db';
import {
  subscriptionFeatures,
  FeatureFlag,
  FeatureConfig,
  SubscriptionFeature,
  NewSubscriptionFeature,
} from '../schema/subscription-features';
import { userSubscriptions } from '../schema/user-subscriptions';
import { subscriptions } from '../schema/subscriptions';
import { eq, and, inArray, sql } from 'drizzle-orm';

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

  /**
   * Add or update a feature for a subscription
   */
  async upsertFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
    isEnabled: boolean = true,
    config: FeatureConfig = {},
  ): Promise<SubscriptionFeature> {
    const [result] = await db
      .insert(subscriptionFeatures)
      .values({
        subscriptionId,
        featureKey,
        isEnabled,
        config,
      })
      .onConflictDoUpdate({
        target: [
          subscriptionFeatures.subscriptionId,
          subscriptionFeatures.featureKey,
        ],
        set: {
          isEnabled,
          config,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    return result;
  }

  /**
   * Enable a feature for a subscription
   */
  async enableFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
    config: FeatureConfig = {},
  ): Promise<SubscriptionFeature> {
    return this.upsertFeature(subscriptionId, featureKey, true, config);
  }

  /**
   * Disable a feature for a subscription
   */
  async disableFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await db
      .update(subscriptionFeatures)
      .set({
        isEnabled: false,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(subscriptionFeatures.subscriptionId, subscriptionId),
          eq(subscriptionFeatures.featureKey, featureKey),
        ),
      );
  }

  /**
   * Remove a feature from a subscription (hard delete)
   */
  async removeFeature(
    subscriptionId: number,
    featureKey: FeatureFlag,
  ): Promise<void> {
    await db
      .delete(subscriptionFeatures)
      .where(
        and(
          eq(subscriptionFeatures.subscriptionId, subscriptionId),
          eq(subscriptionFeatures.featureKey, featureKey),
        ),
      );
  }

  /**
   * Set multiple features for a subscription (replaces existing)
   */
  async setFeatures(
    subscriptionId: number,
    features: Array<{
      featureKey: FeatureFlag;
      isEnabled?: boolean;
      config?: FeatureConfig;
    }>,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove existing features
      await tx
        .delete(subscriptionFeatures)
        .where(eq(subscriptionFeatures.subscriptionId, subscriptionId));

      // Insert new features
      if (features.length > 0) {
        await tx.insert(subscriptionFeatures).values(
          features.map((f) => ({
            subscriptionId,
            featureKey: f.featureKey,
            isEnabled: f.isEnabled ?? true,
            config: f.config ?? {},
          })),
        );
      }
    });
  }

  /**
   * Get all subscriptions that have a specific feature
   */
  async getSubscriptionsWithFeature(
    featureKey: FeatureFlag,
  ): Promise<number[]> {
    const result = await db
      .selectDistinct({ subscriptionId: subscriptionFeatures.subscriptionId })
      .from(subscriptionFeatures)
      .where(
        and(
          eq(subscriptionFeatures.featureKey, featureKey),
          eq(subscriptionFeatures.isEnabled, true),
        ),
      );

    return result.map((r) => r.subscriptionId);
  }
}
```

#### 1.4 Update Database Module

**File**: `libs/db/src/db.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { SubscriptionFeaturesRepository } from './repositories/subscription-features.repository';
// ... other imports

@Module({
  providers: [
    // ... existing repositories
    SubscriptionFeaturesRepository,
  ],
  exports: [
    // ... existing repositories
    SubscriptionFeaturesRepository,
  ],
})
export class DbModule {}
```

### Testing Phase 1

```typescript
// libs/db/src/repositories/subscription-features.repository.spec.ts
describe('SubscriptionFeaturesRepository', () => {
  let repository: SubscriptionFeaturesRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SubscriptionFeaturesRepository],
    }).compile();

    repository = module.get(SubscriptionFeaturesRepository);
  });

  it('should enable a feature', async () => {
    const result = await repository.enableFeature(
      1,
      FeatureFlag.TIER_BASED_FILTERING,
    );
    expect(result.isEnabled).toBe(true);
  });

  it('should get user features from multiple subscriptions', async () => {
    const features = await repository.getFeaturesByUserId(testUserId);
    expect(features.length).toBeGreaterThan(0);
  });

  // Add more tests...
});
```

## Phase 2: Service Layer

**Duration**: 1-2 days
**Goal**: Implement business logic for feature flag management

### Tasks

#### 2.1 Create Feature Flag Service

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
   * Check if user has feature (with caching)
   * Use this with pre-loaded user context
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
   * Get all features for a subscription
   */
  async getSubscriptionFeatures(subscriptionId: number) {
    return this.featuresRepository.getFeaturesBySubscriptionId(subscriptionId);
  }

  /**
   * Validate if feature key is valid
   */
  isValidFeature(key: string): key is FeatureFlag {
    return Object.values(FeatureFlag).includes(key as FeatureFlag);
  }
}

/**
 * Note: Feature Management (Enabling/Disabling Features)
 *
 * Features are managed directly in the database via:
 * - Direct SQL queries
 * - Admin panel (external tool)
 * - Database migrations for feature rollouts
 *
 * The FeatureFlagService is READ-ONLY from the bot's perspective.
 * It only queries and caches features, it does not modify them.
 *
 * Examples of database-level feature management:
 *
 * // Enable a feature via SQL
 * INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
 * VALUES (1, 'tier_based_filtering', true, '{}')
 * ON CONFLICT (subscription_id, feature_key)
 * DO UPDATE SET is_enabled = true, updated_at = NOW();
 *
 * // Disable a feature via SQL
 * UPDATE subscription_features
 * SET is_enabled = false, updated_at = NOW()
 * WHERE subscription_id = 1 AND feature_key = 'tier_based_filtering';
 *
 * // Apply a feature template via SQL
 * INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
 * VALUES
 *   (2, 'tier_based_filtering', true, '{}'),
 *   (2, 'custom_user_filtering', true, '{}')
 * ON CONFLICT (subscription_id, feature_key)
 * DO UPDATE SET is_enabled = true, updated_at = NOW();
 */

// Feature Templates
export enum FeatureTemplate {
  SIGNALS_BASIC = 'SIGNALS_BASIC',
  SIGNALS_VIP = 'SIGNALS_VIP',
}

// Note: Signal delivery is core functionality, not a feature flag
export const FEATURE_TEMPLATES: Record<
  FeatureTemplate,
  { name: string; features: FeatureFlag[] }
> = {
  [FeatureTemplate.SIGNALS_BASIC]: {
    name: 'Basic Signals',
    features: [], // No feature flags - just active subscription
  },
  [FeatureTemplate.SIGNALS_VIP]: {
    name: 'VIP Signals',
    features: [
      FeatureFlag.TIER_BASED_FILTERING,
      FeatureFlag.CUSTOM_USER_FILTERING,
    ],
  },
};
```

#### 2.2 Update User DTO

**File**: `libs/bot/src/interfaces/user.dto.ts`

Add to existing file:

```typescript
import { FeatureFlag, FeatureConfig } from '@quantumdeal/db/schema';

// Add to UserWithSubscriptions interface
export interface UserWithSubscriptions {
  // ... existing fields
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  lang: string | null;
  isPremium: boolean;
  isActive: boolean;
  createdAt: Date;
  activeSubscriptions: ActiveSubscriptionDto[];

  // Feature flags
  enabledFeatures: Set<FeatureFlag>;
  featureConfigs: Map<FeatureFlag, FeatureConfig>;
}

// Helper function to check feature
export function hasFeature(
  user: UserWithSubscriptions,
  feature: FeatureFlag,
): boolean {
  return user.enabledFeatures.has(feature);
}

// Helper function to get feature config
export function getFeatureConfig(
  user: UserWithSubscriptions,
  feature: FeatureFlag,
): FeatureConfig | null {
  return user.featureConfigs.get(feature) || null;
}
```

#### 2.3 Update Bot Module

**File**: `libs/bot/src/bot.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { FeatureFlagService } from './services/feature-flag.service';
import { DbModule } from '@quantumdeal/db';
// ... other imports

@Module({
  imports: [DbModule /* ... other modules */],
  providers: [
    // ... existing providers
    FeatureFlagService,
  ],
  exports: [
    // ... existing exports
    FeatureFlagService,
  ],
})
export class BotModule {}
```

### Testing Phase 2

```typescript
// libs/bot/src/services/feature-flag.service.spec.ts
describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let repository: SubscriptionFeaturesRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        {
          provide: SubscriptionFeaturesRepository,
          useValue: {
            getFeaturesByUserId: jest.fn(),
            hasFeature: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(FeatureFlagService);
    repository = module.get(SubscriptionFeaturesRepository);
  });

  it('should return user features', async () => {
    jest.spyOn(repository, 'getFeaturesByUserId').mockResolvedValue([
      {
        id: 1,
        subscriptionId: 1,
        featureKey: FeatureFlag.TIER_BASED_FILTERING,
        isEnabled: true,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.getUserFeatures(123);
    expect(result.enabledFeatures.has(FeatureFlag.TIER_BASED_FILTERING)).toBe(true);
  });

  // Add more tests...
});
```

## Phase 3: Access Control

**Duration**: 1-2 days
**Goal**: Implement decorators, guards, and middleware for feature access control

### Tasks

#### 3.1 Update User Management Middleware

**File**: `libs/bot/src/middleware/user-management.middleware.ts`

Update existing middleware to load features:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Context } from '@quantumdeal/framework';
import { UsersRepository, UserSubscriptionsRepository } from '@quantumdeal/db';
import { FeatureFlagService } from '../services/feature-flag.service';
import { UserWithSubscriptions } from '../interfaces/user.dto';

@Injectable()
export class UserManagementMiddleware implements NestMiddleware {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly subscriptionsRepository: UserSubscriptionsRepository,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async use(ctx: Context, next: () => Promise<void>) {
    if (!ctx.from?.id) {
      return next();
    }

    // Load user and subscriptions (existing logic)
    const user = await this.usersRepository.findByTelegramId(ctx.from.id);
    if (!user) {
      return next();
    }

    const activeSubscriptions =
      await this.subscriptionsRepository.getActiveSubscriptions(user.telegramId);

    // Load feature flags
    const { enabledFeatures, featureConfigs } =
      await this.featureFlagService.getUserFeatures(user.telegramId);

    // Attach to context
    (ctx as any).user = {
      ...user,
      activeSubscriptions,
      enabledFeatures,
      featureConfigs,
    } as UserWithSubscriptions;

    await next();
  }
}
```

#### 3.2 Create Feature Decorator

**File**: `libs/bot/src/decorators/require-feature.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { FeatureFlag } from '@quantumdeal/db/schema';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * Decorator to require a specific feature for a handler
 *
 * Usage:
 * @RequireFeature(FeatureFlag.TIER_BASED_FILTERING)
 * async handleFilterCommand(@Ctx() ctx: UserContext) { }
 */
export const RequireFeature = (feature: FeatureFlag) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);
```

#### 3.3 Create Feature Guard

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

#### 3.4 Create Telegraf Scene Guard

**File**: `libs/bot/src/guards/feature-scene.guard.ts`

For Telegraf scene handlers:

```typescript
import { Injectable } from '@nestjs/common';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { UserContext } from '../interfaces/user-context.interface';
import { hasFeature } from '../interfaces/user.dto';

@Injectable()
export class FeatureSceneGuard {
  /**
   * Check if user has required feature
   * Use this in scene enter/action handlers
   */
  async canAccess(
    ctx: UserContext,
    feature: FeatureFlag,
  ): Promise<boolean> {
    if (!ctx.user) {
      return false;
    }

    return hasFeature(ctx.user, feature);
  }

  /**
   * Send feature not available message
   */
  async sendFeatureNotAvailable(
    ctx: UserContext,
    feature: FeatureFlag,
  ): Promise<void> {
    await ctx.reply(
      `This feature (${feature}) is not available in your subscription. ` +
        `Please upgrade to access this functionality.`,
    );
  }
}
```

### Testing Phase 3

```typescript
// libs/bot/src/guards/feature.guard.spec.ts
describe('FeatureGuard', () => {
  let guard: FeatureGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new FeatureGuard(reflector);
  });

  it('should allow access when feature is enabled', () => {
    const mockContext = createMockExecutionContext({
      user: {
        telegramId: 123,
        enabledFeatures: new Set([FeatureFlag.TIER_BASED_FILTERING]),
      },
    });

    jest
      .spyOn(reflector, 'get')
      .mockReturnValue(FeatureFlag.TIER_BASED_FILTERING);

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should deny access when feature is not enabled', () => {
    const mockContext = createMockExecutionContext({
      user: {
        telegramId: 123,
        enabledFeatures: new Set([]),
      },
    });

    jest
      .spyOn(reflector, 'get')
      .mockReturnValue(FeatureFlag.TIER_BASED_FILTERING);

    expect(guard.canActivate(mockContext)).toBe(false);
  });
});
```

## Phase 4: Integration and Migration

**Duration**: 2-3 days
**Goal**: Migrate existing system and integrate feature checks into existing commands

### Tasks

#### 4.1 Seed Existing Subscriptions

Create a migration script:

**File**: `scripts/migrate-subscription-features.ts`

```typescript
import { db } from '../libs/db/src/db';
import { subscriptions, subscriptionFeatures } from '../libs/db/src/schema';
import { FeatureFlag } from '../libs/db/src/schema/subscription-features';
import { eq } from 'drizzle-orm';

async function migrateFeatures() {
  console.log('Starting feature flags migration...');

  const allSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.isActive, true));

  console.log(`Found ${allSubscriptions.length} active subscriptions`);

  for (const subscription of allSubscriptions) {
    let features: FeatureFlag[] = [];

    // Determine features based on type and name
    // Note: Signal delivery is core functionality, not a feature flag
    if (subscription.type === 'signals') {
      const name = subscription.name.toLowerCase();

      if (name.includes('vip')) {
        features = [
          FeatureFlag.TIER_BASED_FILTERING,
          FeatureFlag.CUSTOM_USER_FILTERING,
        ];
      } else {
        // Basic tier - no feature flags needed
        features = [];
      }
    }

    // Insert features
    for (const featureKey of features) {
      await db
        .insert(subscriptionFeatures)
        .values({
          subscriptionId: subscription.id,
          featureKey,
          isEnabled: true,
          config: {},
        })
        .onConflictDoNothing();
    }

    console.log(
      `✓ Migrated subscription ${subscription.id} "${subscription.name}" with ${features.length} features`,
    );
  }

  console.log('Migration completed!');
}

migrateFeatures().catch(console.error);
```

Run migration:
```bash
npx ts-node scripts/migrate-subscription-features.ts
```

#### 4.2 Add Feature Checks to Existing Commands

Example: Add feature check to filter command

**File**: `libs/bot/src/commands/filter.commands.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Command, Ctx } from 'nestjs-telegraf';
import { UserContext } from '../interfaces/user-context.interface';
import { hasFeature } from '../interfaces/user.dto';
import { FeatureFlag } from '@quantumdeal/db/schema';

@Injectable()
export class FilterCommands {
  /**
   * Filter events command
   * Requires TIER_BASED_FILTERING or CUSTOM_USER_FILTERING
   */
  @Command('filter')
  async filterEvents(@Ctx() ctx: UserContext) {
    // Check feature access (2 features only)
    const hasTierFiltering = hasFeature(ctx.user, FeatureFlag.TIER_BASED_FILTERING);
    const hasCustomFiltering = hasFeature(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING);

    if (!ctx.user || (!hasTierFiltering && !hasCustomFiltering)) {
      await ctx.reply(
        '❌ Signal filtering is not available in your subscription.\n\n' +
          'Note: All active subscribers receive signals.\n' +
          'Upgrade to VIP or Premium for filtering options.',
      );
      return;
    }

    // Feature is available, proceed with command
    if (hasCustomFiltering) {
      await ctx.reply('Configure your custom filtering preferences:');
      // Show custom filtering UI
    } else {
      await ctx.reply('Your tier-based filtering is active.');
      // Show tier-based filtering info
    }
  }
}
```

#### 4.3 Create Subscription with Features

**Note**: Features are configured directly in the database, not through the bot.

When creating new subscriptions, features should be added via:

**Option 1: Direct SQL in Migration**
```sql
-- Create subscription and add features in same transaction
BEGIN;

INSERT INTO subscriptions (name, type, is_active)
VALUES ('VIP Signals', 'signals', true)
RETURNING id; -- Let's say id = 5

INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES
  (5, 'tier_based_filtering', true, '{}');

COMMIT;
```

**Option 2: Database Script**
```typescript
// scripts/create-subscription-with-features.ts
import { db } from '../libs/db/src/db';
import { subscriptions, subscriptionFeatures } from '../libs/db/src/schema';

async function createSubscription(
  name: string,
  type: string,
  features: Array<{key: string, config?: object}>,
) {
  // Create subscription
  const [subscription] = await db
    .insert(subscriptions)
    .values({ name, type, isActive: true })
    .returning();

  // Add features
  if (features.length > 0) {
    await db.insert(subscriptionFeatures).values(
      features.map(f => ({
        subscriptionId: subscription.id,
        featureKey: f.key,
        isEnabled: true,
        config: f.config || {},
      }))
    );
  }

  console.log(`Created subscription ${subscription.id} with ${features.length} features`);
  return subscription.id;
}

// Example usage
createSubscription('VIP Signals', 'signals', [
  { key: 'tier_based_filtering' }
]).catch(console.error);
```

**Option 3: Admin Panel**
Use an external admin panel or database management tool to:
1. Create subscription record
2. Add feature records in `subscription_features` table
3. Link to users via `user_subscriptions` table

### Testing Phase 4

#### 4.3.1 Verify Migration

```sql
-- Check that features were assigned
SELECT s.name, s.type, COUNT(sf.id) as feature_count
FROM subscriptions s
LEFT JOIN subscription_features sf ON s.id = sf.subscription_id
GROUP BY s.id, s.name, s.type
ORDER BY s.id;

-- Check user features
SELECT u.telegram_id, u.username, sf.feature_key
FROM users u
JOIN user_subscriptions us ON u.telegram_id = us.user_id
JOIN subscription_features sf ON us.subscription_id = sf.subscription_id
WHERE u.telegram_id = <test_user_id>
  AND us.is_active = true
  AND sf.is_enabled = true;
```

#### 4.3.2 End-to-End Testing

1. Create test user with Basic subscription
2. Verify user can access basic signals only (core functionality)
3. Create test user with VIP subscription
4. Verify user can access basic signals with tier-based filtering and custom filtering
5. Test upgrade flow from Basic → VIP

## Rollout Strategy

### Stage 1: Internal Testing (2-3 days)
- Deploy to staging environment
- Test with internal accounts
- Verify all feature checks work correctly
- Monitor performance and logs

### Stage 2: Pilot Users (2-3 days)
- Enable for small group of real users
- Monitor for issues
- Collect feedback
- Iterate on UI/UX

### Stage 3: Full Production (1-2 days)
- Enable for all users
- Monitor metrics (performance, errors)
- Update documentation

## Monitoring

### Metrics to Track

1. **Performance Metrics**
   - Feature check latency
   - Database query times
   - Cache hit rates (if caching implemented)

2. **Business Metrics**
   - Features per subscription type
   - Feature usage statistics
   - Upgrade conversions

3. **Error Metrics**
   - Failed feature checks
   - Invalid feature keys
   - Permission denials

### Logging

```typescript
// Add structured logging
this.logger.log({
  event: 'feature_check',
  userId: user.telegramId,
  feature: featureKey,
  hasAccess: result,
  subscriptions: user.activeSubscriptions.map(s => s.subscriptionId),
});
```

## Rollback Plan

If issues occur:

1. **Database Rollback**
   ```sql
   -- Drop feature tables
   DROP TABLE subscription_features;
   ```

2. **Code Rollback**
   - Revert to previous deployment
   - Feature checks will fail open (allow access)

3. **Data Backup**
   ```bash
   # Backup before migration
   pg_dump -t subscription_features > backup_features.sql
   ```

## Post-Launch Checklist

- [ ] All existing subscriptions have features assigned
- [ ] Feature checks integrated in relevant commands
- [ ] Performance metrics within acceptable range (< 50ms)
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] Rollback plan tested

## Next Steps

After successful rollout:

1. **Monitor usage** - Track which features are most used
2. **Gather feedback** - Understand user needs
3. **Consider expansion** - Add new features if business requires
4. **Optimize performance** - Add caching if needed
5. **Document learnings** - Update documentation based on experience

## Related Documentation

- [Feature Flags Architecture](./README.md)
- [Quick Reference Guide](./QUICK_REFERENCE.md)
- [Usage Examples](./examples.md)
- [Feature Catalog](./FEATURE_CATALOG.md)
- [Database Schema](./database-schema.md)
