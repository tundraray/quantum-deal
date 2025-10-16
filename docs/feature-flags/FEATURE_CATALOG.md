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
**Description**: System automatically filters signals based on subscription tier
**Business Value**: Ensures users receive appropriate signals for their tier without manual configuration
**Recommended Tiers**: VIP

**Note**: Basic tier does NOT have this feature. Basic users receive all signals (no filtering, core functionality only).

##### Detailed Description

The `TIER_BASED_FILTERING` feature applies automatic, system-controlled filters to incoming signals based on the user's subscription tier. This ensures that:

1. **Basic users** - NOT APPLICABLE (Basic tier has no filtering, receives all signals - core functionality only)
2. **VIP users** receive filtered signals based on VIP tier rules (pre-configured by tier)

The filtering happens **automatically in the webhook processor** before signals reach users. Users cannot modify these tier-based rules directly, but VIP users can add additional custom filtering on top.

##### Tier-Specific Filter Rules

**Basic Tier:**
```typescript
// Basic tier does NOT use TIER_BASED_FILTERING
// Basic users receive all signals (core functionality)
// No feature flags needed
{
  tier: 'basic',
  autoFilters: null  // No filtering
}
```

**VIP Tier:**
```typescript
{
  tier: 'vip',
  autoFilters: {
    // VIP tier automatic filtering
    allowedSymbols: ['BTC/USD', 'ETH/USD', 'GOLD', 'SILVER', 'OIL'],
    minPriority: 'medium',
    excludedTypes: ['news', 'analysis']
  }
}
```

##### Configuration Options

```typescript
interface TierBasedFilteringConfig {
  // Subscription tier
  tier: 'basic' | 'vip';

  // Automatic filter rules
  autoFilters: {
    // Minimum win rate percentage
    minWinRate?: number; // e.g., 60, 70

    // Allowed symbols (whitelist)
    symbols?: string[]; // e.g., ['BTC', 'ETH', 'SOL']

    // Signal priority filter
    priority?: 'high' | 'normal' | 'low';

    // Allowed categories
    categories?: string[]; // e.g., ['crypto', 'forex', 'stocks']

    // Minimum signal confidence
    minConfidence?: number; // 0-100

    // Allowed timeframes
    timeframes?: string[]; // e.g., ['1h', '4h', '1d']

    // Maximum leverage
    maxLeverage?: number; // e.g., 10, 20, 50
  };

  // Filter behavior
  strictMode?: boolean; // Default: true (reject if any filter fails)
  logFiltered?: boolean; // Default: true (log filtered signals)
}
```

##### User Settings

Users can customize tier-based filtering behavior through the `user_subscription_features` table.

**Settings Schema:**
```typescript
interface TierBasedFilteringSettings {
  // Override minimum win rate
  minWinRate?: number;              // e.g., 65, 70, 75

  // Customize categories filter
  categories?: string[];            // e.g., ['crypto', 'forex']

  // Weekend signal preference
  excludeWeekends?: boolean;        // Default: false

  // Only high-priority signals
  priorityOnly?: boolean;           // Default: false

  // Timeframe preferences
  preferredTimeframes?: string[];   // e.g., ['1h', '4h']
}
```

**Default Settings:**
```typescript
{
  minWinRate: null,              // Use tier default
  categories: null,              // Use tier default (all categories)
  excludeWeekends: false,        // Receive weekend signals
  priorityOnly: false,           // Receive all priority levels
  preferredTimeframes: null      // Use tier default (all timeframes)
}
```

**Example User Settings:**
```typescript
// User 123 (VIP) customizes tier filtering
{
  minWinRate: 70,                    // Higher than tier default (60)
  categories: ['crypto', 'forex'],   // Only crypto and forex
  excludeWeekends: true,             // No signals on weekends
  priorityOnly: false,               // All priorities OK
  preferredTimeframes: ['4h', '1d']  // Prefer longer timeframes
}
```

**Validation Rules:**
- `minWinRate`: 0-100, must be >= tier minimum
- `categories`: Must be valid category names
- `excludeWeekends`: Boolean
- `priorityOnly`: Boolean
- `preferredTimeframes`: Must be valid timeframe codes

**Storage:**
```sql
-- Example: User 123 customizes tier-based filtering
INSERT INTO user_subscription_features (user_id, feature_key, settings)
VALUES (123, 'tier_based_filtering', '{
  "minWinRate": 70,
  "categories": ["crypto", "forex"],
  "excludeWeekends": true
}')
ON CONFLICT (user_id, feature_key)
DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();
```

##### Code Example

```typescript
import { FeatureFlag } from '@quantumdeal/db/schema';
import { hasFeature, getFeatureConfig } from '@quantumdeal/bot/interfaces/user.dto';

// In webhook processor
async processWebhookSignal(signal: TradingSignal): Promise<void> {
  const users = await this.getUsersWithActiveSubscriptions();

  for (const user of users) {
    // All users with active subscriptions receive signals (signal delivery is core functionality)
    // Check if tier-based filtering should be applied
    if (hasFeature(user, FeatureFlag.TIER_BASED_FILTERING)) {
      const config = getFeatureConfig<TierBasedFilteringConfig>(
        user,
        FeatureFlag.TIER_BASED_FILTERING
      );

      // Apply tier-specific filters
      if (!this.matchesTierFilters(signal, config.autoFilters)) {
        this.logger.debug(`Signal filtered by tier rules for user ${user.id}`, {
          userId: user.id,
          tier: config.tier,
          signal: signal.symbol,
          filters: config.autoFilters
        });
        continue; // Skip this user
      }
    }

    // Send signal to user
    await this.sendSignalToUser(user, signal);
  }
}

// Filter matching logic
private matchesTierFilters(
  signal: TradingSignal,
  filters: TierBasedFilteringConfig['autoFilters']
): boolean {
  // Check minimum win rate
  if (filters.minWinRate && signal.historicalWinRate < filters.minWinRate) {
    return false;
  }

  // Check symbols whitelist
  if (filters.symbols && !filters.symbols.includes(signal.symbol)) {
    return false;
  }

  // Check priority
  if (filters.priority && signal.priority !== filters.priority) {
    return false;
  }

  // Check categories
  if (filters.categories && !filters.categories.includes(signal.category)) {
    return false;
  }

  return true;
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

**Note**: Only VIP tier has this feature. Basic tier has no filtering at all.

Users can create rules like:
- "Only show BTC signals when price > $44,000"
- "Only futures signals with leverage <= 10x"
- "No signals between 22:00 and 06:00 (my sleep time)"
- "Only signals with confidence > 80%"
- "Only long positions (no shorts)"

Rules can be combined with AND/OR logic for complex conditions.

##### User Commands

```bash
# Set a simple filter
/filter set symbol BTC

# Set filter with condition
/filter set price > 44000

# Set filter with AND logic
/filter set symbol BTC AND price > 44000

# Set filter with OR logic
/filter set symbol BTC OR symbol ETH

# Set quiet hours (no signals during sleep)
/filter quiet 22:00 06:00

# List active filters
/filter list

# Remove a filter
/filter remove 1

# Clear all filters
/filter clear

# Test filter against sample signal
/filter test symbol BTC price 45000
```

##### Configuration Options

```typescript
interface CustomUserFilteringConfig {
  // Enable/disable user filtering
  enabled: boolean; // Default: true

  // User-defined filter rules
  rules: Array<{
    // Field to filter on
    field: string; // 'symbol', 'price', 'priority', 'leverage', 'timeframe', etc.

    // Comparison operator
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';

    // Value to compare against
    value: string | number | boolean;

    // Combine with next rule
    combineWith?: 'AND' | 'OR'; // Default: 'AND'

    // Rule ID (for removal)
    id?: string;

    // Rule description (user-friendly)
    description?: string;
  }>;

  // Schedule-based filters
  scheduleFilters?: {
    // User's timezone
    timezone: string; // e.g., 'America/New_York', 'Europe/London'

    // Quiet hours (no signals)
    quietHours?: {
      start: string; // e.g., '22:00'
      end: string;   // e.g., '06:00'
    };

    // Active days (1-7, Monday-Sunday)
    activeDays?: number[]; // e.g., [1, 2, 3, 4, 5] (weekdays only)

    // Specific time windows (only receive during these times)
    activeWindows?: Array<{
      start: string;
      end: string;
      days?: number[]; // Optional: specific days for this window
    }>;
  };

  // Advanced options
  maxRules?: number; // Maximum rules allowed (default: 10)
  allowComplexLogic?: boolean; // Allow nested AND/OR (default: false)
  caseSensitive?: boolean; // Case-sensitive string matching (default: false)
}
```

##### User Settings

Users store their custom filtering preferences in the `user_subscription_features` table.

**Settings Schema:**
```typescript
interface CustomUserFilteringSettings {
  // Selected instruments (instrument IDs from instruments table)
  // Empty array = no filters (receive all signals)
  // Non-empty array = only receive signals for these instruments
  instruments: number[];                  // e.g., [1, 5, 12, 15, 28, 37, 38]
}
```

**Default Settings:**
```typescript
{
  instruments: []                    // Empty = no filtering, receive all signals
}
```

**Example User Settings:**
```typescript
// User 123 (VIP) configures custom filtering
{
  instruments: [15, 21, 28, 37, 38]  // 5 instruments selected:
                                      // 15 = EURUSD.a
                                      // 21 = GBPUSD.a
                                      // 28 = USDJPY.a
                                      // 37 = BTCUSD.a
                                      // 38 = ETHUSD.a
}
```

**Validation Rules:**
- `instruments`: Must be array of valid instrument IDs from `instruments` table
- Empty array `[]` = no filtering (receive all signals - default behavior)
- Non-empty array = only receive signals for listed instrument IDs

**Storage:**
```sql
-- Example: User 123 configures custom filtering
INSERT INTO user_subscription_features (user_id, feature_key, settings, is_active)
VALUES (123, 'custom_user_filtering', '{"instruments": [15, 21, 28, 37, 38]}', true)
ON CONFLICT (user_id, feature_key)
DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();

-- Clear filters (return to default = receive all signals)
DELETE FROM user_subscription_features
WHERE user_id = 123 AND feature_key = 'custom_user_filtering';
```

##### Code Example

```typescript
import { FeatureFlag } from '@quantumdeal/db/schema';
import { hasFeature, getFeatureConfig } from '@quantumdeal/bot/interfaces/user.dto';

// In webhook processor (after tier-based filtering if applicable)
async processWebhookSignal(signal: TradingSignal): Promise<void> {
  const users = await this.getUsersWithActiveSubscriptions();

  for (const user of users) {
    // All users receive signals (signal delivery is core functionality)
    // Apply tier-based filtering if enabled
    if (hasFeature(user, FeatureFlag.TIER_BASED_FILTERING)) {
      // ... tier filtering logic
    }

    // Then apply custom user filtering if enabled
    if (hasFeature(user, FeatureFlag.CUSTOM_USER_FILTERING)) {
      const config = getFeatureConfig<CustomUserFilteringConfig>(
        user,
        FeatureFlag.CUSTOM_USER_FILTERING
      );

      if (!config.enabled) {
        // User has disabled custom filtering
        await this.sendSignalToUser(user, signal);
        continue;
      }

      // Check schedule filters
      if (!this.isWithinActiveSchedule(config.scheduleFilters)) {
        this.logger.debug(`Signal filtered by schedule for user ${user.id}`);
        continue;
      }

      // Apply custom rules
      if (!this.matchesCustomRules(signal, config.rules)) {
        this.logger.debug(`Signal filtered by custom rules for user ${user.id}`);
        continue;
      }
    }

    // Send signal to user
    await this.sendSignalToUser(user, signal);
  }
}

// Custom rules matching logic
private matchesCustomRules(
  signal: TradingSignal,
  rules: CustomUserFilteringConfig['rules']
): boolean {
  if (!rules || rules.length === 0) {
    return true; // No rules = pass all
  }

  let result = true;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleMatches = this.evaluateRule(signal, rule);

    if (i === 0) {
      result = ruleMatches;
    } else {
      const previousRule = rules[i - 1];
      if (previousRule.combineWith === 'OR') {
        result = result || ruleMatches;
      } else { // AND
        result = result && ruleMatches;
      }
    }
  }

  return result;
}

// Evaluate single rule
private evaluateRule(
  signal: TradingSignal,
  rule: CustomUserFilteringConfig['rules'][0]
): boolean {
  const fieldValue = this.getFieldValue(signal, rule.field);

  switch (rule.operator) {
    case '=':
      return fieldValue === rule.value;
    case '!=':
      return fieldValue !== rule.value;
    case '>':
      return Number(fieldValue) > Number(rule.value);
    case '<':
      return Number(fieldValue) < Number(rule.value);
    case '>=':
      return Number(fieldValue) >= Number(rule.value);
    case '<=':
      return Number(fieldValue) <= Number(rule.value);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
    default:
      return false;
  }
}
```

##### User Experience Example

**Setup Filters:**
```
User: /filter set symbol BTC
Bot: ✅ Filter added: Symbol equals BTC

User: /filter set price > 44000
Bot: ✅ Filter added: Price greater than 44000
     Current filters: 2

User: /filter quiet 22:00 06:00
Bot: ✅ Quiet hours set: 22:00 - 06:00
     You won't receive signals during these hours.

User: /filter list
Bot: 📋 Your Active Filters:

     1. Symbol = BTC (AND)
     2. Price > 44000 (AND)

     🌙 Quiet Hours: 22:00 - 06:00
     Timezone: America/New_York

     🧪 Test your filters: /filter test
```

##### Implementation Notes

- User filters are stored in database (user_filter_rules table)
- Filters are cached per user
- Filter evaluation happens after tier-based filtering
- Maximum 10 rules per user (configurable per tier)
- VIP: 10 rules (can be adjusted per deployment needs)
- Schedule filters use user's timezone (from profile or auto-detected)
- Filtered signals are logged for user analytics (show what they missed)

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
| TIER_BASED_FILTERING | ❌ | ✅ |
| CUSTOM_USER_FILTERING | ❌ | ✅ |

### Tier Descriptions

**Basic Tier**
- Signal delivery (core functionality)
- No filtering capabilities
- Receives all signals (no feature flags)

**VIP Tier**
- Signal delivery (core functionality)
- Automatic tier-based filtering (system-controlled)
- Full custom user filtering (additional personalization on top of tier filtering)

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
- Gain: `TIER_BASED_FILTERING` + `CUSTOM_USER_FILTERING`
- Impact: Both automatic tier-based and user-controlled filtering (highest flexibility, reduces signal volume)

### Downgrade Paths

**VIP → Basic**
- Lose: `TIER_BASED_FILTERING` + `CUSTOM_USER_FILTERING`
- Impact: Lose all filtering, receive all signals (back to core functionality only). Custom filters are preserved in database for future upgrade.

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
    features: [], // No filtering features - receives all signals (core functionality)
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

1. **TIER_BASED_FILTERING**: System-controlled filtering for VIP tier
2. **CUSTOM_USER_FILTERING**: User-controlled filtering for VIP tier

**Important**: Signal delivery is core bot functionality available to all users. These feature flags control only the filtering behavior applied to signals. Basic tier users receive all signals (no filtering), VIP users get both automatic tier-based filtering AND custom user filtering.

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
