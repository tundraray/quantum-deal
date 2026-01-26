# Feature Flags System

## Overview

The Feature Flags system provides fine-grained control over features available to users based on their subscription types and levels. This simplified system focuses on filtering capabilities for signal delivery.

> **Note**: Signal delivery is core functionality, not a feature flag. All active subscribers receive signals by default.

## Glossary

Quick reference for key terms used throughout this documentation:

| Term | Definition |
|------|------------|
| **Feature Flag** | Named capability that can be enabled for specific subscriptions |
| **Signal Delivery** | Core bot functionality (NOT a feature flag) - all active subscribers receive signals |
| **Subscription Features** | Set of features available for a specific subscription type/tier |
| **User Features** | Union of all features from a user's active subscriptions |
| **TIER_BASED_FILTERING** | System-controlled automatic filtering based on subscription tier (All tiers: Basic + VIP) |
| **CUSTOM_USER_FILTERING** | User-configurable instrument filtering preferences (VIP only) |
| **Basic Tier** | Entry-level subscription with signal delivery + tier-based filtering |
| **VIP Tier** | Premium subscription with both filtering features enabled |
| **Settings JSONB** | JSON field in `user_subscription_features` storing feature-specific configuration |
| **Feature Template** | Predefined feature set for quick subscription creation (e.g., SIGNALS_VIP) |

## Quick Start Guide

### For Developers

1. Read this README (complete architecture overview)
2. Study [FEATURE_CATALOG.md](./FEATURE_CATALOG.md) - Complete 2-feature reference
3. Review [database-schema.md](./database-schema.md) - Database structure
4. Follow [implementation-plan.md](./implementation-plan.md) - Step-by-step implementation
5. Reference [examples.md](./examples.md) - Code patterns
6. Study [telegram-ui-flow.md](./telegram-ui-flow.md) - Telegram UI mockups
7. Keep [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Handy for daily use

**Estimated Reading Time**: 5-7 hours total
**Key Takeaway**: You'll have everything needed to implement the complete 2-feature system across 2 tiers.

### For Architects

1. Read this README (architecture and design sections)
2. Review [FEATURE_CATALOG.md](./FEATURE_CATALOG.md) - Feature specifications
3. Study [database-schema.md](./database-schema.md) - Data model
4. Review [implementation-plan.md](./implementation-plan.md) - Phases and timeline

**Estimated Reading Time**: 3-4 hours
**Key Takeaway**: You'll understand the complete system design and can evaluate architectural decisions.

### For Product/Sales Teams

1. Read [FEATURE_CATALOG.md](./FEATURE_CATALOG.md) - Complete 2-feature reference
2. Review subscription tier matrix - Feature availability by tier (Basic, VIP)
3. Check migration paths - Upgrade/downgrade scenarios
4. Study feature business value - Why customers need each feature

**Estimated Reading Time**: 2-3 hours
**Key Takeaway**: You'll know exactly what features exist, which tiers include them, and how to position them to customers.

### For QA Engineers

1. Read this README (use cases section)
2. Review [FEATURE_CATALOG.md](./FEATURE_CATALOG.md) - Feature specifications
3. Check [examples.md](./examples.md) - Testing section
4. Review [implementation-plan.md](./implementation-plan.md) - Testing sections in each phase
5. Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Troubleshooting guide

**Estimated Reading Time**: 3-4 hours
**Key Takeaway**: You'll know what scenarios to test and how to verify correct behavior.

## Key Features

The system supports **2 filtering features** across subscription tiers:

1. **TIER_BASED_FILTERING** - System-controlled filtering by subscription tier (All tiers: Basic + VIP)
2. **CUSTOM_USER_FILTERING** - User-configurable custom filtering rules (VIP only)

## Architecture

### High-Level Design

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
│  • Query feature flags from database                             │
│  • Cache results                                                 │
│  • Aggregate features from all active subscriptions              │
│  • Provide feature CRUD operations for managers                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User sends command → Middleware loads user data
                        ↓
2. Middleware fetches active subscriptions
                        ↓
3. FeatureFlagService aggregates features from all subscriptions
                        ↓
4. UserContext enriched with enabledFeatures Set
                        ↓
5. Command handler checks feature access
                        ↓
6. Execute business logic OR return "Feature not available"
```

### Detailed System Flow

Complete end-to-end flow from user command to feature check:

```
┌─────────────────────┐
│  Telegram User      │
│  Sends /filter      │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Telegraf Framework - Receives and routes command            │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  UserManagementMiddleware                                    │
│  1. Load user from database                                  │
│  2. Load active subscriptions                                │
│  3. Call FeatureFlagService.getUserFeatures(userId)          │
│  4. Attach UserWithFeatures to ctx.user                      │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  @RequireFeature Decorator (Applied to command handler)      │
│  FeatureGuard checks:                                        │
│  - Is user authenticated?                                    │
│  - Does user.enabledFeatures contain required feature?       │
│  - If NO: Return 403 / Send upgrade message                  │
│  - If YES: Continue to handler                               │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Command Handler                                             │
│  @Command('filter')                                          │
│  @RequireFeature(FeatureFlag.TIER_BASED_FILTERING)           │
│  // User is guaranteed to have TIER_BASED_FILTERING          │
│  // Show filter UI and process user selections               │
└──────────────────────────────────────────────────────────────┘
```

### Database Schema Relationships

> **⚠️ IMPORTANT - Field Deprecation**: The `subscriptions.scope` field is deprecated and will be removed in a future version. Sector filtering is now stored in `subscription_features.config.sectors`. See [database-schema.md](./database-schema.md#subscription-scope-migration) for migration details.

```
┌──────────────────────┐         ┌──────────────────────────┐
│      users           │         │     subscriptions        │
├──────────────────────┤         ├──────────────────────────┤
│ telegram_id (PK)     │         │ id (PK)                  │
│ username             │         │ name                     │
│ is_active            │         │ scope (DEPRECATED ⚠️)    │
│ created_at           │         │ type                     │
└──────────┬───────────┘         │ is_active                │
           │                     └───────────┬──────────────┘
           │                                 │
           │    ┌────────────────────────────┴───────────┐
           │    │                                        │
           │    ▼                                        ▼
           │  ┌──────────────────────────────────────────────────┐
           │  │          subscription_features                   │
           │  ├──────────────────────────────────────────────────┤
           │  │ id (PK)                                          │
           │  │ subscription_id (FK → subscriptions.id)          │
           └──│ feature_key: tier_based_filtering                │
              │            custom_user_filtering                 │
              │   Note: Signal delivery is core functionality    │
              │ is_enabled (boolean)                             │
              │ config (jsonb) ← sectors stored here            │
              └─────────────────┬────────────────────────────────┘
                                │
           ┌────────────────────┴────────────────────┐
           │                                         │
           ▼                                         ▼
  ┌─────────────────────────┐          ┌──────────────────────────┐
  │  user_subscriptions     │          │  user_subscription_      │
  ├─────────────────────────┤          │  features                │
  │ id (PK)                 │          ├──────────────────────────┤
  │ user_id (FK)            │          │ user_id (FK)             │
  │ subscription_id (FK)    │          │ feature_key              │
  │ is_active               │          │ settings (jsonb)         │
  └─────────────────────────┘          │ is_active                │
                                       └──────────────────────────┘
```

**Key Relationships:**
- **subscriptions** → **subscription_features**: Defines which features are available for each subscription tier
- **users** → **user_subscriptions** → **subscriptions**: Links users to their active subscriptions
- **users** → **user_subscription_features**: Stores user-specific settings for features they have access to

**For detailed database documentation, see:**
- [database-schema.md](./database-schema.md) - Complete schema, tables, indexes, migrations
- [database-schema.md#subscription-scope-migration](./database-schema.md#subscription-scope-migration) - Scope field deprecation details
- [database-schema.md#signal-broadcasting-with-feature-flags](./database-schema.md#signal-broadcasting-with-feature-flags) - Query patterns for signal broadcasting

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                          │
│  • Telegraf Commands, Scenes, UI                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Access Control Layer                         │
│  • @RequireFeature decorator, Guards, hasFeature() helpers       │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  • FeatureFlagService, UserManagementMiddleware                  │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Repository Layer                             │
│  • SubscriptionFeaturesRepository                                │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer                              │
│  • subscription_features, user_subscriptions, subscriptions      │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Database Layer

**subscription_features table** (Recommended Approach)
- Stores feature flags per subscription
- Flexible JSONB configuration per feature
- Easy to query and index
- Supports feature-specific settings

**user_subscription_features table**
- Stores user-specific settings for enabled features
- JSONB settings field for flexible configuration
- Links to users via telegram_id

**See comprehensive database documentation:**
- [database-schema.md](./database-schema.md) - Complete schema design, tables, indexes
- [database-schema.md#table-definitions](./database-schema.md#table-definitions) - Detailed SQL table definitions
- [database-schema.md#typescript-schema-drizzle-orm](./database-schema.md#typescript-schema-drizzle-orm) - TypeScript/Drizzle ORM schemas
- [database-schema.md#migration-scripts](./database-schema.md#migration-scripts) - Migration examples
- [database-schema.md#signal-broadcasting-with-feature-flags](./database-schema.md#signal-broadcasting-with-feature-flags) - Query patterns for broadcasting

### 2. Feature Flag Enumeration

```typescript
// Note: Signal delivery is core functionality, not a feature flag
enum FeatureFlag {
  // Filtering Features (2 features only)
  TIER_BASED_FILTERING = 'tier_based_filtering',
  CUSTOM_USER_FILTERING = 'custom_user_filtering',
}
```

### 3. Service Layer

**FeatureFlagService** (Read-Only)
- `isFeatureEnabled(userId, feature)`: Check if user has access to feature
- `getUserFeatures(userId)`: Get all features for a user
- `getSubscriptionFeatures(subscriptionId)`: Get features for a subscription

**Note**: The FeatureFlagService is READ-ONLY. Features are managed directly in the database via:
- Direct SQL queries
- Admin panel (external tool)
- Database migrations for feature rollouts

The bot only **reads** features for access control, it does not modify them.

### 4. Access Control

**@RequireFeature Decorator**
```typescript
@RequireFeature(FeatureFlag.TIER_BASED_FILTERING)
async handleFilterCommand(@Ctx() ctx: UserContext) {
  // Only accessible if user has tier_based_filtering feature
}
```

**hasFeature() Helper**
```typescript
if (hasFeature(ctx.user, FeatureFlag.CUSTOM_USER_FILTERING)) {
  // Show custom filtering options
}
```

### 5. User Context Enhancement

```typescript
interface UserWithFeatures extends UserWithSubscriptions {
  // Set of all enabled features from all active subscriptions
  enabledFeatures: Set<FeatureFlag>;

  // Map of feature-specific configurations
  featureConfigs: Map<FeatureFlag, FeatureConfig>;
}
```

## Benefits

### For Product Team
- **Clear Tier Differentiation**: Three distinct tiers with clear value progression
- **Simple Pricing**: Easy to explain feature differences to customers
- **Focused Development**: Concentrate on perfecting core features
- **Easy Management**: Simple feature matrix with minimal complexity

### For Development Team
- **Clean Code**: Feature checks are explicit and type-safe
- **Easy Testing**: Only 2 features to test across tiers
- **Simple Logic**: Straightforward filtering implementation

### For Users
- **Clear Value**: Easily understand what each tier offers
- **Upgrade Path**: Simple progression from Basic → VIP
- **Predictable Behavior**: Features work consistently

## Use Cases

### 1. Basic vs VIP Signals Subscription

> **Note**: Signal delivery is core functionality. All active subscribers receive signals.

**Basic Signals (Tier 1)**
```typescript
// Basic tier has tier-based filtering
const BASIC_SIGNALS_FEATURES = [
  FeatureFlag.TIER_BASED_FILTERING, // System-controlled sector filtering
];
```
- Receive all trading signals (core functionality)
- Tier-based filtering by subscription sectors
- System-controlled (user cannot configure)

**VIP Signals (Tier 2)**
```typescript
const VIP_SIGNALS_FEATURES = [
  FeatureFlag.TIER_BASED_FILTERING,   // System-controlled sector filtering
  FeatureFlag.CUSTOM_USER_FILTERING,  // User-configurable instrument selection
];
```
- Core signal delivery (automatic)
- Tier-based filtering (system-controlled by subscription sectors)
- Custom user filtering (user chooses specific instruments)

### 2. Feature-Specific Configuration

**Tier-Based Filtering Config** (Subscription-level)
```typescript
// Configured in subscription_features.config
{
  feature: FeatureFlag.TIER_BASED_FILTERING,
  config: {
    sectors: ['crypto', 'forex', 'stocks']  // Subscription sectors
  }
}
```

**Custom User Filtering Settings** (User-level)
```typescript
// Configured in user_subscription_features.settings
{
  feature: FeatureFlag.CUSTOM_USER_FILTERING,
  settings: {
    symbols: ['GBPUSD.a', 'EURUSD.a', 'BTCUSD.a']  // User-selected symbols
  }
}
```

## Feature Templates

Pre-configured feature sets for quick subscription creation:

```typescript
// Note: Signal delivery is core functionality, not a feature flag
const FEATURE_TEMPLATES = {
  // Signals Subscriptions
  SIGNALS_BASIC: {
    name: 'Basic Signals',
    features: [
      FeatureFlag.TIER_BASED_FILTERING, // Tier-based sector filtering
    ],
  },

  SIGNALS_VIP: {
    name: 'VIP Signals',
    features: [
      FeatureFlag.TIER_BASED_FILTERING,   // Tier-based sector filtering
      FeatureFlag.CUSTOM_USER_FILTERING,  // Custom instrument selection
    ],
  },
};
```

## Caching Strategy

1. **User Context Cache**
   - Cache features in user session/context
   - Duration: 15 minutes or until subscription change
   - Invalidate on subscription activation/deactivation

2. **Database Query Optimization**
   - Load features with subscriptions in single JOIN query
   - Index on `subscription_id` and `feature_key`
   - Use database connection pooling

3. **Redis Cache (Optional)**
   ```typescript
   // Cache key pattern
   const cacheKey = `user:${userId}:features`;

   // TTL: 15 minutes
   await redis.setex(cacheKey, 900, JSON.stringify(features));
   ```

**For detailed caching and query optimization strategies, see:**
- [database-schema.md#caching-strategy](./database-schema.md#caching-strategy) - Complete caching patterns
- [database-schema.md#common-read-queries-used-by-bot](./database-schema.md#common-read-queries-used-by-bot) - Optimized query examples

## Security Considerations

1. **Access Control**
   - Only managers can modify feature flags
   - Audit log for all feature changes
   - Validate feature keys against enum

2. **Validation**
   - Validate feature keys exist before setting
   - Validate JSON configuration schema
   - Prevent feature removal if users are using it

3. **Audit Trail**
   ```typescript
   interface FeatureFlagAudit {
     id: number;
     subscriptionId: number;
     featureKey: string;
     action: 'enabled' | 'disabled' | 'configured';
     oldConfig?: FeatureConfig;
     newConfig?: FeatureConfig;
     changedBy: number; // manager telegram ID
     changedAt: Date;
   }
   ```

## Migration Strategy

See [implementation-plan.md](./implementation-plan.md) for detailed migration steps.

**High-Level Steps:**
1. Create feature flags database schema
2. Migrate existing subscription types to feature sets
3. Update UserContext to include enabledFeatures
4. Implement FeatureFlagService
5. Add feature checks to existing commands
6. Test with pilot users
7. Full rollout

## Best Practices

### For Developers

1. **Always use enum for feature keys**
   ```typescript
   // Good
   if (hasFeature(user, FeatureFlag.TIER_BASED_FILTERING)) { }

   // Bad - string literals are error-prone
   if (hasFeature(user, 'tier_based_filtering')) { }
   ```

2. **Check features at handler level**
   ```typescript
   // Good - early check with decorator
   @RequireFeature(FeatureFlag.CUSTOM_USER_FILTERING)
   async handleCustomFilter() { }

   // Avoid - checking deep in business logic
   async processRequest() {
     // ... 100 lines of code
     if (!hasFeature(user, FeatureFlag.CUSTOM_USER_FILTERING)) {
       throw new Error('No access');
     }
   }
   ```

3. **Fail gracefully**
   ```typescript
   // Show feature-specific UI only if available
   const buttons = [baseButtons];

   if (hasFeature(user, FeatureFlag.TIER_BASED_FILTERING)) {
     buttons.push(tierFilterButton);
   }

   if (hasFeature(user, FeatureFlag.CUSTOM_USER_FILTERING)) {
     buttons.push(customFilterButton);
   }
   ```

4. **Cache feature checks in tight loops**
   ```typescript
   // Cache outside loop
   const hasCustomFilter = hasFeature(user, FeatureFlag.CUSTOM_USER_FILTERING);

   for (const signal of signals) {
     if (hasCustomFilter) {
       signal.applyCustomFilters();
     }
   }
   ```

### For Product Team

1. **Document features clearly**
   - What does the feature do?
   - Which subscription tiers include it?
   - Any configuration options?

2. **Test before enabling**
   - Enable for test accounts first
   - Verify feature works as expected
   - Monitor for errors

3. **Communicate changes**
   - Notify users when features are added
   - Explain upgrade paths
   - Provide documentation

## Testing

### Unit Tests

```typescript
describe('FeatureFlagService', () => {
  it('should return true for enabled feature', async () => {
    const hasAccess = await service.isFeatureEnabled(
      userId,
      FeatureFlag.TIER_BASED_FILTERING
    );
    expect(hasAccess).toBe(true);
  });

  it('should aggregate features from multiple subscriptions', async () => {
    const features = await service.getUserFeatures(userId);
    expect(features).toContain(FeatureFlag.TIER_BASED_FILTERING);
  });
});
```

### Integration Tests

```typescript
describe('Feature Access Control', () => {
  it('should block access to disabled feature', async () => {
    const response = await request(app)
      .post('/webhook/filter')
      .send({ userId: basicUser.id });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Feature not available');
  });
});
```

## Related Documentation

### Which Document Should I Read?

Use this decision tree to quickly find the right documentation:

| Question | Document to Read | Why |
|----------|-----------------|-----|
| ❓ "What is this feature flags system?" | This README | High-level overview and business context |
| 🗄️ "How do I set up the database?" | [database-schema.md](./database-schema.md) | Complete schema, migrations, and seed data |
| 👨‍💻 "How do I implement this?" | [implementation-plan.md](./implementation-plan.md) | Step-by-step guide with 4 phases |
| 📋 "What features are available?" | [FEATURE_CATALOG.md](./FEATURE_CATALOG.md) | Complete reference for all 2 features |
| 💻 "Show me code examples" | [examples.md](./examples.md) | Copy-paste ready code snippets |
| 📱 "How does the Telegram UI work?" | [telegram-ui-flow.md](./telegram-ui-flow.md) | UI mockups and navigation flows |
| ⚡ "I need a quick reference" | [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Cheat sheet for common tasks |
| 🐛 "Something isn't working" | [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#troubleshooting) | Troubleshooting guide |
| 🚀 "I'm new here" | This README + [Glossary](#glossary) | Start here for navigation |

### Complete Feature Reference
- **[FEATURE_CATALOG.md](./FEATURE_CATALOG.md)** - Detailed specifications for both features
  - Complete tier matrix (Basic vs VIP)
  - Configuration options and interfaces
  - Migration paths between tiers

### Implementation Guides
- **[implementation-plan.md](./implementation-plan.md)** - Step-by-step implementation (4 phases, 1 week)
  - Pre-Migration Checklist for database safety
  - Phase 1: Database schema and repositories
  - Phase 2: Service layer and DTOs
  - Phase 3: Access control (decorators, guards)
  - Phase 4: Integration and rollout
- **[database-schema.md](./database-schema.md)** - Database design and migrations
  - Table definitions and relationships
  - Migration scripts
  - Query examples

### Code Examples
- **[examples.md](./examples.md)** - Copy-paste ready code snippets
  - Feature checks and guards
  - Conditional UI patterns
  - Testing examples

### UI Implementation
- **[telegram-ui-flow.md](./telegram-ui-flow.md)** - Telegram bot UI mockups
  - ASCII mockups for all screens
  - Navigation flow diagrams
  - Telegraf scene implementation

### Quick References
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Developer cheat sheet
  - Troubleshooting Index for common issues
  - Quick code snippets
  - Database queries
- See [Architecture](#architecture) and [Glossary](#glossary) sections above

## FAQ

**Q: Can a user have features from multiple subscriptions?**
A: Yes, features are aggregated (union) from all active subscriptions.

**Q: What happens if a feature is removed from a subscription?**
A: Users with that subscription will lose access immediately. Implement graceful degradation.

**Q: Can features have configuration beyond boolean flags?**
A: Yes, use the `config` JSONB field for feature-specific settings (e.g., filter rules, options).

**Q: How do I add a new feature flag?**
A: Add to `FeatureFlag` enum, update feature templates, no database migration needed.

**Q: Should I use decorator or helper function for feature checks?**
A: Use `@RequireFeature` for enforcing access, use `hasFeature()` for conditional UI/logic.


## Support

For questions or issues with the feature flags system:
- Review the [examples documentation](./examples.md)
- Check the [implementation plan](./implementation-plan.md)
- Check the [feature catalog](./FEATURE_CATALOG.md)
- Contact the development team
