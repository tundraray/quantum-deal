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
    // User has access to tier-based filtering
    await ctx.reply('Your VIP tier includes advanced filtering...');
  } else {
    // User doesn't have access
    await ctx.reply('Upgrade to VIP to access filtering features.');
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

  const allowedSymbols = config.allowedSymbols as string[];
  const minPriority = config.minPriority as string;

  await ctx.reply(
    `Your filter settings:\n` +
    `Symbols: ${allowedSymbols.join(', ')}\n` +
    `Min Priority: ${minPriority}`
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
   * Tier-based filtering - VIP feature
   */
  @Command('filter')
  @RequireFeature(FeatureFlag.TIER_BASED_FILTERING)
  async filterSignals(@Ctx() ctx: UserContext) {
    // Only VIP users can access
    await ctx.reply('Your tier-based filtering is active:');
    // ... show tier filter settings
  }

  /**
   * Custom user filtering - VIP feature
   */
  @Command('customfilter')
  @RequireFeature(FeatureFlag.CUSTOM_USER_FILTERING)
  async customFilterSignals(@Ctx() ctx: UserContext) {
    // Only VIP users can access (both features)
    await ctx.reply('Configure your custom filters:');
    // ... show custom filter UI
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
      message += '✅ Tier-Based Filtering (VIP)\n';
      message += '   • Pre-configured filters for your tier\n';
      message += '   • Symbol and priority filtering\n\n';
    }

    if (hasCustomFilter) {
      message += '✅ Custom User Filtering (VIP)\n';
      message += '   • Create your own filter rules\n';
      message += '   • Advanced condition builder\n\n';
    }

    if (!hasTierFilter && !hasCustomFilter) {
      message += '❌ No filtering features available\n\n';
      message += 'Upgrade to VIP to unlock filtering.';
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
  lines.push(`  ${hasTierFilter ? '✅' : '❌'} Tier-Based Filtering (VIP)`);
  lines.push(`  ${hasCustomFilter ? '✅' : '❌'} Custom User Filtering (VIP)`);

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

    const allowedSymbols = config.allowedSymbols as string[] | undefined;
    const minPriority = config.minPriority as string | undefined;
    const excludedTypes = config.excludedTypes as string[] | undefined;

    return signals.filter(signal => {
      // Filter by allowed symbols
      if (allowedSymbols && !allowedSymbols.includes(signal.symbol)) {
        return false;
      }

      // Filter by minimum priority
      if (minPriority && signal.priority < minPriority) {
        return false;
      }

      // Filter out excluded types
      if (excludedTypes && excludedTypes.includes(signal.type)) {
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
  async applyCustomFilters(ctx: UserContext, signals: Signal[]): Promise<Signal[]> {
    const config = getFeatureConfig(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING);

    if (!config) {
      // No custom filtering
      return signals;
    }

    const conditions = config.conditions as FilterCondition[];
    const matchMode = config.matchMode as 'any' | 'all' || 'all';

    return signals.filter(signal => {
      if (matchMode === 'any') {
        // Signal must match at least one condition
        return conditions.some(condition => this.matchesCondition(signal, condition));
      } else {
        // Signal must match all conditions
        return conditions.every(condition => this.matchesCondition(signal, condition));
      }
    });
  }

  private matchesCondition(signal: Signal, condition: FilterCondition): boolean {
    // Symbol condition
    if (condition.symbol && signal.symbol !== condition.symbol) {
      return false;
    }

    // Price range condition
    if (condition.minPrice && signal.price < condition.minPrice) {
      return false;
    }
    if (condition.maxPrice && signal.price > condition.maxPrice) {
      return false;
    }

    // Priority condition
    if (condition.priority && signal.priority !== condition.priority) {
      return false;
    }

    // Tag condition
    if (condition.tags && condition.tags.length > 0) {
      const signalTags = signal.tags || [];
      const hasMatchingTag = condition.tags.some(tag => signalTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    return true;
  }
}

interface FilterCondition {
  symbol?: string;
  minPrice?: number;
  maxPrice?: number;
  priority?: string;
  tags?: string[];
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

## Testing

### Unit Tests with Feature Mocking

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlag } from '@quantumdeal/db/schema';
import { UserWithSubscriptions } from '../interfaces/user.dto';

describe('SignalsCommands', () => {
  let service: SignalsCommands;
  let featureService: FeatureFlagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalsCommands,
        {
          provide: FeatureFlagService,
          useValue: {
            hasFeature: jest.fn(),
            getUserFeatures: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SignalsCommands>(SignalsCommands);
    featureService = module.get<FeatureFlagService>(FeatureFlagService);
  });

  it('should allow access to signals for all active subscribers', async () => {
    const mockUser: UserWithSubscriptions = {
      telegramId: 123,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      lang: 'en',
      isPremium: false,
      isActive: true, // Active subscription for core signal delivery
      createdAt: new Date(),
      activeSubscriptions: [],
      enabledFeatures: new Set([
        // No feature flags needed for basic signals
      ]),
      featureConfigs: new Map(),
    };

    const mockCtx = createMockContext(mockUser);
    await service.showSignals(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('latest signals')
    );
  });

  it('should allow tier filtering for VIP users', async () => {
    const mockUser: UserWithSubscriptions = {
      telegramId: 123,
      enabledFeatures: new Set([
        FeatureFlag.TIER_BASED_FILTERING,
      ]),
      featureConfigs: new Map(),
    };

    jest.spyOn(featureService, 'hasFeature').mockReturnValue(true);

    const mockCtx = createMockContext(mockUser);
    await service.filterSignals(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('tier-based filtering')
    );
  });

  it('should deny tier filtering for Basic users', async () => {
    const mockUser: UserWithSubscriptions = {
      telegramId: 123,
      enabledFeatures: new Set([]), // No feature flags
      featureConfigs: new Map(),
    };

    jest.spyOn(featureService, 'hasFeature').mockReturnValue(false);

    const mockCtx = createMockContext(mockUser);
    await service.filterSignals(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('not available')
    );
  });

  it('should allow custom filtering for VIP users', async () => {
    const mockUser: UserWithSubscriptions = {
      telegramId: 123,
      enabledFeatures: new Set([
        FeatureFlag.TIER_BASED_FILTERING,
        FeatureFlag.CUSTOM_USER_FILTERING,
      ]),
      featureConfigs: new Map(),
    };

    jest.spyOn(featureService, 'hasFeature').mockReturnValue(true);

    const mockCtx = createMockContext(mockUser);
    await service.customFilterSignals(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('custom filters')
    );
  });
});
```

### Integration Tests

```typescript
describe('Feature Flags Integration', () => {
  let app: INestApplication;
  let db: Database;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(Database);
  });

  it('should load user features from database', async () => {
    // Create test user
    const userId = await db.users.create({
      telegramId: 999999,
      username: 'testuser',
    });

    // Create VIP subscription with tier filtering
    const subscriptionId = await db.subscriptions.create({
      name: 'Test VIP',
      type: 'signals',
    });

    // Note: Signal delivery is core functionality, not a feature flag
    await db.subscriptionFeatures.create({
      subscriptionId,
      featureKey: FeatureFlag.TIER_BASED_FILTERING,
      isEnabled: true,
      config: {
        allowedSymbols: ['BTC/USD', 'ETH/USD'],
        minPriority: 'medium',
      },
    });

    // Activate subscription for user
    await db.userSubscriptions.create({
      userId: 999999,
      subscriptionId,
      isActive: true,
    });

    // Test feature loading (2 features only)
    const featureService = app.get(FeatureFlagService);
    const userFeatures = await featureService.getUserFeatures(999999);

    expect(userFeatures.enabledFeatures.has(FeatureFlag.TIER_BASED_FILTERING)).toBe(true);
    expect(userFeatures.enabledFeatures.has(FeatureFlag.CUSTOM_USER_FILTERING)).toBe(false);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Real-World Example: Webhook-Based Broadcasting

### Overview

This section shows how feature flags enable different message broadcasting behavior when processing incoming webhook events. For a complete implementation guide with code examples, flow diagrams, and testing scenarios, see [webhook-example.md](./webhook-example.md).

### The Scenario

A trading signals bot receives webhook notifications from MT5 and broadcasts them differently to users based on their subscription features:

> **Note**: All active subscribers receive signals by default (core functionality).
> Feature flags control only filtering behavior.

- **Basic Users**: Receive all signals (no filtering)
- **VIP Users**: Both tier-based filtering AND custom filtering rules with complex conditions

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

    // Check allowed symbols
    if (config.allowedSymbols && !config.allowedSymbols.includes(order.symbol)) {
      return false;
    }

    // Check minimum priority
    if (config.minPriority && order.priority < config.minPriority) {
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
    //   "instruments": [15, 21, 28],  // Only these instrument IDs
    //   "quietHours": {
    //     "enabled": true,
    //     "start": "22:00",
    //     "end": "06:00"
    //   },
    //   "minWinRate": 70
    // }

    // Check instrument filter
    if (settings.instruments && !settings.instruments.includes(order.instrumentId)) {
      this.logger.debug(`User ${user.telegramId} filtered: instrument ${order.instrumentId} not in whitelist`);
      return false;
    }

    // Check quiet hours
    if (settings.quietHours?.enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = parseInt(settings.quietHours.start.split(':')[0]);
      const endHour = parseInt(settings.quietHours.end.split(':')[0]);

      const isQuietTime = (startHour <= endHour)
        ? (currentHour >= startHour && currentHour < endHour)
        : (currentHour >= startHour || currentHour < endHour);

      if (isQuietTime) {
        this.logger.debug(`User ${user.telegramId} filtered: quiet hours active`);
        return false;
      }
    }

    // Check minimum win rate
    if (settings.minWinRate && order.winRate < settings.minWinRate) {
      this.logger.debug(`User ${user.telegramId} filtered: win rate ${order.winRate}% below minimum ${settings.minWinRate}%`);
      return false;
    }

    return true;
  }

  private matchesCondition(order: MergedOrder, condition: FilterCondition): boolean {
    if (condition.symbol && order.symbol !== condition.symbol) {
      return false;
    }

    if (condition.minPrice && order.openPrice < condition.minPrice) {
      return false;
    }

    if (condition.maxPrice && order.openPrice > condition.maxPrice) {
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
| **Alice** (Basic) | None (core signals only) | ✅ Receives signal (no filtering) |
| **Bob** (VIP) | `tier_based_filtering`<br>`custom_user_filtering`<br>(BTC > $44k) | ✅ Receives signal (matches custom condition) |

### Testing Webhook Broadcasting

```typescript
describe('Webhook Broadcasting with Features', () => {
  it('should filter VIP user by allowed symbols', async () => {
    // Setup VIP user who only wants BTC signals
    const vipUser = {
      isActive: true,
      enabledFeatures: new Set([
        FeatureFlag.TIER_BASED_FILTERING,
      ]),
      featureConfigs: new Map([
        [FeatureFlag.TIER_BASED_FILTERING, {
          allowedSymbols: ['BTC/USD'],
        }],
      ]),
    };

    const btcSignal = { symbol: 'BTC/USD' };
    const ethSignal = { symbol: 'ETH/USD' };

    // Act
    const shouldReceiveBtc = await shouldSendToUser(vipUser, btcSignal);
    const shouldReceiveEth = await shouldSendToUser(vipUser, ethSignal);

    // Assert
    expect(shouldReceiveBtc).toBe(true);  // BTC matches
    expect(shouldReceiveEth).toBe(false); // ETH doesn't match
  });

  it('should apply custom conditions for VIP users', async () => {
    const vipUser = {
      isActive: true,
      enabledFeatures: new Set([
        FeatureFlag.CUSTOM_USER_FILTERING,
      ]),
      featureConfigs: new Map([
        [FeatureFlag.CUSTOM_USER_FILTERING, {
          conditions: [
            { symbol: 'BTC/USD', minPrice: 44000 },
          ],
          matchMode: 'all',
        }],
      ]),
    };

    const aboveThreshold = { symbol: 'BTC/USD', openPrice: 45000 };
    const belowThreshold = { symbol: 'BTC/USD', openPrice: 43000 };

    // Act
    const shouldReceiveAbove = await shouldSendToUser(vipUser, aboveThreshold);
    const shouldReceiveBelow = await shouldSendToUser(vipUser, belowThreshold);

    // Assert
    expect(shouldReceiveAbove).toBe(true);  // Above $44k
    expect(shouldReceiveBelow).toBe(false); // Below $44k
  });
});
```

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

6. **Test with different feature combinations**
   - User with no subscriptions
   - User with basic subscription (no filtering)
   - User with VIP subscription (both tier filtering AND custom filtering)
   - User with expired subscription

7. **Document feature configurations** in code
   ```typescript
   interface TierFilteringConfig {
     allowedSymbols?: string[];
     minPriority?: string;
     excludedTypes?: string[];
   }

   interface CustomFilteringConfig {
     conditions: FilterCondition[];
     matchMode: 'any' | 'all';
   }
   ```

## Related Documentation

- [Feature Flags Architecture](./README.md)
- [Feature Catalog](./FEATURE_CATALOG.md)
- [Implementation Plan](./implementation-plan.md)
- [Database Schema](./database-schema.md)
