# Feature Flags Usage Examples

> **Note**: Signal delivery is core functionality, not a feature flag.
> This system manages only **2 features**: TIER_BASED_FILTERING and CUSTOM_USER_FILTERING.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Command Handlers](#command-handlers)
3. [Conditional UI](#conditional-ui)
4. [Feature Configuration](#feature-configuration)
5. [Service Layer](#service-layer)
6. [Testing](#testing)
7. [Real-World Example: Webhook-Based Broadcasting](#real-world-example-webhook-based-broadcasting)

## Basic Usage

### Check if User Has Feature

```typescript
import { hasFeature } from '@quantumdeal/bot/interfaces/user.dto';
import { FeatureFlag } from '@quantumdeal/db/schema';

// In any handler with UserContext
async handleCommand(@Ctx() ctx: UserContext) {
  if (!ctx.user) {
    await ctx.reply('Please start the bot first with /start');
    return;
  }

  if (hasFeature(ctx.user, FeatureFlag.TIER_BASED_FILTERING)) {
    // User has access to tier-based filtering (available on all tiers)
    await ctx.reply('Your subscription includes tier-based filtering...');
  } else {
    // User doesn't have an active subscription
    await ctx.reply('Activate a subscription to access features.');
  }
}
```

### Get Feature Configuration

```typescript
import { getFeatureConfig } from '@quantumdeal/bot/interfaces/user.dto';
import { FeatureFlag } from '@quantumdeal/db/schema';

async handleFilter(@Ctx() ctx: UserContext) {
  const config = getFeatureConfig(ctx.user, FeatureFlag.TIER_BASED_FILTERING);

  if (!config) {
    await ctx.reply('Filtering feature not available in your subscription.');
    return;
  }

  const sectors = config.sectors as string[];

  await ctx.reply(
    `Your tier-based filter settings:\n` +
    `Sectors: ${sectors?.join(', ') || 'All'}`
  );
}
```

## Command Handlers

### Using @RequireFeature Decorator

```typescript
import { Injectable } from '@nestjs/common';
import { Command, Ctx } from 'nestjs-telegraf';
import { RequireFeature } from '@quantumdeal/bot/decorators';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { UserContext } from '@quantumdeal/bot/interfaces/user-context.interface';

@Injectable()
export class SignalsCommands {
  /**
   * Basic signals - accessible to all subscribers
   * Note: Signal delivery is core functionality, not gated by feature flags
   */
  @Command('signals')
  async showSignals(@Ctx() ctx: UserContext) {
    // All active users can access basic signals
    await ctx.reply('Here are your latest signals:');
    // ... show signals
  }

  /**
   * Custom user filtering - VIP only feature
   * Note: TIER_BASED_FILTERING is available on all tiers, so we only
   * need to protect custom filtering
   */
  @Command('customfilter')
  @RequireFeature(FeatureFlag.CUSTOM_USER_FILTERING)
  async customFilterSignals(@Ctx() ctx: UserContext) {
    // Only VIP users can access
    await ctx.reply('Configure your custom instrument filters:');
    // ... show custom filter UI (select specific symbols)
  }
}
```

### Manual Feature Check (Without Decorator)

```typescript
import { Injectable } from '@nestjs/common';
import { Command, Ctx } from 'nestjs-telegraf';
import { hasFeature } from '@quantumdeal/bot/interfaces/user.dto';
import { FeatureFlag } from '@quantumdeal/db/schema';

@Injectable()
export class CustomCommands {
  @Command('dashboard')
  async showDashboard(@Ctx() ctx: UserContext) {
    if (!ctx.user) {
      await ctx.reply('Please start the bot first.');
      return;
    }

    // Check if user has active subscription
    // Note: Signal delivery is core functionality, not gated by feature flags
    if (!ctx.user.isActive) {
      await ctx.reply(
        'You need an active subscription to access the dashboard.\n' +
        'Use /subscribe to get started.'
      );
      return;
    }

    // User has access - show dashboard
    await ctx.reply('Welcome to your dashboard!');
    // ... dashboard logic
  }

  @Command('myfilters')
  async showMyFilters(@Ctx() ctx: UserContext) {
    if (!ctx.user) {
      await ctx.reply('Please start the bot first.');
      return;
    }

    // Check tier-based filtering
    const hasTierFilter = hasFeature(ctx.user, FeatureFlag.TIER_BASED_FILTERING);
    const hasCustomFilter = hasFeature(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING);

    let message = 'Your Filtering Options:\n\n';

    if (hasTierFilter) {
      message += '✅ Tier-Based Filtering (All tiers)\n';
      message += '   • System-controlled filters by subscription\n';
      message += '   • Sector-based signal filtering\n\n';
    }

    if (hasCustomFilter) {
      message += '✅ Custom User Filtering (VIP only)\n';
      message += '   • Choose specific instruments\n';
      message += '   • Personalize which signals you receive\n\n';
    }

    if (!hasTierFilter) {
      message += '❌ No active subscription\n\n';
      message += 'Subscribe to start receiving filtered signals.';
    } else if (!hasCustomFilter) {
      message += '💡 Upgrade to VIP for custom filtering\n';
      message += 'Choose exactly which instruments you want.';
    }

    await ctx.reply(message);
  }
}
```

## Conditional UI

### Show/Hide Buttons Based on Features

```typescript
import { Markup } from 'telegraf';
import { hasFeature } from '@quantumdeal/bot/interfaces/user.dto';
import { FeatureFlag } from '@quantumdeal/db/schema';

async showMenu(@Ctx() ctx: UserContext) {
  const buttons = [];

  // Basic button - always shown to all active users
  // Note: Signal delivery is core functionality, not gated by feature flags
  if (ctx.user.isActive) {
    buttons.push([Markup.button.callback('📊 Signals', 'show_signals')]);
  }

  // VIP button - only for users with tier-based filtering
  if (hasFeature(ctx.user, FeatureFlag.TIER_BASED_FILTERING)) {
    buttons.push([Markup.button.callback('🔍 Tier Filters', 'tier_filters')]);
  }

  // Premium button - only for users with custom filtering
  if (hasFeature(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING)) {
    buttons.push([Markup.button.callback('⚙️ Custom Filters', 'custom_filters')]);
  }

  // Always show upgrade option
  buttons.push([Markup.button.callback('⬆️ Upgrade', 'upgrade_info')]);

  await ctx.reply(
    'Main Menu - Select an option:',
    Markup.inlineKeyboard(buttons)
  );
}
```

### Progressive Feature Disclosure

```typescript
async showFeatures(@Ctx() ctx: UserContext) {
  const lines = ['Your Subscription Features:\n'];

  // Check feature flags (2 features)
  const hasTierFilter = hasFeature(ctx.user, FeatureFlag.TIER_BASED_FILTERING);
  const hasCustomFilter = hasFeature(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING);

  lines.push('📊 Core Features:');
  lines.push(`  ${ctx.user.isActive ? '✅' : '❌'} Signal Delivery (Core)`);

  lines.push('\n🔍 Filtering Features:');
  lines.push(`  ${hasTierFilter ? '✅' : '❌'} Tier-Based Filtering (All tiers)`);
  lines.push(`  ${hasCustomFilter ? '✅' : '❌'} Custom User Filtering (VIP only)`);

  // Show upgrade CTA if user is missing features
  if (!hasTierFilter || !hasCustomFilter) {
    lines.push('\n💡 Upgrade to unlock more features!');
    lines.push('Use /upgrade to see options.');
  }

  await ctx.reply(lines.join('\n'));
}
```

## Feature Configuration

### Tier-Based Filtering Configuration

```typescript
import { Injectable } from '@nestjs/common';
import { getFeatureConfig } from '@quantumdeal/bot/interfaces/user.dto';
import { FeatureFlag } from '@quantumdeal/db/schema';

@Injectable()
export class TierFilteringService {
  async applyTierFilters(ctx: UserContext, signals: Signal[]): Promise<Signal[]> {
    const config = getFeatureConfig(ctx.user, FeatureFlag.TIER_BASED_FILTERING);

    if (!config) {
      // No tier filtering, return all signals
      return signals;
    }

    const sectors = config.sectors as string[] | undefined;

    return signals.filter(signal => {
      // Filter by subscription sectors
      if (sectors && !sectors.includes(signal.sector)) {
        return false;
      }

      return true;
    });
  }
}
```

### Custom User Filtering Configuration

```typescript
@Injectable()
export class CustomFilteringService {
  constructor(
    private readonly userFeaturesRepo: UserSubscriptionFeaturesRepository,
  ) {}

  /**
   * Apply custom user filtering based on selected symbols
   */
  async applyCustomFilters(
    userId: number,
    signals: Signal[],
  ): Promise<Signal[]> {
    // Get user's custom filter settings
    const userSettings = await this.userFeaturesRepo.getUserFeatureSettings(
      userId,
      FeatureFlag.CUSTOM_USER_FILTERING,
    );

    if (!userSettings || !userSettings.settings) {
      // No custom filtering configured - return all signals
      return signals;
    }

    const { symbols } = userSettings.settings as CustomFilterSettings;

    // No symbols configured - return all signals
    if (!symbols || symbols.length === 0) {
      return signals;
    }

    // Filter signals by selected symbols
    return signals.filter(signal => symbols.includes(signal.symbol));
  }
}

interface CustomFilterSettings {
  // Array of symbol names like ['GBPUSD.a', 'EURUSD.a', 'BTCUSD.a']
  symbols: string[];
}
```

## Service Layer

### Feature-Aware Signal Processing

```typescript
import { Injectable } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { UserWithSubscriptions } from '../interfaces/user.dto';

@Injectable()
export class SignalProcessingService {
  constructor(
    private readonly tierFilteringService: TierFilteringService,
    private readonly customFilteringService: CustomFilteringService,
  ) {}

  async processSignalForUsers(signal: Signal): Promise<void> {
    // Get all users with active subscriptions
    // Note: Signal delivery is core functionality, not gated by feature flags
    const users = await this.getUsersWithActiveSubscriptions();

    for (const user of users) {
      let shouldSend = true;
      let filteredSignals = [signal];

      // Check if user has tier-based filtering
      const hasTierFilter = user.enabledFeatures.has(FeatureFlag.TIER_BASED_FILTERING);
      if (hasTierFilter) {
        filteredSignals = await this.tierFilteringService.applyTierFilters(
          { user } as UserContext,
          filteredSignals
        );
        shouldSend = filteredSignals.length > 0;
      }

      // Check if user has custom filtering (overrides tier filtering)
      const hasCustomFilter = user.enabledFeatures.has(FeatureFlag.CUSTOM_USER_FILTERING);
      if (hasCustomFilter && shouldSend) {
        filteredSignals = await this.customFilteringService.applyCustomFilters(
          { user } as UserContext,
          filteredSignals
        );
        shouldSend = filteredSignals.length > 0;
      }

      if (shouldSend) {
        await this.notificationService.sendSignalNotification(user, signal);
      }
    }
  }
}
```

## Real-World Example: Webhook-Based Broadcasting

### Overview

This section shows how feature flags enable different message broadcasting behavior when processing incoming webhook events. For a complete implementation guide with code examples, flow diagrams, and testing scenarios, see [webhook-example.md](./webhook-example.md).

### The Scenario

A trading signals bot receives webhook notifications from MT5 and broadcasts them differently to users based on their subscription features:

> **Note**: All active subscribers receive signals by default (core functionality).
> Feature flags control only filtering behavior.

- **Basic Users**: Receive signals filtered by TIER_BASED_FILTERING (subscription sectors)
- **VIP Users**: Receive signals filtered by TIER_BASED_FILTERING + CUSTOM_USER_FILTERING (choose specific symbols)

### Quick Example: Feature-Aware Webhook Processing

```typescript
@Injectable()
export class WebhookProcessorService {
  async sendOrderNotifications(
    order: MergedOrder,
    eventType: MessageType,
  ): Promise<NotificationResult> {
    // Step 1: Get all eligible users
    const eligibleUsers = await this.getEligibleUsers(order);

    // Step 2: Load feature flags for all users (batch query)
    const usersWithFeatures = await this.loadUserFeatures(eligibleUsers);

    // Step 3: Apply feature-based filtering
    const filteredUsers = await this.applyFeatureFiltering(
      usersWithFeatures,
      order,
      eventType,
    );

    // Step 4: Send notifications
    return await this.sendNotifications(filteredUsers, order);
  }

  private async shouldSendToUser(
    user: UserWithFeatures,
    order: MergedOrder,
  ): Promise<boolean> {
    // Note: All active users receive signals by default (core functionality)
    // Feature flags control only filtering behavior

    if (!user.isActive) {
      return false; // No active subscription
    }

    // Apply tier-based filtering if enabled
    if (hasFeature(user, FeatureFlag.TIER_BASED_FILTERING)) {
      const passesFilter = await this.checkTierFiltering(user, order);
      if (!passesFilter) {
        this.logger.debug('User filtered by TIER_BASED_FILTERING');
        return false;
      }
    }

    // Apply custom filtering if enabled
    // Important: Check if subscription has CUSTOM_USER_FILTERING feature
    // Then load user's personal settings from user_subscription_features
    if (hasFeature(user, FeatureFlag.CUSTOM_USER_FILTERING)) {
      const passesConditions = await this.checkCustomFiltering(user, order);
      if (!passesConditions) {
        this.logger.debug('User filtered by CUSTOM_USER_FILTERING');
        return false;
      }
    }

    return true;
  }

  private async checkTierFiltering(
    user: UserWithFeatures,
    order: MergedOrder,
  ): Promise<boolean> {
    const config = getFeatureConfig(
      user,
      FeatureFlag.TIER_BASED_FILTERING,
    ) as TierFilteringConfig;

    if (!config) return true;

    // Check subscription sectors
    if (config.sectors && !config.sectors.includes(order.sector)) {
      return false;
    }

    return true;
  }

  private async checkCustomFiltering(
    user: UserWithFeatures,
    order: MergedOrder,
  ): Promise<boolean> {
    // Step 1: Check if subscription has CUSTOM_USER_FILTERING feature
    // (Already confirmed by hasFeature() check in shouldSendToUser)

    // Step 2: Get user's custom filter settings from user_subscription_features
    const userSettings = await this.db
      .select({
        settings: userSubscriptionFeatures.settings,
      })
      .from(userSubscriptionFeatures)
      .where(
        and(
          eq(userSubscriptionFeatures.userId, user.telegramId),
          eq(userSubscriptionFeatures.featureKey, 'custom_user_filtering'),
          eq(userSubscriptionFeatures.isActive, true)
        )
      )
      .limit(1);

    if (userSettings.length === 0) {
      // User hasn't configured custom filters yet - allow signal
      return true;
    }

    // Step 3: Apply user's custom filters from settings field
    const { settings } = userSettings[0];

    // settings structure:
    // {
    //   "symbols": ["GBPUSD.a", "EURUSD.a", "BTCUSD.a"]
    // }

    const { symbols } = settings;

    // No symbols configured - allow all signals
    if (!symbols || symbols.length === 0) {
      return true;
    }

    // Check if signal symbol is in user's whitelist
    if (!symbols.includes(order.symbol)) {
      this.logger.debug(
        `User ${user.telegramId} filtered: symbol ${order.symbol} not in whitelist`,
      );
      return false;
    }

    return true;
  }

}
```

### User Experience Comparison

**Incoming Webhook**: BTC/USDT BUY signal at $45,000

| User | Features | What Happens |
|------|----------|-------------|
| **Alice** (Basic) | `tier_based_filtering` | ✅ Receives signal (matches tier sectors) |
| **Bob** (VIP) | `tier_based_filtering`<br>`custom_user_filtering`<br>(symbols: ['BTCUSD.a']) | ✅ Receives signal (BTC in whitelist) |

### Performance Best Practices for Webhooks

1. **Batch Load Features**: Load features for all users at once
   ```typescript
   // ❌ Bad: N+1 queries
   for (const user of users) {
     const features = await loadFeatures(user.id);
   }

   // ✅ Good: Single batch query
   const allFeatures = await loadFeaturesBatch(users.map(u => u.id));
   ```

2. **Cache Feature Checks**: Cache in-memory during webhook processing
   ```typescript
   const featureCache = new Map();
   for (const user of users) {
     if (!featureCache.has(user.id)) {
       featureCache.set(user.id, await loadFeatures(user.id));
     }
     const features = featureCache.get(user.id);
   }
   ```

3. **Parallel Processing**: Filter users in parallel when possible
   ```typescript
   const results = await Promise.all(
     users.map(user => shouldSendToUser(user, order))
   );
   const filteredUsers = users.filter((_, i) => results[i]);
   ```

### Complete Implementation

The code examples above provide the complete implementation for webhook-based broadcasting with feature flags, including:
- Full webhook processor service code
- Feature configuration interfaces
- User filtering logic
- Comprehensive test cases
- Performance optimization strategies

## Best Practices Summary

1. **Always check user exists** before checking features
   ```typescript
   if (!ctx.user || !hasFeature(ctx.user, feature)) {
     return;
   }
   ```

2. **Use decorators for enforcement**, helpers for conditional logic
   ```typescript
   @RequireFeature(FeatureFlag.TIER_BASED_FILTERING) // Blocks access
   // vs
   if (hasFeature(user, FeatureFlag.CUSTOM_USER_FILTERING)) { } // Conditional UI
   ```

3. **Provide clear upgrade paths** when denying access
   ```typescript
   await ctx.reply(
     '❌ Feature not available\n\n' +
     '✨ Upgrade to VIP to unlock:\n' +
     '• Tier-based filtering\n' +
     '• Symbol and priority filters\n\n' +
     'Use /upgrade to learn more'
   );
   ```

4. **Cache feature checks** in tight loops
   ```typescript
   const hasTierFilter = hasFeature(user, FeatureFlag.TIER_BASED_FILTERING);
   for (const item of items) {
     if (hasTierFilter) { /* ... */ }
   }
   ```

5. **Log feature access** for analytics
   ```typescript
   this.logger.log({
     event: 'feature_access',
     userId: user.telegramId,
     feature: featureKey,
     granted: hasAccess,
   });
   ```

6. **Document feature configurations** in code
   ```typescript
   interface TierFilteringConfig {
     // Configured at subscription level in subscription_features.config
     sectors: string[]; // e.g., ['crypto', 'forex']
   }

   interface CustomFilteringConfig {
     // Configured at user level in user_subscription_features.settings
     symbols: string[]; // e.g., ['GBPUSD.a', 'EURUSD.a']
   }
   ```

## Related Documentation

- [Feature Flags Architecture](./README.md)
- [Feature Catalog](./FEATURE_CATALOG.md)
- [Implementation Plan](./implementation-plan.md)
- [Database Schema](./database-schema.md)
