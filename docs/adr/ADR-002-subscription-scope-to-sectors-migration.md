# ADR-002: Migration from subscriptions.scope to subscription_features.config.sectors

## Status

Accepted

## Context

The Quantum Deal platform needed to control signal filtering across different subscription tiers (Basic, VIP) and allow both system-controlled tier-based filtering and user-configurable preferences. Originally, the system used a `subscriptions.scope` field to define which market sectors (crypto, forex, stocks) a subscription could access.

### Problem with subscriptions.scope

The original single `scope` field had significant limitations:

1. **Tight Coupling**: Filtering behavior was directly tied to the subscription entity, making it difficult to extend or modify filtering logic
2. **Limited Extensibility**: Only one filtering dimension (scope) could be configured per subscription
3. **Feature Expansion Blocker**: Adding new filtering features required schema changes to the subscriptions table
4. **Monolithic Design**: All filtering configuration was in one place, preventing per-feature customization

This approach couldn't support the evolving requirement for multiple independent filtering features (tier-based and user-configurable) with different configuration needs.

## Decision

Migrate sector configuration from `subscriptions.scope` to `subscription_features.config.sectors` within the `TIER_BASED_FILTERING` feature configuration. The subscription_features table now serves as the central hub for feature-specific configurations.

### Key Implementation Details

1. **Schema Changes**:
   - Keep `subscriptions.scope` field marked as `@deprecated` (not removed for backward compatibility)
   - Store sector information in `subscription_features.config.sectors` as JSONB
   - The `TIER_BASED_FILTERING` feature holds the sectors array configuration

2. **Feature Configuration Structure**:
   ```typescript
   // TIER_BASED_FILTERING feature config
   {
     "sectors": ["crypto", "forex", "stocks"]
   }
   ```

3. **Migration Path**:
   - Existing subscriptions with non-null `scope` are migrated to new structure
   - Legacy `scope` field remains readable for backward compatibility during transition period
   - System prefers reading from `subscription_features.config.sectors`

4. **Deprecation Lifecycle**:
   - Phase 1 (Current): Both fields readable; new subscriptions use only subscription_features
   - Phase 2 (Future): Migration script makes scope read-only
   - Phase 3 (Later): Remove scope field entirely

## Rationale

### Options Considered

1. **Option A: Keep subscriptions.scope as primary storage**
   - Pros: No schema changes, backward compatible
   - Cons: Doesn't solve extensibility problem, prevents per-feature customization, inflexible for future features
   - Effort: 0 days (status quo)

2. **Option B: Create separate subscription_filters table**
   - Pros: Decouples filters from subscriptions, extensible
   - Cons: Introduces new table, adds complexity, doesn't integrate with feature flag system
   - Effort: 5 days

3. **Option C (Selected): Use subscription_features.config for sector storage**
   - Pros: Decouples filtering from subscription entity, integrates with feature system, enables per-feature configuration, supports future features without schema changes, JSONB provides flexibility
   - Cons: Requires migration of existing data, deprecation management needed
   - Effort: 3 days

### Comparison

| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| Extensibility | Very Low | High | High |
| Integration with Features | Poor | No | Excellent |
| Schema Complexity | Low | Medium | Low |
| Backward Compatibility | Excellent | Good | Good |
| Migration Effort | 0 days | 5 days | 3 days |
| Flexibility for New Features | Very Low | Medium | High |
| Data Consistency | Simple | Requires sync | ACID via FK |

## Consequences

### Positive Consequences

- **Decoupling**: Filtering configuration is now feature-specific, not subscription-specific
- **Extensibility**: New filtering features can be added without schema changes using JSONB
- **Per-Feature Customization**: Each feature can have its own configuration structure (sectors, symbols, etc.)
- **Feature Integration**: Sector-based filtering is now managed alongside other feature flags
- **Future-Proof**: The JSONB config field can evolve to support complex filtering rules
- **Data Integrity**: Foreign key constraints ensure referential integrity at the feature level
- **Flexibility**: Features can have different configurations for the same subscription

### Negative Consequences

- **Migration Overhead**: Existing data in `subscriptions.scope` must be migrated
- **Temporary Duplication**: During transition, sector data exists in both locations
- **Deprecation Management**: Must manage deprecated field lifecycle across versions
- **Read Path Complexity**: System must check both old and new locations during migration phase

### Neutral Consequences

- **Database Volume**: Slightly increased storage due to JSONB config field, but minimal impact
- **Query Pattern Change**: Filtering queries now join through subscription_features table instead of direct scope access

## Implementation Guidance

1. **Data Migration**:
   - Create migration script that reads from `subscriptions.scope` and writes to `subscription_features.config.sectors`
   - Run as part of deployment with zero-downtime approach
   - Validate migration completeness before cleanup phase

2. **Code Changes**:
   - Update feature configuration reading to use `subscription_features.config.sectors` as primary source
   - Implement fallback to `subscriptions.scope` during transition period for backward compatibility
   - Add helper function `getSectorConfig(subscription)` that handles both sources transparently

3. **Deprecation**:
   - Mark `subscriptions.scope` with `@deprecated` comment indicating new location
   - Add migration guide documentation
   - Plan removal timeline (e.g., 2 quarters after migration completion)

4. **Feature Design Principle**:
   - All feature configuration should follow this pattern: `subscription_features.config` for any per-subscription configuration
   - User-specific settings use `user_subscription_features.settings` JSONB field
   - Use this pattern for future feature additions

5. **Testing**:
   - Test both new and legacy code paths to ensure functionality parity
   - Verify migration data accuracy
   - Test fallback behavior when scope data exists but subscription_features doesn't

## Related Information

- **Prerequisite**: Feature Flags System architecture (defines FeatureFlag enum and subscription_features structure)
- **Related PRD**: `docs/prd/feature-flags-prd.md` - Defines TIER_BASED_FILTERING and CUSTOM_USER_FILTERING features
- **Implementation Location**:
  - `libs/db/src/schema/subscriptions.ts` - Deprecated scope field
  - `libs/db/src/schema/subscription-features.ts` - New config storage
- **Design Document**: `docs/design/feature-flags-design.md` - Comprehensive feature system design
- **Similar Pattern**: User-specific feature settings use `user_subscription_features.settings` JSONB (inverse of this pattern)

## Decision Record

| Attribute | Value |
|-----------|-------|
| **Decision Date** | 2025-11-25 |
| **Decision Status** | Accepted |
| **Implementation Status** | Completed |
| **Reviewed By** | Architecture Review |

## References

- Feature Flags PRD: Defines TIER_BASED_FILTERING feature configuration requirements
- Drizzle ORM Documentation: JSONB support in PostgreSQL with TypeScript type safety
