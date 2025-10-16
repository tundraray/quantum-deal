# Feature Flags Quick Reference

> **Note**: Signal delivery is core functionality, not a feature flag. This system manages only **2 features**: TIER_BASED_FILTERING and CUSTOM_USER_FILTERING.

## For Developers

### Check if User Has Feature

```typescript
import { hasFeature } from '@quantumdeal/bot/interfaces/user.dto';
import { FeatureFlag } from '@quantumdeal/db/schema';

if (hasFeature(ctx.user, FeatureFlag.TIER_BASED_FILTERING)) {
  // User has access
}
```

### Protect Command Handler

```typescript
@Command('filter')
@RequireFeature(FeatureFlag.TIER_BASED_FILTERING)
async filterEvents(@Ctx() ctx: UserContext) {
  // Only users with TIER_BASED_FILTERING can access
}
```

### Get Feature Configuration

```typescript
import { getFeatureConfig } from '@quantumdeal/bot/interfaces/user.dto';

const config = getFeatureConfig(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING);
const maxFilters = config?.maxFilters || 5;
```

### Load User with Features (Middleware)

Already implemented in `UserManagementMiddleware` - features are automatically loaded with user context.

```typescript
// ctx.user now includes:
interface UserWithSubscriptions {
  enabledFeatures: Set<FeatureFlag>;
  featureConfigs: Map<FeatureFlag, FeatureConfig>;
  // ... other fields
}
```

## Available Features (2 Filtering Features)

> Signal delivery is core functionality available to all active subscribers.

### TIER_BASED_FILTERING
- **Key**: `tier_based_filtering`
- **Description**: System-controlled filtering by subscription sectors
- **Tier**: All tiers (Basic + VIP)
- **Use Case**: Automatic filtering of signals based on subscription sector configuration

### CUSTOM_USER_FILTERING
- **Key**: `custom_user_filtering`
- **Description**: User-configurable instrument selection
- **Tier**: VIP tier only
- **Use Case**: Allow users to select specific instruments to receive signals for

## Quick Reference by Feature

### Signal Delivery (Core Functionality)

```typescript
// Signal delivery is automatic for all active subscribers
if (ctx.user.isActive) {
  await sendSignal(ctx.user, signal);
}
```

### TIER_BASED_FILTERING

```typescript
// Check if user has tier-based filtering
if (hasFeature(ctx.user, FeatureFlag.TIER_BASED_FILTERING)) {
  const tierLevel = getTierLevel(ctx.user);
  const filteredSignals = filterByTier(signals, tierLevel);
  await sendFilteredSignals(ctx.user, filteredSignals);
}
```

### CUSTOM_USER_FILTERING

```typescript
// Check if user has custom filtering
if (hasFeature(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING)) {
  const config = getFeatureConfig(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING);
  const userFilters = config?.filters || [];
  const filteredSignals = applyCustomFilters(signals, userFilters);
  await sendFilteredSignals(ctx.user, filteredSignals);
}
```

## Feature Templates

**Note**: Signal delivery is core functionality, not a feature flag. Templates define filtering features only.

### Template Definitions

| Template | Features | SQL to Apply |
|----------|----------|--------------|
| **SIGNALS_BASIC** | tier_based_filtering | See SQL below |
| **SIGNALS_VIP** | tier_based_filtering, custom_user_filtering | See SQL below |

### Apply Templates via SQL

```sql
-- Apply SIGNALS_BASIC template (tier-based filtering only)
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES (1, 'tier_based_filtering', true, '{"sectors": ["crypto"]}')
ON CONFLICT (subscription_id, feature_key)
DO UPDATE SET is_enabled = true, updated_at = NOW();

-- Apply SIGNALS_VIP template (both features)
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES
  (1, 'tier_based_filtering', true, '{"sectors": ["crypto", "forex", "stocks"]}'),
  (1, 'custom_user_filtering', true, '{}')
ON CONFLICT (subscription_id, feature_key)
DO UPDATE SET is_enabled = true, updated_at = NOW();
```

## Database Queries

### Get User Features

```sql
SELECT DISTINCT sf.feature_key, sf.config
FROM subscription_features sf
INNER JOIN user_subscriptions us ON sf.subscription_id = us.subscription_id
INNER JOIN subscriptions s ON us.subscription_id = s.id
WHERE us.user_id = ?
  AND us.is_active = true
  AND s.is_active = true
  AND sf.is_enabled = true;
```

### Get Subscription Features

```sql
SELECT feature_key, config, is_enabled
FROM subscription_features
WHERE subscription_id = ?
ORDER BY feature_key;
```

### Count Users per Feature

```sql
SELECT
  sf.feature_key,
  COUNT(DISTINCT us.user_id) as user_count
FROM subscription_features sf
INNER JOIN user_subscriptions us ON sf.subscription_id = us.subscription_id
WHERE sf.is_enabled = true
  AND us.is_active = true
GROUP BY sf.feature_key
ORDER BY user_count DESC;
```

## Architecture Overview

```
User Request
    ↓
UserManagementMiddleware (loads features)
    ↓
UserContext (with enabledFeatures)
    ↓
Command Handler (checks features)
    ↓
Business Logic
```

## Implementation Checklist

### Phase 1: Database (1-2 days)
- [ ] Create `subscription_features` table
- [ ] Run migration
- [ ] Create repository
- [ ] Write repository tests

### Phase 2: Service Layer (1-2 days)
- [ ] Create `FeatureFlagService`
- [ ] Update `UserWithSubscriptions` DTO
- [ ] Update middleware to load features
- [ ] Write service tests

### Phase 3: Access Control (1-2 days)
- [ ] Create `@RequireFeature` decorator
- [ ] Create `FeatureGuard`
- [ ] Create `FeatureSceneGuard`
- [ ] Write guard tests

### Phase 4: Integration (2-3 days)
- [ ] Seed existing subscriptions
- [ ] Add feature checks to commands
- [ ] Update subscription creation flow
- [ ] End-to-end testing

## Common Patterns

### Conditional UI

```typescript
const buttons = [];

// All active users get signals (core functionality)
if (user.isActive) {
  buttons.push([Markup.button.callback('📊 Signals', 'signals')]);
}

if (hasFeature(user, FeatureFlag.TIER_BASED_FILTERING)) {
  buttons.push([Markup.button.callback('🔍 Tier Filter', 'tier_filter')]);
}

if (hasFeature(user, FeatureFlag.CUSTOM_USER_FILTERING)) {
  buttons.push([Markup.button.callback('⚙️ Custom Filter', 'custom_filter')]);
}
```

### Feature-Based Message Delivery

```typescript
async sendSignal(user: UserWithSubscriptions, signal: Signal) {
  // Check if user has active subscription (core functionality)
  if (!user.isActive) {
    return; // User doesn't have active subscription
  }

  // Apply tier-based filtering if enabled
  if (hasFeature(user, FeatureFlag.TIER_BASED_FILTERING)) {
    const tierLevel = getTierLevel(user);
    if (!shouldSendToTier(signal, tierLevel)) {
      return; // Filtered out by tier
    }
  }

  // Apply custom filters if enabled
  if (hasFeature(user, FeatureFlag.CUSTOM_USER_FILTERING)) {
    const config = getFeatureConfig(user, FeatureFlag.CUSTOM_USER_FILTERING);
    const userFilters = config?.filters || [];
    if (!passesCustomFilters(signal, userFilters)) {
      return; // Filtered out by custom rules
    }
  }

  // Send the signal
  await this.bot.telegram.sendMessage(user.telegramId, formatSignal(signal));
}
```

### Progressive Feature Disclosure

```typescript
@Command('settings')
async showSettings(@Ctx() ctx: UserContext) {
  const message = ['⚙️ Your Settings:\n'];

  // Core functionality (available to all active subscribers)
  if (ctx.user.isActive) {
    message.push('✅ Trading Signals: Enabled (Core)');
  }

  // Tier-based filtering (all tiers)
  if (hasFeature(ctx.user, FeatureFlag.TIER_BASED_FILTERING)) {
    const config = getFeatureConfig(ctx.user, FeatureFlag.TIER_BASED_FILTERING);
    const sectors = config?.sectors || [];
    message.push(`✅ Tier-Based Filtering: Active`);
    message.push(`   Sectors: ${sectors.join(', ')}`);
  }

  // Custom filtering (VIP only)
  if (hasFeature(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING)) {
    const config = getFeatureConfig(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING);
    const symbols = config?.symbols || [];
    message.push(`✅ Custom Instrument Selection: ${symbols.length} instruments`);
  } else {
    message.push('🔒 Custom Filtering: Upgrade to VIP');
  }

  await ctx.reply(message.join('\n'));
}
```

## Testing

### Mock User with Features

```typescript
const mockBasicUser: UserWithSubscriptions = {
  telegramId: 123,
  username: 'basic_user',
  firstName: 'Basic',
  lastName: 'User',
  lang: 'en',
  isPremium: false,
  isActive: true, // Active subscription for core signal delivery
  createdAt: new Date(),
  activeSubscriptions: [],
  enabledFeatures: new Set([
    FeatureFlag.TIER_BASED_FILTERING, // Basic has tier-based filtering
  ]),
  featureConfigs: new Map([
    [FeatureFlag.TIER_BASED_FILTERING, { sectors: ['crypto'] }],
  ]),
};

const mockVIPUser: UserWithSubscriptions = {
  telegramId: 456,
  username: 'vip_user',
  firstName: 'VIP',
  lastName: 'User',
  lang: 'en',
  isPremium: false,
  isActive: true,
  createdAt: new Date(),
  activeSubscriptions: [],
  enabledFeatures: new Set([
    FeatureFlag.TIER_BASED_FILTERING,
    FeatureFlag.CUSTOM_USER_FILTERING,
  ]),
  featureConfigs: new Map([
    [FeatureFlag.TIER_BASED_FILTERING, { sectors: ['crypto', 'forex', 'stocks'] }],
    [FeatureFlag.CUSTOM_USER_FILTERING, { symbols: [] }],
  ]),
};

const mockVIPUserWithCustomFilters: UserWithSubscriptions = {
  telegramId: 789,
  username: 'vip_user_custom',
  firstName: 'VIP',
  lastName: 'User',
  lang: 'en',
  isPremium: false,
  isActive: true,
  createdAt: new Date(),
  activeSubscriptions: [],
  enabledFeatures: new Set([
    FeatureFlag.TIER_BASED_FILTERING,
    FeatureFlag.CUSTOM_USER_FILTERING,
  ]),
  featureConfigs: new Map([
    [FeatureFlag.TIER_BASED_FILTERING, { sectors: ['crypto', 'forex'] }],
    [FeatureFlag.CUSTOM_USER_FILTERING, { symbols: ['BTCUSD.a', 'EURUSD.a'] }],
  ]),
};
```

### Test Feature Check

```typescript
it('should allow basic users to access tier-based filtering', () => {
  expect(mockBasicUser.isActive).toBe(true); // Core signal delivery
  expect(hasFeature(mockBasicUser, FeatureFlag.TIER_BASED_FILTERING)).toBe(true); // Basic has this
  expect(hasFeature(mockBasicUser, FeatureFlag.CUSTOM_USER_FILTERING)).toBe(false); // But not this
});

it('should allow VIP users to access both features', () => {
  expect(mockVIPUser.isActive).toBe(true); // Core signal delivery
  expect(hasFeature(mockVIPUser, FeatureFlag.TIER_BASED_FILTERING)).toBe(true);
  expect(hasFeature(mockVIPUser, FeatureFlag.CUSTOM_USER_FILTERING)).toBe(true);
});

it('should allow VIP users to have custom filter settings', () => {
  expect(mockVIPUserWithCustomFilters.isActive).toBe(true); // Core signal delivery
  expect(hasFeature(mockVIPUserWithCustomFilters, FeatureFlag.TIER_BASED_FILTERING)).toBe(true);
  expect(hasFeature(mockVIPUserWithCustomFilters, FeatureFlag.CUSTOM_USER_FILTERING)).toBe(true);

  const config = getFeatureConfig(mockVIPUserWithCustomFilters, FeatureFlag.CUSTOM_USER_FILTERING);
  expect(config?.symbols).toEqual(['BTCUSD.a', 'EURUSD.a']);
});
```

## Troubleshooting

### Quick Reference Index

| Problem | Document/Section | Quick Solution |
|---------|------------------|----------------|
| User can't access feature | [database-schema.md](./database-schema.md) | Verify `subscription_features` and `user_subscriptions` are active |
| Feature not loading | [README.md#caching](./README.md) | Clear cache, check middleware attachment |
| Filter settings not saving | [database-schema.md](./database-schema.md) | Check `user_subscription_features.settings` JSONB field |
| Performance issues | [QUICK_REFERENCE.md#performance-issues](#performance-issues) | Verify indexes, check query execution time |
| Wrong tier access | [FEATURE_CATALOG.md](./FEATURE_CATALOG.md) | Review subscription tier matrix (Basic vs VIP) |
| Database migration failed | [implementation-plan.md#phase-1](./implementation-plan.md) | Check migration logs, rollback and retry |
| Feature check returns false | Below: [User Can't Access Feature](#user-cant-access-feature) | Follow 4-step debugging checklist |
| UI buttons not showing | [examples.md#conditional-ui](./examples.md) | Verify `hasFeature()` checks in button rendering |
| Webhook filtering not working | [examples.md](./examples.md) | Review feature-aware broadcasting flow |

### User Can't Access Feature

1. Check user has active subscription
   ```sql
   SELECT * FROM user_subscriptions
   WHERE user_id = ? AND is_active = true;
   ```

2. Check subscription has feature
   ```sql
   SELECT * FROM subscription_features
   WHERE subscription_id = ? AND feature_key = ?;
   ```

3. Check feature is enabled
   ```sql
   SELECT is_enabled FROM subscription_features
   WHERE subscription_id = ? AND feature_key = ?;
   ```

4. Check subscription is active
   ```sql
   SELECT is_active FROM subscriptions WHERE id = ?;
   ```

### Feature Not Loading

1. Clear user session/cache
2. Check middleware is attached
3. Verify database indexes exist
4. Check for query errors in logs

### Performance Issues

1. Check query execution time
   ```sql
   EXPLAIN ANALYZE SELECT ...;
   ```

2. Verify indexes exist
   ```sql
   \d subscription_features
   ```

3. Check cache hit rate (if using Redis)

4. Monitor database connection pool

## Best Practices

1. **Use enums** for feature keys (never strings)
2. **Check user exists** before checking features
3. **Provide upgrade paths** when denying access
4. **Cache in loops** - don't check features repeatedly
5. **Log access** for analytics
6. **Test all scenarios** (basic, VIP, expired)
7. **Document configs** with TypeScript interfaces
8. **Validate configs** before saving
9. **Use transactions** when modifying multiple features
10. **Monitor performance** with metrics

## Subscription Tiers

| Tier | Features | Use Case |
|------|----------|----------|
| **Basic** | TIER_BASED_FILTERING | Entry-level users, signals filtered by subscription sectors |
| **VIP** | TIER_BASED_FILTERING<br/>CUSTOM_USER_FILTERING | Power users, tier filtering + custom instrument selection |

## Feature Management (Database Level)

**Note**: Features are managed directly in the database, not through bot API methods.

### Enable a Feature (SQL)

```sql
-- Basic → VIP: Enable custom user filtering
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES (1, 'custom_user_filtering', true, '{}')
ON CONFLICT (subscription_id, feature_key)
DO UPDATE SET is_enabled = true, updated_at = NOW();
```

### Disable a Feature (SQL)

```sql
-- Disable a feature for a subscription
UPDATE subscription_features
SET is_enabled = false, updated_at = NOW()
WHERE subscription_id = 1 AND feature_key = 'tier_based_filtering';
```

### Apply Feature Template (SQL)

```sql
-- Basic → VIP: Add custom user filtering (tier-based already exists)
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES (1, 'custom_user_filtering', true, '{}')
ON CONFLICT (subscription_id, feature_key)
DO UPDATE SET is_enabled = true, config = EXCLUDED.config, updated_at = NOW();
```

## Resources

- [Full Architecture Documentation](./README.md)
- [Step-by-Step Implementation](./implementation-plan.md)
- [Code Examples](./examples.md)
- [Feature Catalog](./FEATURE_CATALOG.md)

## Support

For questions:
1. Check the [examples documentation](./examples.md)
2. Review the [implementation plan](./implementation-plan.md)
3. Check logs for errors
4. Contact development team
