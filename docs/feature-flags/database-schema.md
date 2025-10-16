# Feature Flags Database Schema

## Important: Database-Level Management

**Features are managed directly in the database**, not through bot API methods:
- Use direct SQL queries for enabling/disabling features
- Use admin panel or database management tools
- Use database migrations for bulk feature rollouts
- The bot only **reads** features for access control

This design ensures:
- Clear separation of concerns (bot = read, admin = write)
- Audit trail at database level
- Simpler bot architecture (no management APIs)
- Easier bulk operations and migrations

## Recommended Approach: Dedicated Table

After evaluating both options (dedicated table vs JSONB column), **the dedicated table approach is recommended** for the following reasons:

1. **Better Queries**: Can index on feature keys for fast lookups
2. **Referential Integrity**: Can validate feature keys exist
3. **Flexible Configuration**: Each feature can have its own config without nesting complexity
4. **Easier Analytics**: Query which subscriptions have specific features
5. **Future Extensibility**: Can add feature metadata, versioning, expiration dates
6. **Direct Management**: Easy to manage features via SQL queries

## Schema Design

### Overview

The feature flags system uses two tables:

1. **subscription_features** - Defines which features are available for each subscription (subscription-level)
2. **user_subscription_features** - Stores user-specific configuration for enabled features (user-level)

**Data Flow**:
```
User has subscription → subscription_features (feature enabled)
                        ↓
User configures feature → user_subscription_features (user's settings for that feature)
                        ↓
Bot checks feature → Read subscription_features (is enabled?)
                   + Read user_subscription_features (user's config)
```

### Field Deprecation Notice

> **⚠️ DEPRECATED**: The `subscriptions.scope` field is deprecated and will be removed in a future version.

**Migration Details:**
- **Old location**: `subscriptions.scope` (JSONB array of sectors like `["crypto", "forex"]`)
- **New location**: `subscription_features.config.sectors` (JSONB array in TIER_BASED_FILTERING feature)
- **Migration**: Automated via `libs/db/migrations/20251016161701_hot_johnny_storm.sql`

**Example migration:**

```sql
-- Before (deprecated approach)
SELECT scope FROM subscriptions WHERE id = 1;
-- Result: ["crypto", "forex", "stocks"]

-- After (current approach)
SELECT config FROM subscription_features
WHERE subscription_id = 1 AND feature_key = 'tier_based_filtering';
-- Result: {"sectors": ["crypto", "forex", "stocks"]}
```

**Why the change:**
- Better separation of concerns (features are independent of subscriptions)
- More flexible feature configuration
- Supports feature-specific settings
- Aligns with feature flags architecture
- Enables feature-level permissions

**Backward compatibility:**
- The `scope` field remains in the schema (marked `@deprecated` in TypeScript)
- `SubscriptionsRepository.findBySector()` now queries `subscription_features.config.sectors`
- Both old and new approaches coexist during transition period
- The field will be removed in a future major version (v2.0+)

### subscription_features Table

This table defines which features are **available** (enabled/disabled) for each subscription tier.

```sql
CREATE TABLE subscription_features (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure unique feature per subscription
  CONSTRAINT uq_subscription_feature UNIQUE (subscription_id, feature_key),

  -- Optional: Validate feature key format
  CONSTRAINT ck_feature_key_format CHECK (feature_key ~ '^[a-z][a-z0-9_]*$')
);

-- Index for fast feature lookups
CREATE INDEX idx_subscription_features_subscription_id
  ON subscription_features(subscription_id);

CREATE INDEX idx_subscription_features_feature_key
  ON subscription_features(feature_key);

-- Index for active features query
CREATE INDEX idx_subscription_features_enabled
  ON subscription_features(subscription_id, feature_key)
  WHERE is_enabled = true;

-- Index for user feature aggregation (most common query)
CREATE INDEX idx_subscription_features_user_lookup
  ON subscription_features(subscription_id, feature_key, is_enabled);
```

### user_subscription_features Table

This table stores user-specific **configuration** (settings) for features they have access to.

```sql
CREATE TABLE user_subscription_features (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

  -- Ensure unique feature settings per user
  CONSTRAINT unique_user_feature UNIQUE(user_id, feature_key)
);

-- Index for fast user settings lookups
CREATE INDEX idx_user_subscription_features_user_id
  ON user_subscription_features(user_id);

-- Index for feature key lookups
CREATE INDEX idx_user_subscription_features_feature_key
  ON user_subscription_features(feature_key);

-- Index for active settings queries
CREATE INDEX idx_user_subscription_features_active
  ON user_subscription_features(user_id, is_active);

-- GIN index for JSONB settings queries
CREATE INDEX idx_user_subscription_features_jsonb
  ON user_subscription_features USING GIN(settings);
```

### TypeScript Schema (Drizzle ORM)

#### subscription_features Schema

```typescript
// libs/db/src/schema/subscription-features.ts
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
 * Centralized definition of all available feature flags.
 *
 * Note: Signal delivery is core functionality, not a feature flag.
 * These features control only filtering behavior applied to signals.
 */
export enum FeatureFlag {
  // Filtering Features (2 features only)
  TIER_BASED_FILTERING = 'tier_based_filtering',
  CUSTOM_USER_FILTERING = 'custom_user_filtering',
}

/**
 * Feature Configuration Type
 *
 * Generic configuration object that can hold feature-specific settings.
 * Examples:
 * - Rate limits: { maxRequestsPerDay: 1000, maxConcurrent: 10 }
 * - Export: { formats: ['csv', 'json'], maxExportsPerDay: 50 }
 * - API: { endpoints: ['signals', 'analytics'], rateLimit: 100 }
 */
export type FeatureConfig = Record<string, unknown>;

/**
 * Subscription Features Table
 *
 * Maps features to subscriptions with optional configuration.
 * This enables fine-grained control over what features are available
 * to users based on their subscription level.
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
     * Examples:
     * - { maxRequestsPerDay: 1000 }
     * - { formats: ['csv', 'json', 'xlsx'], retentionDays: 30 }
     * - { endpoints: ['signals', 'analytics'] }
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

#### user_subscription_features Schema

```typescript
// libs/db/src/schema/user-subscription-features.ts
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
 * User Subscription Features Type
 *
 * Stores user-specific configuration for enabled features.
 * Each feature can have its own settings structure.
 */
export type UserSubscriptionFeatures = Record<string, unknown>;

/**
 * User Subscription Features Table
 *
 * Stores user-level configuration for features they have access to.
 * This allows users to customize how enabled features behave.
 *
 * Examples:
 * - TIER_BASED_FILTERING: { minWinRate: 70, categories: ['crypto', 'forex'] }
 * - CUSTOM_USER_FILTERING: { filterMode: 'whitelist', quietHours: { start: '22:00', end: '06:00' } }
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
    settings: jsonb('settings').$type<UserSubscriptionFeatures>().notNull().default({}),

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

### Table Relationships

```
users
  │
  ├─→ user_subscriptions
  │     │
  │     └─→ subscriptions
  │           │
  │           └─→ subscription_features (what features are available)
  │
  └─→ user_subscription_features (user's personal settings for enabled features)
          │
          └─→ For CUSTOM_USER_FILTERING: stores instrument IDs in settings.instruments
```

**Data Flow**:
1. User has an active subscription via `user_subscriptions`
2. Subscription has enabled features via `subscription_features` (is feature available?)
   - For TIER_BASED_FILTERING: `config.sectors` stores sector filtering (replaces deprecated `subscription.scope`)
3. User configures personal settings via `user_subscription_features` (how does user want to use it?)
4. Bot reads both tables to determine: (1) Does user have access? (2) What are user's preferences?

### Example Data

#### Example 1: User with VIP Subscription

**User 123 with VIP subscription:**

**subscription_features** (what's available):
```sql
subscription_id | feature_key             | is_enabled | config
----------------|-------------------------|------------|-------
2               | tier_based_filtering    | true       | {}
2               | custom_user_filtering   | true       | {}
```

**user_subscription_features** (user's personal configuration):
```sql
user_id | feature_key             | settings                                  | is_active
--------|-------------------------|-------------------------------------------|----------
123     | tier_based_filtering    | {"minWinRate": 70, "categories": ["crypto", "forex"], "excludeWeekends": true} | true
123     | custom_user_filtering   | {"instruments": [15, 21, 28, 37, 38]} | true
```

**Interpretation**:
- User 123 has VIP subscription (id=2)
- VIP subscription has both filtering features enabled
- User 123 configured tier filtering: min 70% win rate, crypto/forex only, no weekends
- User 123 configured custom filtering: 5 instruments selected (EURUSD, GBPUSD, USDJPY, BTCUSD, ETHUSD)

#### Example 2: User with Basic Subscription

**User 456 with Basic subscription:**

**subscription_features** (what's available):
```sql
subscription_id | feature_key             | is_enabled | config
----------------|-------------------------|------------|-------
1               | (no entries)            |            |
```

**user_subscription_features** (user's personal configuration):
```sql
user_id | feature_key             | settings                                  | is_active
--------|-------------------------|-------------------------------------------|----------
456     | (no entries)            |                                           |
```

**Interpretation**:
- User 456 has Basic subscription (id=1)
- Basic subscription has NO feature flags (signal delivery is core functionality)
- User 456 has no settings because no features are available
- User 456 receives all signals (default behavior, no filtering)

## Alternative Approach: JSONB Column

If you prefer simplicity over flexibility, you can add a JSONB column to the subscriptions table:

```sql
-- Add to existing subscriptions table
ALTER TABLE subscriptions
ADD COLUMN features JSONB DEFAULT '{}';

-- Example data structure:
{
  "basic_signals": { "enabled": true },
  "event_filtering": { "enabled": true },
  "export_data": {
    "enabled": true,
    "config": {
      "maxExportsPerDay": 50,
      "formats": ["csv", "json"]
    }
  }
}

-- Index for JSONB queries
CREATE INDEX idx_subscriptions_features
  ON subscriptions USING GIN (features);
```

**Pros:**
- Simpler schema (no new table)
- Faster writes (no JOIN needed)
- All data in one place

**Cons:**
- Harder to query specific features across subscriptions
- No referential integrity for feature keys
- Complex JSONB queries for feature lookups
- Harder to analyze feature usage
- Less type-safe

## Migration Scripts

### Create Table Migration

```typescript
// libs/db/src/migrations/YYYYMMDD_create_subscription_features.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('subscription_features')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('subscription_id', 'bigint', (col) =>
      col.notNull().references('subscriptions.id').onDelete('cascade')
    )
    .addColumn('feature_key', 'varchar(100)', (col) => col.notNull())
    .addColumn('is_enabled', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('config', 'jsonb', (col) => col.defaultTo('{}'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // Add unique constraint
  await db.schema
    .createIndex('uq_subscription_feature')
    .on('subscription_features')
    .columns(['subscription_id', 'feature_key'])
    .unique()
    .execute();

  // Add indexes for performance
  await db.schema
    .createIndex('idx_subscription_features_subscription_id')
    .on('subscription_features')
    .column('subscription_id')
    .execute();

  await db.schema
    .createIndex('idx_subscription_features_feature_key')
    .on('subscription_features')
    .column('feature_key')
    .execute();

  await db.schema
    .createIndex('idx_subscription_features_enabled')
    .on('subscription_features')
    .columns(['subscription_id', 'feature_key'])
    .where('is_enabled', '=', true)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('subscription_features').execute();
}
```

### Drizzle Migration

```bash
# Generate migration
npx drizzle-kit generate:pg

# Apply migration
npx drizzle-kit push:pg
```

### Seed Existing Subscriptions

```typescript
// libs/db/src/seeds/seed-feature-flags.ts
import { db } from '../db';
import { subscriptions, subscriptionFeatures } from '../schema';
import { FeatureFlag } from '../schema/subscription-features';
import { eq } from 'drizzle-orm';

/**
 * Seed feature flags for existing subscriptions
 *
 * Assigns appropriate features based on subscription type and name.
 *
 * Note: Signal delivery is core functionality, not a feature flag.
 * Only filtering features are seeded based on tier.
 */
export async function seedFeatureFlags() {
  // Get all active subscriptions
  const allSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.isActive, true));

  for (const subscription of allSubscriptions) {
    let features: FeatureFlag[] = [];

    // Determine features based on subscription type and name
    // Note: Signal delivery is core - Basic tier has no feature flags
    if (subscription.type === 'signals') {
      const name = subscription.name.toLowerCase();

      if (name.includes('vip')) {
        // VIP Signals: Both filtering features
        features = [
          FeatureFlag.TIER_BASED_FILTERING,
          FeatureFlag.CUSTOM_USER_FILTERING,
        ];
      } else {
        // Basic Signals: No feature flags (receives all signals)
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
        .onConflictDoNothing(); // Skip if already exists
    }

    console.log(
      `Seeded ${features.length} features for subscription ${subscription.id} (${subscription.name})`
    );
  }
}
```

## Feature Management Operations

**Note**: These operations are performed directly in the database, not through the bot.

### Enable a Feature for a Subscription

```sql
-- Enable tier_based_filtering for subscription 1
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES (1, 'tier_based_filtering', true, '{}')
ON CONFLICT (subscription_id, feature_key)
DO UPDATE SET is_enabled = true, updated_at = NOW();

-- Enable with custom configuration
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES (1, 'custom_user_filtering', true, '{"maxFilters": 10, "filters": []}')
ON CONFLICT (subscription_id, feature_key)
DO UPDATE SET is_enabled = true, config = EXCLUDED.config, updated_at = NOW();
```

### Disable a Feature for a Subscription

```sql
-- Disable feature (soft delete - keeps record for audit)
UPDATE subscription_features
SET is_enabled = false, updated_at = NOW()
WHERE subscription_id = 1 AND feature_key = 'tier_based_filtering';

-- Hard delete feature record (not recommended)
DELETE FROM subscription_features
WHERE subscription_id = 1 AND feature_key = 'tier_based_filtering';
```

### Apply Feature Template

```sql
-- Apply VIP template (both features)
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES
  (2, 'tier_based_filtering', true, '{}'),
  (2, 'custom_user_filtering', true, '{}')
ON CONFLICT (subscription_id, feature_key)
DO UPDATE SET is_enabled = true, updated_at = NOW();
```

### Bulk Feature Operations

```sql
-- Enable feature for multiple subscriptions
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
SELECT id, 'tier_based_filtering', true, '{}'
FROM subscriptions
WHERE type = 'signals' AND name ILIKE '%vip%'
ON CONFLICT (subscription_id, feature_key)
DO UPDATE SET is_enabled = true, updated_at = NOW();

-- Disable feature for all subscriptions
UPDATE subscription_features
SET is_enabled = false, updated_at = NOW()
WHERE feature_key = 'tier_based_filtering';
```

### Update Feature Configuration

```sql
-- Update configuration for existing feature
UPDATE subscription_features
SET config = '{"maxFilters": 20, "filters": []}', updated_at = NOW()
WHERE subscription_id = 1 AND feature_key = 'custom_user_filtering';

-- Merge new config with existing (PostgreSQL jsonb)
UPDATE subscription_features
SET config = config || '{"newOption": true}'::jsonb, updated_at = NOW()
WHERE subscription_id = 1 AND feature_key = 'custom_user_filtering';
```

### Feature Audit Queries

```sql
-- See all feature changes over time
SELECT subscription_id, feature_key, is_enabled, config, updated_at
FROM subscription_features
WHERE updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;

-- Check which subscriptions have a specific feature
SELECT s.id, s.name, s.type, sf.is_enabled, sf.config
FROM subscriptions s
LEFT JOIN subscription_features sf ON s.id = sf.subscription_id AND sf.feature_key = 'tier_based_filtering'
WHERE s.is_active = true
ORDER BY s.name;
```

## User Settings Management Operations

**Note**: Users configure these settings through the bot UI. These are example operations showing how settings are stored.

### Save User Settings for a Feature

```sql
-- User 123 configures tier-based filtering
INSERT INTO user_subscription_features (user_id, feature_key, settings, is_active)
VALUES (123, 'tier_based_filtering', '{"minWinRate": 70, "categories": ["crypto", "forex"], "excludeWeekends": true}', true)
ON CONFLICT (user_id, feature_key)
DO UPDATE SET
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- User 123 configures custom filtering
INSERT INTO user_subscription_features (user_id, feature_key, settings, is_active)
VALUES (123, 'custom_user_filtering', '{"filterMode": "whitelist", "quietHours": {"enabled": true, "start": "22:00", "end": "06:00", "timezone": "Europe/Moscow"}}', true)
ON CONFLICT (user_id, feature_key)
DO UPDATE SET
  settings = EXCLUDED.settings,
  updated_at = NOW();
```

### Update Specific Settings

```sql
-- Update only quiet hours (merge with existing settings)
UPDATE user_subscription_features
SET
  settings = settings || '{"quietHours": {"enabled": true, "start": "23:00", "end": "07:00"}}'::jsonb,
  updated_at = NOW()
WHERE user_id = 123 AND feature_key = 'custom_user_filtering';

-- Update only categories
UPDATE user_subscription_features
SET
  settings = jsonb_set(settings, '{categories}', '["crypto"]'::jsonb),
  updated_at = NOW()
WHERE user_id = 123 AND feature_key = 'tier_based_filtering';
```

### Deactivate User Settings

```sql
-- Temporarily disable settings (user can re-enable)
UPDATE user_subscription_features
SET is_active = false, updated_at = NOW()
WHERE user_id = 123 AND feature_key = 'tier_based_filtering';

-- Re-enable settings
UPDATE user_subscription_features
SET is_active = true, updated_at = NOW()
WHERE user_id = 123 AND feature_key = 'tier_based_filtering';
```

### Reset to Default Settings

```sql
-- Reset to defaults (empty settings object)
UPDATE user_subscription_features
SET settings = '{}', updated_at = NOW()
WHERE user_id = 123 AND feature_key = 'tier_based_filtering';

-- Or delete the record entirely
DELETE FROM user_subscription_features
WHERE user_id = 123 AND feature_key = 'tier_based_filtering';
```

### Get User Settings

```sql
-- Get all settings for a user
SELECT feature_key, settings, is_active, updated_at
FROM user_subscription_features
WHERE user_id = 123
  AND is_active = true
ORDER BY feature_key;

-- Get settings for a specific feature
SELECT settings
FROM user_subscription_features
WHERE user_id = 123
  AND feature_key = 'tier_based_filtering'
  AND is_active = true;

-- Get settings with feature availability check
SELECT
  ufs.feature_key,
  ufs.settings,
  ufs.is_active as settings_active,
  sf.is_enabled as feature_enabled
FROM user_subscription_features ufs
INNER JOIN user_subscriptions us ON ufs.user_id = us.user_id
INNER JOIN subscription_features sf ON
  us.subscription_id = sf.subscription_id
  AND ufs.feature_key = sf.feature_key
WHERE ufs.user_id = 123
  AND us.is_active = true
  AND sf.is_enabled = true
  AND ufs.is_active = true;
```

### Query Specific Setting Values

```sql
-- Get quiet hours for a user
SELECT settings->'quietHours' as quiet_hours
FROM user_subscription_features
WHERE user_id = 123
  AND feature_key = 'custom_user_filtering'
  AND settings ? 'quietHours';

-- Get users with specific setting value
SELECT user_id, settings->'minWinRate' as min_win_rate
FROM user_subscription_features
WHERE feature_key = 'tier_based_filtering'
  AND (settings->>'minWinRate')::int >= 70;

-- Get users who exclude weekends
SELECT user_id
FROM user_subscription_features
WHERE feature_key = 'tier_based_filtering'
  AND (settings->>'excludeWeekends')::boolean = true;
```

### Bulk Operations

```sql
-- Reset all users to default settings for a feature
UPDATE user_subscription_features
SET settings = '{}', updated_at = NOW()
WHERE feature_key = 'tier_based_filtering';

-- Deactivate settings for users without active subscriptions
UPDATE user_subscription_features ufs
SET is_active = false, updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM user_subscriptions us
  INNER JOIN subscription_features sf ON
    us.subscription_id = sf.subscription_id
    AND sf.feature_key = ufs.feature_key
  WHERE us.user_id = ufs.user_id
    AND us.is_active = true
    AND sf.is_enabled = true
);
```

## Common Read Queries (Used by Bot)

**Note**: The bot only performs READ operations on features.

### Get All Features for a User

```typescript
// Most common query - used in middleware to load user context
const userFeatures = await db
  .selectDistinct({
    featureKey: subscriptionFeatures.featureKey,
    config: subscriptionFeatures.config,
  })
  .from(subscriptionFeatures)
  .innerJoin(
    userSubscriptions,
    eq(subscriptionFeatures.subscriptionId, userSubscriptions.subscriptionId)
  )
  .innerJoin(
    subscriptions,
    eq(userSubscriptions.subscriptionId, subscriptions.id)
  )
  .where(
    and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.isActive, true),
      eq(subscriptions.isActive, true),
      eq(subscriptionFeatures.isEnabled, true)
    )
  );
```

### Check if User Has Specific Feature

```typescript
const hasFeature = await db
  .select({ exists: sql<boolean>`1` })
  .from(subscriptionFeatures)
  .innerJoin(
    userSubscriptions,
    eq(subscriptionFeatures.subscriptionId, userSubscriptions.subscriptionId)
  )
  .where(
    and(
      eq(userSubscriptions.userId, userId),
      eq(subscriptionFeatures.featureKey, featureKey),
      eq(subscriptionFeatures.isEnabled, true),
      eq(userSubscriptions.isActive, true)
    )
  )
  .limit(1);

return hasFeature.length > 0;
```

### Get All Features for a Subscription

```typescript
const features = await db
  .select()
  .from(subscriptionFeatures)
  .where(
    and(
      eq(subscriptionFeatures.subscriptionId, subscriptionId),
      eq(subscriptionFeatures.isEnabled, true)
    )
  );
```


### Get All Subscriptions with Specific Feature

```typescript
const subscriptionsWithFeature = await db
  .select({
    subscriptionId: subscriptions.id,
    subscriptionName: subscriptions.name,
    subscriptionType: subscriptions.type,
    featureConfig: subscriptionFeatures.config,
  })
  .from(subscriptions)
  .innerJoin(
    subscriptionFeatures,
    eq(subscriptions.id, subscriptionFeatures.subscriptionId)
  )
  .where(
    and(
      eq(subscriptionFeatures.featureKey, featureKey),
      eq(subscriptionFeatures.isEnabled, true),
      eq(subscriptions.isActive, true)
    )
  );
```

### Count Users per Feature

```typescript
// Analytics query: How many users have each feature?
const featureUsage = await db
  .select({
    featureKey: subscriptionFeatures.featureKey,
    userCount: sql<number>`COUNT(DISTINCT ${userSubscriptions.userId})`,
  })
  .from(subscriptionFeatures)
  .innerJoin(
    userSubscriptions,
    eq(subscriptionFeatures.subscriptionId, userSubscriptions.subscriptionId)
  )
  .where(
    and(
      eq(subscriptionFeatures.isEnabled, true),
      eq(userSubscriptions.isActive, true)
    )
  )
  .groupBy(subscriptionFeatures.featureKey);
```

### Get User's Custom Filter Settings (Webhook Processing)

**Use Case**: When processing webhooks/signals, check if user has CUSTOM_USER_FILTERING and apply their settings.

```typescript
// Step 1: Check if subscription has CUSTOM_USER_FILTERING feature
const hasCustomFiltering = await db
  .select({ exists: sql<boolean>`1` })
  .from(subscriptionFeatures)
  .where(
    and(
      eq(subscriptionFeatures.subscriptionId, subscriptionId),
      eq(subscriptionFeatures.featureKey, 'custom_user_filtering'),
      eq(subscriptionFeatures.isEnabled, true)
    )
  )
  .limit(1);

if (hasCustomFiltering.length === 0) {
  // No custom filtering - send signal to user
  return true;
}

// Step 2: Get user's custom filter settings
const userSettings = await db
  .select({
    settings: userSubscriptionFeatures.settings,
  })
  .from(userSubscriptionFeatures)
  .where(
    and(
      eq(userSubscriptionFeatures.userId, userId),
      eq(userSubscriptionFeatures.featureKey, 'custom_user_filtering'),
      eq(userSubscriptionFeatures.isActive, true)
    )
  )
  .limit(1);

if (userSettings.length === 0) {
  // User hasn't configured filters yet - send signal
  return true;
}

// Step 3: Apply user's custom filters
const { settings } = userSettings[0];

// Example settings structure:
// {
//   "instruments": [15, 21, 28],  // Only these instrument IDs
//   "quietHours": {
//     "enabled": true,
//     "start": "22:00",
//     "end": "06:00"
//   },
//   "minWinRate": 70
// }

// Check if signal matches user's filters
if (settings.instruments && !settings.instruments.includes(signal.instrumentId)) {
  return false; // Skip user - instrument not in their list
}

if (settings.quietHours?.enabled) {
  const now = new Date();
  const currentHour = now.getHours();
  // ... quiet hours logic
}

return true; // User passed all filters
```

**SQL Alternative** (for direct database queries):

```sql
-- Combined query: Check feature and get settings in one go
SELECT
  sf.subscription_id,
  sf.is_enabled as feature_enabled,
  usf.settings as user_settings,
  usf.is_active as settings_active
FROM user_subscriptions us
LEFT JOIN subscription_features sf ON
  us.subscription_id = sf.subscription_id
  AND sf.feature_key = 'custom_user_filtering'
LEFT JOIN user_subscription_features usf ON
  us.user_id = usf.user_id
  AND usf.feature_key = 'custom_user_filtering'
WHERE us.user_id = $1
  AND us.subscription_id = $2
  AND us.is_active = true;

-- Result interpretation:
-- - feature_enabled IS NULL: subscription doesn't have CUSTOM_USER_FILTERING
-- - feature_enabled = false: feature disabled
-- - user_settings IS NULL: user hasn't configured filters
-- - settings_active = false: user disabled their filters
```

## Query Analysis

```sql
-- Analyze the most common query (user features lookup)
EXPLAIN ANALYZE
SELECT DISTINCT sf.feature_key, sf.config
FROM subscription_features sf
INNER JOIN user_subscriptions us ON sf.subscription_id = us.subscription_id
INNER JOIN subscriptions s ON us.subscription_id = s.id
WHERE us.user_id = 12345
  AND us.is_active = true
  AND s.is_active = true
  AND sf.is_enabled = true;
```

## Data Integrity

### Triggers for Automatic Updates

```sql
-- Update updated_at on modification
CREATE OR REPLACE FUNCTION update_subscription_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscription_features_updated_at
BEFORE UPDATE ON subscription_features
FOR EACH ROW
EXECUTE FUNCTION update_subscription_features_updated_at();
```

### Audit Trail (Optional)

```sql
-- Track all feature changes
CREATE TABLE subscription_feature_audit (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'enabled', 'disabled', 'configured'
  old_config JSONB,
  new_config JSONB,
  changed_by BIGINT, -- manager telegram ID
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subscription_feature_audit_subscription_id
  ON subscription_feature_audit(subscription_id);

CREATE INDEX idx_subscription_feature_audit_changed_at
  ON subscription_feature_audit(changed_at DESC);
```

## Testing Data

### Test Subscriptions with Features

```sql
-- Insert test subscriptions with different feature sets
INSERT INTO subscriptions (name, type, is_active) VALUES
  ('Basic Signals Test', 'signals', true),
  ('VIP Signals Test', 'signals', true);

-- Assign features (2 filtering features only)
-- Note: Signal delivery is core functionality, not a feature flag
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config) VALUES
  -- Basic Signals: No features (receives all signals)
  -- (no entries for subscription 1)

  -- VIP Signals: Both filtering features
  (2, 'tier_based_filtering', true, '{}'),
  (2, 'custom_user_filtering', true, '{"maxFilters": 10, "filters": []}');

-- Create test user with VIP subscription
INSERT INTO user_subscriptions (user_id, subscription_id, activated_at, expires_at, is_active) VALUES
  (99999, 2, NOW(), NOW() + INTERVAL '30 days', true);  -- VIP Signals

-- Verify features
SELECT DISTINCT sf.feature_key, sf.config
FROM subscription_features sf
INNER JOIN user_subscriptions us ON sf.subscription_id = us.subscription_id
WHERE us.user_id = 99999
  AND us.is_active = true
  AND sf.is_enabled = true
ORDER BY sf.feature_key;
```

## Schema Validation

### Validate Feature Keys

```typescript
// libs/db/src/validators/feature-flag.validator.ts
import { FeatureFlag } from '../schema/subscription-features';

export function isValidFeatureFlag(key: string): key is FeatureFlag {
  return Object.values(FeatureFlag).includes(key as FeatureFlag);
}

export function validateFeatureFlag(key: string): void {
  if (!isValidFeatureFlag(key)) {
    throw new Error(
      `Invalid feature flag: ${key}. Must be one of: ${Object.values(FeatureFlag).join(', ')}`
    );
  }
}
```

### Validate Feature Configuration

```typescript
// libs/db/src/validators/feature-config.validator.ts
import { z } from 'zod';
import { FeatureFlag } from '../schema/subscription-features';

// Define schemas for the 2 filtering features
const TierBasedFilteringConfigSchema = z.object({
  allowedSymbols: z.array(z.string()).optional(),
  minPriority: z.enum(['low', 'medium', 'high']).optional(),
  excludedTypes: z.array(z.string()).optional(),
});

const CustomUserFilteringConfigSchema = z.object({
  maxFilters: z.number().min(1).max(20).default(10),
  filters: z.array(z.object({
    symbol: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    priority: z.string().optional(),
  })).default([]),
});

// Map features to their config schemas
const FEATURE_CONFIG_SCHEMAS: Partial<Record<FeatureFlag, z.ZodSchema>> = {
  [FeatureFlag.TIER_BASED_FILTERING]: TierBasedFilteringConfigSchema,
  [FeatureFlag.CUSTOM_USER_FILTERING]: CustomUserFilteringConfigSchema,
};

export function validateFeatureConfig(
  featureKey: FeatureFlag,
  config: unknown
): void {
  const schema = FEATURE_CONFIG_SCHEMAS[featureKey];

  if (!schema) {
    // No specific schema, accept any valid JSON
    return;
  }

  const result = schema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid configuration for feature ${featureKey}: ${result.error.message}`
    );
  }
}
```

## Best Practices

1. **Always use transactions** when modifying multiple features
2. **Index wisely** - focus on user lookup queries (most common)
3. **Validate feature keys** against enum before insertion
4. **Log feature changes** for audit trail
5. **Use soft deletes** (is_enabled = false) instead of hard deletes
6. **Cache user features** in application layer (Redis or in-memory)
7. **Refresh cache** on subscription activation/deactivation
8. **Monitor query** with pg_stat_statements
9. **Document feature configs** in code comments

## Related Documentation

- [Feature Flags Architecture](./README.md)
- [Implementation Plan](./implementation-plan.md)
- [Usage Examples](./examples.md)
