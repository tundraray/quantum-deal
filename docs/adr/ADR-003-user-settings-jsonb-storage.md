# ADR-003: User Settings JSONB Storage Approach

## Status

Accepted

## Context

The Quantum Deal feature flags system needs to store user-specific configuration for features they have access to. VIP subscribers need to configure custom filtering preferences (specific instruments) that vary in structure between different features.

Key requirements:
- Store feature-specific settings that can vary in structure (e.g., CUSTOM_USER_FILTERING: { symbols: ['BTCUSD.a', 'EURUSD.a'] })
- Settings must be preserved when subscription downgrades for potential future upgrades
- Support future features without requiring schema changes
- Enable efficient querying of user settings by user and feature

## Decision

Use a JSONB column in the `user_subscription_features` table to store feature-specific user settings with the following characteristics:

1. **Storage Structure**:
   - Single `settings` JSONB column per user-feature combination
   - Feature-specific structure: `{ symbols: ['BTCUSD.a', 'EURUSD.a'] }` for CUSTOM_USER_FILTERING
   - Unique constraint on (user_id, feature_key) ensures one record per user per feature

2. **Data Model**:
   - Symbol names (not IDs) for portability across system updates
   - Empty symbols array (`[]`) means "receive all signals" (default behavior)
   - GIN index on settings JSONB for efficient querying
   - isActive flag for soft deletion on subscription downgrade

3. **Settings Preservation**:
   - When user downgrades subscription, settings remain in database with `isActive = false`
   - When user upgrades, settings are reactivated with `isActive = true`
   - Hard delete cascades from users table only (not on subscription changes)

## Rationale

### Options Considered

1. **Separate Table for Each Setting Type** (e.g., user_filter_settings, user_preferences_table)
   - Pros:
     - Type-safe at database schema level
     - Explicit column definitions per feature
     - Simpler SQL queries without nested JSON parsing
   - Cons:
     - Schema migration required for each new feature
     - Tight coupling between features and database schema
     - Requires ALTER TABLE operations (downtime risk)
     - Duplicate infrastructure (unique constraints, indexes, relationships) for each feature
   - Effort: 3 days per new feature

2. **Single key-value User Preferences Table** (key: string, value: string/text)
   - Pros:
     - Maximum flexibility for any feature
     - No schema changes needed for new features
     - Simple CRUD operations
   - Cons:
     - No type validation at database level
     - Value deserialization required in application code
     - Inefficient for querying settings (text parsing)
     - Loss of structure - symbols array would be stored as string
     - No schema documentation for settings format
   - Effort: 1 day initial, ongoing maintenance overhead

3. **JSONB Settings Column in user_subscription_features** (Selected)
   - Pros:
     - Combines flexibility with queryability
     - JSONB supports GIN indexes for efficient queries
     - Schema-agnostic - new features don't require migrations
     - Native PostgreSQL type support with Drizzle ORM
     - Single unified table for all user feature configurations
     - Type validation possible in application layer
     - JSONB supports containment operators (@>, @<) for filtering
     - One record per (user_id, feature_key) prevents duplicate configurations
   - Cons:
     - Requires application-level validation of settings structure
     - JSONB queries have slight performance overhead vs native columns
     - Developer must document setting schemas
   - Effort: 2 days

### Comparison

| Evaluation Axis | Separate Tables | Key-Value Table | JSONB Settings |
|---|---|---|---|
| Schema Flexibility | Low (migration per feature) | High | High |
| Query Performance | High (native columns) | Low (text parsing) | Medium (GIN index) |
| Type Safety | High (schema validation) | None | Medium (application-level) |
| Migration Cost | 3 days/feature | 1 day setup | 2 days setup |
| Maintenance Burden | High (schema drift) | Medium | Low |
| Future-Proof | Poor (expensive changes) | Good | Excellent |
| Implementation Complexity | Medium | Low | Low |

**Trade-off Analysis**:
- Separate tables offer type safety but at high cost of schema rigidity
- Key-value approach offers flexibility but sacrifices queryability and type safety
- JSONB provides optimal balance: flexibility for future features + queryability + reasonable type safety through application validation

## Consequences

### Positive Consequences

- **Schema Evolution**: New features can be added without database migrations or ALTER TABLE operations
- **Query Performance**: GIN index on JSONB provides efficient lookups for feature settings
- **Data Preservation**: Settings preserved on subscription downgrade via isActive flag enables future recovery
- **Type Safety**: Application-layer validation ensures settings conform to feature schemas
- **Scalability**: Single table design scales horizontally without increasing number of tables
- **Developer Experience**: Clear, documented JSONB structure for each feature enables predictable implementation

### Negative Consequences

- **Database Validation**: Settings validation occurs in application code, not at database constraint level
- **Query Complexity**: Retrieving specific settings requires JSONB operators rather than simple column selection
- **Documentation Burden**: Feature-specific setting schemas must be documented in code comments
- **Developer Responsibility**: Developers must ensure settings match expected schema; typos not caught by database

### Neutral Consequences

- **Symbol-based Storage**: Using symbol names instead of IDs adds application responsibility for name-to-ID mapping when filtering signals
- **Default Behavior Convention**: Empty symbols array convention (receive all signals) must be documented and consistently applied

## Implementation Guidance

### Data Contract for JSONB Settings

Each feature defines its settings structure as a TypeScript type in the schema:

```typescript
// Example for CUSTOM_USER_FILTERING
type CustomUserFilteringSettings = {
  symbols: string[]; // Array of instrument symbols, empty = receive all
};
```

### Validation Pattern

Feature-specific validation should follow this pattern:
1. Verify user has access to the feature (hasFeature check)
2. Parse and validate JSONB structure using feature-specific validator
3. Persist using upsert to handle create/update uniformly

### Indexing Strategy

- Ensure GIN index exists on settings column: `CREATE INDEX idx_user_subscription_features_jsonb ON user_subscription_features USING GIN (settings)`
- Index on (user_id, feature_key, is_active) for common queries: feature lookup for active users
- Query builder should use index-friendly patterns: `settings @> '{"symbols": [...]}' AND is_active = true`

### Feature Expansion

When adding new features:
1. Define settings type in schema file
2. Create repository method for feature-specific queries
3. Implement validation in UserSettingsService
4. Document default settings behavior
5. No database schema changes required

### Soft Delete Semantics

- `isActive = true`: User actively has this feature available
- `isActive = false`: User had feature but downgraded; settings preserved for future upgrade
- Queries should typically filter `WHERE is_active = true` unless explicitly retrieving inactive settings

## Related Information

### Related Documents
- PRD: `docs/prd/feature-flags-prd.md`
- Schema Definition: `libs/db/src/schema/user-subscription-features.ts`
- Service Implementation: `libs/bot/src/services/user-settings.service.ts`
- Database Repository: `libs/db/src/repositories/user-subscription-features.repository.ts`

### Database Schema

```sql
CREATE TABLE user_subscription_features (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_feature UNIQUE(user_id, feature_key)
);

CREATE INDEX idx_user_subscription_features_user_id ON user_subscription_features(user_id);
CREATE INDEX idx_user_subscription_features_jsonb ON user_subscription_features USING GIN(settings);
```

### Example Queries

```sql
-- Get active feature settings for user
SELECT settings FROM user_subscription_features
WHERE user_id = $1 AND feature_key = $2 AND is_active = true;

-- Find all users with specific symbol in custom filters
SELECT DISTINCT user_id FROM user_subscription_features
WHERE feature_key = 'custom_user_filtering'
  AND settings @> '{"symbols": ["BTCUSD.a"]}'
  AND is_active = true;

-- Deactivate all user's features on downgrade
UPDATE user_subscription_features
SET is_active = false, updated_at = NOW()
WHERE user_id = $1 AND feature_key = $2;
```

### Implementation Notes

- Settings are feature-specific and documented in the PRD
- Empty symbols array for CUSTOM_USER_FILTERING means "receive all signals" - this is the default behavior
- Application code is responsible for transforming JSONB to typed objects for validation
- Performance considerations: JSONB queries are generally < 1ms with proper indexing; cache layer can be added for high-volume features

## Decision Record

| Attribute | Value |
|-----------|-------|
| **Decision Date** | 2025-11-25 |
| **Decision Status** | Accepted |
| **Implementation Status** | Completed |
| **Reviewed By** | Architecture Review |

---

**Document Version**: 1.0
**Created**: 2025-11-25
**Author**: Architecture Decision Record
