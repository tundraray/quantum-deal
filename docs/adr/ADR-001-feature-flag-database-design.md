# ADR-001: Feature Flag Database Design

## Status

Accepted

## Context

The quantum-deal bot needed a way to differentiate subscription tiers by controlling which filtering capabilities are available to users. The system required storing:

1. **Subscription-level feature availability**: Which features (TIER_BASED_FILTERING, CUSTOM_USER_FILTERING) are enabled for each subscription tier
2. **Feature configuration data**: Flexible configuration specific to each feature (e.g., sectors for tier-based filtering)
3. **User-level feature settings**: User-customizable settings for features they have access to (e.g., symbol selections for custom filtering)

The challenge was designing a database schema that provides flexibility for future feature additions while maintaining proper relational integrity and query performance.

## Decision

Implement a two-table design using dedicated tables with JSONB columns for flexible configuration:

- **subscription_features table**: Maps features to subscriptions with:
  - Primary key: `id` (bigint, auto-identity)
  - Foreign key: `subscription_id` references subscriptions(id) with CASCADE delete
  - String column: `feature_key` (varchar 100) for feature identifier
  - Boolean column: `is_enabled` for feature activation status
  - JSONB column: `config` for feature-specific configuration
  - Unique constraint: (subscription_id, feature_key)
  - Timestamps: created_at, updated_at

- **user_subscription_features table**: Stores user-specific settings for features with:
  - Primary key: `id` (serial)
  - Foreign key: `user_id` references users(telegram_id) with CASCADE delete
  - String column: `feature_key` (varchar 50) for feature identifier
  - JSONB column: `settings` for user feature-specific configuration
  - Boolean column: `is_active` for soft deletion support
  - Unique constraint: (user_id, feature_key)
  - Timestamps: created_at, updated_at

## Rationale

### Options Considered

1. **Single JSONB Column on Subscriptions Table**
   - Overview: Store all features as a single JSONB column (e.g., `features: {tier_based_filtering: {...}, custom_user_filtering: {...}}`) on the subscriptions table
   - Pros:
     - Simplest schema with minimal changes
     - No additional JOINs required when loading subscription data
     - All feature data co-located with subscription
   - Cons:
     - Cannot enforce uniqueness of feature per subscription at database level
     - Difficult to query specific features (requires JSONB operators)
     - Cannot enforce referential integrity on feature keys
     - Feature-specific indexes less efficient (GIN index on entire column)
     - Harder to analyze feature usage patterns in queries
     - Mixing structural (is_enabled) with flexible (config) data

2. **Separate Table Per Feature Type**
   - Overview: Create dedicated tables for each feature (tier_based_filtering_config, custom_user_filtering_config, etc.)
   - Pros:
     - Type-specific validation at database level
     - Clear, explicit schema for each feature
     - Simple queries for feature-specific data
   - Cons:
     - Requires schema changes for every new feature
     - Violates DRY principle with repeated patterns
     - More complex ORM/query logic to aggregate features
     - Performance degrades with many small tables
     - Future feature additions require migrations

3. **Dedicated Tables with JSONB for Configuration (Selected)**
   - Overview: Generic feature tables that store feature_key and flexible config/settings in JSONB columns
   - Pros:
     - Add new features without schema changes (only enum update)
     - Enforces database-level uniqueness: (subscription_id, feature_key)
     - Proper foreign key constraints with CASCADE semantics
     - GIN indexes on JSONB columns enable efficient queries
     - Flexible configuration per feature type
     - Clear separation: subscription-level vs user-level configuration
     - Easy to query features for analysis
     - Soft deletion via is_active flag enables settings preservation
   - Cons:
     - Requires extra JOINs to load features
     - JSONB validation must be handled in application code
     - Two tables instead of one for complete feature data
     - Feature key validation relies on enum/application layer

### Comparison Matrix

| Evaluation Axis | Single JSONB | Per-Feature Tables | Dedicated Tables (Selected) |
|-----------------|--------------|-------------------|----------------------------|
| Schema Flexibility | Low | Very Low | High |
| New Feature Addition | Code change + migration | Schema migration required | Code change only |
| Uniqueness Enforcement | No (app-level) | Yes | Yes (database-level) |
| Referential Integrity | Partial | Yes | Yes |
| Query Performance | Medium (JSONB scanning) | High | High (indexed JSONB) |
| Index Efficiency | Poor (entire column) | Good (type-specific) | Good (targeted JSONB) |
| Data Separation | Mixed | Separate | Separated by level |
| Migration Effort | Minimal | Medium | Low-Medium |
| Long-term Maintainability | Poor | Medium | High |
| Extensibility Score | 6/10 | 4/10 | 9/10 |

## Consequences

### Positive Consequences

- **Extensibility**: New feature flags can be added by updating the enum without database migrations
- **Data Integrity**: Database enforces unique (subscription_id, feature_key) and (user_id, feature_key) pairs
- **Referential Integrity**: CASCADE deletion ensures orphaned records are cleaned up automatically when subscriptions or users are deleted
- **Flexible Configuration**: JSONB columns support feature-specific configuration structures without schema changes (e.g., sectors array for TIER_BASED_FILTERING, symbols array for CUSTOM_USER_FILTERING)
- **Query Efficiency**: GIN indexes on JSONB columns enable efficient filtering and aggregation queries
- **Settings Preservation**: `is_active` flag allows soft deletion, enabling settings restoration on subscription upgrades
- **Clear Separation of Concerns**: subscription_features handles tier-level configuration, user_subscription_features handles user customization
- **Type Safety**: TypeScript enum (FeatureFlag) provides compile-time validation of valid feature keys

### Negative Consequences

- **Application Validation**: JSONB field validation cannot be enforced at database level, requiring application-layer type checking
- **Increased Joins**: Loading user features requires joining subscription_features and user_subscription_features tables
- **Feature Documentation**: Feature-specific JSONB schemas must be documented in code comments and design docs
- **Migration Complexity**: Migrating from deprecated subscriptions.scope field requires careful coordination
- **Operational Overhead**: Database administrators must understand JSONB handling for troubleshooting

### Neutral Consequences

- **Extra Tables**: Two new tables instead of modifying existing subscriptions table
- **Feature Key Duplication**: feature_key appears in both tables (acceptable trade-off for modularity)
- **ID Generation Strategy**: subscription_features uses bigint (matches subscription scale), user_subscription_features uses serial (independent sequence)

## Implementation Guidance

### Data Modeling Principles

- **Use TypeScript enums for feature keys** to prevent string typos and ensure type safety across the codebase
- **Document JSONB schemas** with TypeScript interfaces (FeatureConfig, UserFeatureSettings) in schema files
- **Leverage Drizzle's type inference** ($type<T>() for JSONB columns) to maintain type safety in queries

### Feature Configuration Design

- **Keep JSONB flexible**: Design feature configs as open Record<string, unknown> with typed interfaces as documentation
- **Maintain backward compatibility**: When adding new fields to feature configs, use optional properties
- **Version configs if complex**: For major feature changes, consider including a version field in JSONB

### Query Optimization

- **Create GIN indexes** on JSONB columns for features that are frequently filtered (recommended for future expansion)
- **Aggregate in application layer**: Feature merging and deduplication should happen in FeatureFlagService, not in complex SQL
- **Cache feature lookups**: Since features are relatively static per subscription, implement application-level caching

### Migration Strategy

- **Parallel operation**: Both subscriptions.scope (old) and subscription_features.config.sectors (new) work during transition period
- **Seed on activation**: When subscriptions are activated/created, automatically create subscription_features records
- **Preserve settings**: When users upgrade/downgrade, use is_active flag instead of deletion
- **Deprecation timeline**: Mark subscriptions.scope as deprecated; remove after all data migrated

### Database Constraints

- **Always use CASCADE delete** on foreign keys to subscriptions and users to maintain referential integrity
- **Enforce unique constraints** at database level: (subscription_id, feature_key) and (user_id, feature_key)
- **Use generated always as identity** for bigint PKs (matches subscriptions table pattern)
- **Set non-null constraints** on structural fields (feature_key, is_enabled, is_active) but allow NULL JSONB configs

## Related Information

- **Design Document**: `docs/design/feature-flags-design.md` - Complete system design with integration points and data flows
- **Schema Implementation**:
  - `libs/db/src/schema/subscription-features.ts` - Feature enumeration and subscription_features table
  - `libs/db/src/schema/user-subscription-features.ts` - user_subscription_features table
- **Feature Flag PRD**: `docs/prd/feature-flags-prd.md` - Product requirements and acceptance criteria
- **Database Repository**: `libs/db/src/repositories/subscription-features.repository.ts` - Data access layer

## Decision Record

**Decision Date**: 2025-11-25
**Decision Status**: Accepted (implementation complete)
**Reviewed By**: Architecture team
