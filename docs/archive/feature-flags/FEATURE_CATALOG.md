# Feature Catalog

**Version**: 2.0
**Last Updated**: 2025-10-15
**Status**: Active

## Table of Contents

1. [Overview](#overview)
2. [Feature Categories](#feature-categories)
3. [Complete Feature List](#complete-feature-list)
4. [Subscription Tier Matrix](#subscription-tier-matrix)
5. [Feature Dependencies & Conflicts](#feature-dependencies--conflicts)
6. [Migration Paths](#migration-paths)
7. [Configuration Reference](#configuration-reference)

---

## Overview

This document provides a comprehensive catalog of all features available in the Quantum Deal Telegram bot. The system focuses on two core features that control signal filtering behavior:

1. **TIER_BASED_FILTERING** - System-controlled filtering by subscription tier
2. **CUSTOM_USER_FILTERING** - User-customizable filtering rules

**Note**: Signal delivery is core bot functionality and is always available to all users. Feature flags control only the filtering behavior applied to signals.

Each feature is documented with:

- **Description**: What the feature does
- **Business Value**: Why users need this feature
- **Implementation Notes**: Technical guidance for developers
- **Configuration Options**: Available settings
- **Recommended Tiers**: Which subscription levels should include this feature

### Audience

- **Product Team**: Understand available features for tier planning
- **Sales Team**: Know what to sell and explain to customers
- **Development Team**: Implementation guidance and technical specs
- **Support Team**: Feature capabilities and limitations

---

## Feature Categories

Features are organized into one logical category:

### A. Trading Signals & Filtering
Signal filtering capabilities that control which signals reach users

---

## Complete Feature List

### Category A: Trading Signals & Filtering

**Important Note**: Signal delivery is core bot functionality available to all users. These feature flags control only the filtering behavior applied to those signals.

---

#### TIER_BASED_FILTERING

**Category**: Trading Signals & Filtering
**Status**: Production
**Description**: System automatically filters signals based on subscription tier configuration
**Business Value**: Ensures users receive signals filtered by subscription sectors without manual configuration
**Recommended Tiers**: All tiers (Basic + VIP)

**Note**: This feature is available on ALL tiers. It filters signals based on subscription sectors configured in `subscription_features.config.sectors`.

##### Detailed Description

The `TIER_BASED_FILTERING` feature applies automatic, system-controlled filters to incoming signals based on the subscription's sector configuration. This ensures that:

1. **Basic users** - Receive signals filtered by subscription sectors (e.g., crypto, forex)
2. **VIP users** - Receive signals filtered by subscription sectors + can add custom user filtering on top

The filtering happens **automatically in the webhook processor** (via `findBySector()`) before signals reach users. Users cannot modify these tier-based rules - they are controlled at the subscription level.

##### Tier-Specific Filter Configuration

**Basic Tier:**
```typescript
// Basic subscription with crypto sector
{
  tier: 'basic',
  sectors: ['crypto']  // Only receive crypto signals
}
```

**VIP Tier:**
```typescript
// VIP subscription with multiple sectors
{
  tier: 'vip',
  sectors: ['crypto', 'forex', 'stocks']  // Multiple sectors
}
```

##### Configuration Options

Configured at subscription level in `subscription_features` table:

```typescript
interface TierBasedFilteringConfig {
  // Sectors (configured in subscription_features.config)
  sectors: string[];  // e.g., ['crypto', 'forex', 'stocks']
}
```

**Storage (subscription level):**
```sql
-- Example: VIP subscription with multiple sectors
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES (1, 'tier_based_filtering', true, '{"sectors": ["crypto", "forex", "stocks"]}');

-- Example: Basic subscription with crypto sector only
INSERT INTO subscription_features (subscription_id, feature_key, is_enabled, config)
VALUES (2, 'tier_based_filtering', true, '{"sectors": ["crypto"]}');
```

**Note**: TIER_BASED_FILTERING is NOT configurable by users. It's set at the subscription level. Users cannot change sectors - only admins can via subscription configuration.

##### Code Example

```typescript
import { FeatureFlag } from '@quantumdeal/db/schema';

// In webhook processor
async processWebhookSignal(order: MergedOrder): Promise<void> {
  // Step 1: Find subscriptions by sector (TIER_BASED_FILTERING)
  const subscriptions = await this.subscriptionsRepo.findBySector(order.sector);

  for (const subscription of subscriptions) {
    // Step 2: Get eligible users for this subscription
    const eligibleUsers = await this.getEligibleUsers(subscription.subscriptionId);

    for (const user of eligibleUsers) {
      // Step 3: Apply custom filtering if user has that feature
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
```

##### Implementation Notes

- Filtering happens at webhook ingestion time (before notification queue)
- Filters are applied **before** `CUSTOM_USER_FILTERING` (if enabled)
- Filtered signals are logged for analytics but not delivered
- Tier filters are cached per subscription
- System administrators can override tier filters for testing

##### Dependencies

- None (signal delivery is core bot functionality)

##### Conflicts

- None (can work alongside `CUSTOM_USER_FILTERING`)

---

#### CUSTOM_USER_FILTERING

**Category**: Trading Signals & Filtering
**Status**: Production
**Description**: Users can configure their own custom filtering rules for signals
**Business Value**: Empowers users to personalize signal delivery based on their trading strategy
**Recommended Tiers**: VIP only

**Available Starting From**: VIP tier

##### Detailed Description

The `CUSTOM_USER_FILTERING` feature allows users to create personalized filtering rules that determine which signals they receive. This feature works alongside `TIER_BASED_FILTERING` in VIP tier - VIP users get both automatic tier-based filtering AND the ability to add custom rules on top.

**Note**: Only VIP tier has this feature. Basic tier has TIER_BASED_FILTERING but not CUSTOM_USER_FILTERING.

Users can select specific instruments to receive signals for:
- Choose only crypto instruments (BTC, ETH)
- Choose specific forex pairs (EUR/USD, GBP/USD)
- Mix instruments from different sectors
- Or receive all instruments (default)

##### User Commands

```bash
# Open instrument filter UI
/filter

# User selects instruments via Telegram inline keyboard:
# - Navigate through groups (Forex, Commodities, Crypto, Stocks)
# - Toggle individual instruments on/off
# - Save selection

# Example: User selects only BTC and ETH
# Result: Only receives signals for BTCUSD.a and ETHUSD.a
```

##### Configuration Options

Configured at subscription level (feature enabled/disabled):

```typescript
interface CustomUserFilteringConfig {
  // No subscription-level config needed
  // Feature is simply enabled/disabled in subscription_features
}
```

##### User Settings

Users store their custom filtering preferences in the `user_subscription_features` table.

**Settings Schema:**
```typescript
interface CustomUserFilteringSettings {
  // Selected instruments (symbol names from instruments table)
  // Empty array = no filters (receive all signals)
  // Non-empty array = only receive signals for these symbols
  symbols: string[];  // e.g., ['GBPUSD.a', 'EURUSD.a', 'BTCUSD.a']
}
```

**Default Settings:**
```typescript
{
  symbols: []  // Empty = no filtering, receive all signals
}
```

**Example User Settings:**
```typescript
// User 123 (VIP) configures custom filtering
{
  symbols: ['GBPUSD.a', 'EURUSD.a', 'USDJPY.a', 'BTCUSD.a', 'ETHUSD.a']
}
```

**Validation Rules:**
- `symbols`: Must be array of valid symbol names from `instruments` table
- Empty array `[]` = no filtering (receive all signals - default behavior)
- Non-empty array = only receive signals for listed symbols

**Storage:**
```sql
-- Example: User 123 configures custom filtering
INSERT INTO user_subscription_features (user_id, feature_key, settings, is_active)
VALUES (123, 'custom_user_filtering', '{"symbols": ["GBPUSD.a", "EURUSD.a", "BTCUSD.a"]}', true)
ON CONFLICT (user_id, feature_key)
DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();

-- Clear filters (return to default = receive all signals)
DELETE FROM user_subscription_features
WHERE user_id = 123 AND feature_key = 'custom_user_filtering';
```

##### Code Example

```typescript
import { FeatureFlag } from '@quantumdeal/db/schema';

// In webhook processor - applyCustomFiltering()
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
  const instrument = await this.instrumentsRepo.findById(order.instrumentId);
  if (!instrument) {
    this.logger.warn(`Instrument ${order.instrumentId} not found`);
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
```

##### User Experience Example

**Setup Filters:**
```
User: /filter
Bot: [Shows inline keyboard UI]

     🎯 Фильтр инструментов
     ────────────────────
     Текущий статус:
     ✅ Все инструменты (72)

     Выберите категорию:
     [💱 Валюты (28)]
     [🛢️ Товары (7)]
     [💰 Криптовалюты (2)]
     [📈 Акции (35)]

User: [Selects 💰 Криптовалюты]
Bot: [Shows crypto instruments]

     💰 Криптовалюты (2 инструмента)
     ────────────────────
     ☑️ BTCUSD.a (Bitcoin)
     ☑️ ETHUSD.a (Ethereum)

     [💾 Сохранить]

User: [Clicks 💾 Сохранить]
Bot: ✅ Фильтр сохранён!

     Вы будете получать сигналы только по выбранным инструментам:

     💰 Криптовалюты: 2 инструмента
       • BTCUSD.a
       • ETHUSD.a

     Всего выбрано: 2 из 72
```

##### Implementation Notes

- User settings are stored in `user_subscription_features` table
- Settings are cached in-memory during webhook processing
- Custom filtering happens after tier-based filtering
- Users select instruments via Telegram inline keyboard (see telegram-ui-flow.md)
- Symbol names are stored, not instrument IDs
- Empty symbols array = receive all signals (default)

##### Dependencies

- None (signal delivery is core bot functionality)
- Optional: `TIER_BASED_FILTERING` (applied first if both enabled)

##### Conflicts

- None

---

## Subscription Tier Matrix

This matrix shows which filtering features are available in each subscription tier.

**Note**: Signal delivery is core bot functionality available to all tiers. Feature flags control only filtering behavior.

| Feature | Basic | VIP |
|---------|-------|-----|
| Signal Delivery | ✅ (Core) | ✅ (Core) |
| TIER_BASED_FILTERING | ✅ | ✅ |
| CUSTOM_USER_FILTERING | ❌ | ✅ |

### Tier Descriptions

**Basic Tier**
- Signal delivery (core functionality)
- TIER_BASED_FILTERING (system-controlled filtering by sectors)
- NO custom user filtering

**VIP Tier**
- Signal delivery (core functionality)
- TIER_BASED_FILTERING (system-controlled filtering by sectors)
- CUSTOM_USER_FILTERING (user selects specific instruments)

---

## Feature Dependencies & Conflicts

### Dependencies

**No dependencies exist between the two filtering features.**

Both features operate independently on the core signal delivery functionality:
- Signal delivery is core bot functionality (not a feature flag)
- Both filtering features are independent and can be enabled separately
- When both are enabled, they work in sequence (tier filtering first, then custom filtering)

### Conflicts

**No conflicts exist between the two filtering features.**

Both features can be enabled simultaneously:
- `TIER_BASED_FILTERING` filters signals first (system-level)
- `CUSTOM_USER_FILTERING` filters signals second (user-level)
- Both filtering layers work together to provide precise signal delivery

---

## Migration Paths

### Upgrade Paths

**Basic → VIP**
- Gain: `CUSTOM_USER_FILTERING` (TIER_BASED_FILTERING already exists on Basic)
- Impact: User can now select specific instruments in addition to tier-based sector filtering

### Downgrade Paths

**VIP → Basic**
- Lose: `CUSTOM_USER_FILTERING` (TIER_BASED_FILTERING remains)
- Impact: Lose ability to select specific instruments. Custom filter settings are preserved in database for future upgrade.

---

## Configuration Reference

### Feature Enum

```typescript
enum FeatureFlag {
  TIER_BASED_FILTERING = 'tier_based_filtering',
  CUSTOM_USER_FILTERING = 'custom_user_filtering',
}
```

### Database Schema

```typescript
// subscription_features table
interface SubscriptionFeature {
  id: number;
  subscriptionId: number;
  featureKey: FeatureFlag;
  isEnabled: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Usage in Code

```typescript
import { FeatureFlag } from '@quantumdeal/db/schema';
import { hasFeature, getFeatureConfig } from '@quantumdeal/bot/interfaces/user.dto';

// Note: Signal delivery is always available (core functionality)
// Feature flags control only filtering behavior

// Check if filtering feature is enabled
if (hasFeature(user, FeatureFlag.TIER_BASED_FILTERING)) {
  // User has tier-based filtering
}

// Get feature configuration
const config = getFeatureConfig<TierBasedFilteringConfig>(
  user,
  FeatureFlag.TIER_BASED_FILTERING
);
```

### Feature Templates

Predefined feature sets for quick subscription setup:

**Note**: Signal delivery is core functionality - all tiers receive signals. Templates define only the filtering features.

```typescript
export enum FeatureTemplate {
  BASIC_SIGNALS = 'BASIC_SIGNALS',
  VIP_SIGNALS = 'VIP_SIGNALS',
}

export const FEATURE_TEMPLATES: Record<
  FeatureTemplate,
  { name: string; features: FeatureFlag[] }
> = {
  [FeatureTemplate.BASIC_SIGNALS]: {
    name: 'Basic Signals',
    features: [FeatureFlag.TIER_BASED_FILTERING], // Tier-based filtering by sectors
  },
  [FeatureTemplate.VIP_SIGNALS]: {
    name: 'VIP Signals',
    features: [
      FeatureFlag.TIER_BASED_FILTERING,
      FeatureFlag.CUSTOM_USER_FILTERING,
    ],
  },
};
```

---

## Summary

The Feature Flags system provides two core filtering features that control signal delivery behavior:

1. **TIER_BASED_FILTERING**: System-controlled filtering by subscription sectors (All tiers)
2. **CUSTOM_USER_FILTERING**: User-controlled instrument selection (VIP tier only)

**Important**: Signal delivery is core bot functionality available to all users. These feature flags control only the filtering behavior applied to signals. Both Basic and VIP tiers have TIER_BASED_FILTERING (sector-based). VIP additionally gets CUSTOM_USER_FILTERING (instrument selection).

---

## Related Documentation

### See Also

For detailed information on specific aspects of the feature flags system:

**Architecture & Design:**
- **[README.md](./README.md)** - System architecture and overview
  - See [Architecture section](./README.md#architecture) for high-level design
  - See [Benefits section](./README.md#benefits) for business value
  - See [Use Cases section](./README.md#use-cases) for tier comparison

**Implementation:**
- **[implementation-plan.md](./implementation-plan.md)** - Step-by-step guide
  - See [Pre-Migration Checklist](./implementation-plan.md#pre-migration-checklist) before starting
  - See [Phase 1](./implementation-plan.md#phase-1-database-and-repository-layer) for database setup
  - See [Phase 2](./implementation-plan.md#phase-2-service-layer) for service layer
  - See [Phase 4](./implementation-plan.md#phase-4-integration-and-migration) for data migration

**Database & Storage:**
- **[database-schema.md](./database-schema.md)** - Schema and migrations
  - See table definitions and relationships
  - See migration scripts
  - See query optimization tips
  - See JSONB settings storage for `user_subscription_features`

**Code Examples:**
- **[examples.md](./examples.md)** - Copy-paste ready code
  - See feature check examples
  - See conditional UI patterns
  - See webhook broadcasting with filtering
  - See testing examples

**Quick References:**
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Developer cheat sheet
  - See [Troubleshooting Index](./QUICK_REFERENCE.md#troubleshooting) for common issues
  - See quick code snippets
- **[README.md](./README.md)** - Documentation hub
  - See [Glossary](./README.md#glossary) for key terms
  - See [Decision Tree](./README.md#which-document-should-i-read) for navigation
  - See [Quick Start Guide](./README.md#quick-start-guide) for role-specific reading paths
