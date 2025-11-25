# User Context Data Transfer Objects

## Overview

This document describes the data structures used to represent user information and subscription status within the Telegram bot system. The User Context DTOs provide a standardized format for transferring user profile data and active subscription details between application layers, ensuring consistent access control and personalized user experiences.

## Primary Data Structure

### UserWithSubscriptions

The UserWithSubscriptions DTO represents the complete user profile including all active subscription relationships. This structure serves as the primary user context object throughout the application lifecycle.

**Structure Fields:**

- **telegramId** (number) - Unique identifier assigned by Telegram, serves as the primary key for user identification
- **username** (string | null) - Telegram username without the @ prefix; nullable as not all users configure usernames
- **firstName** (string | null) - User's first name from Telegram profile
- **lastName** (string | null) - User's last name from Telegram profile
- **lang** (string | null) - ISO 639-1 language code (e.g., 'en', 'ru', 'es') indicating user's preferred interface language
- **isPremium** (boolean) - Indicates whether the user has an active Telegram Premium subscription
- **isActive** (boolean) - Account status flag; false indicates a disabled or suspended account
- **createdAt** (Date) - Timestamp of initial user registration in the system
- **activeSubscriptions** (array) - Collection of ActiveSubscriptionDto objects representing all currently valid subscriptions

This structure is designed to provide complete user context in a single entity, eliminating the need for multiple database queries during request processing.

### ActiveSubscriptionDto

The ActiveSubscriptionDto represents an individual subscription relationship between a user and a subscription product. Each user can maintain multiple concurrent subscriptions.

**Structure Fields:**

- **id** (number) - Unique identifier for the subscription product (not the user-subscription relationship)
- **name** (string) - Human-readable subscription name displayed in user interfaces
- **type** (enum: 'signals' | 'broadcast') - Classification determining subscription behavior:
  - **signals**: Provides access to trading signal notifications
  - **broadcast**: Grants access to broadcast channel content
- **activatedAt** (Date) - Timestamp when this subscription was activated for the user
- **expiresAt** (Date | null) - Subscription expiration timestamp; null indicates a lifetime subscription without expiration
- **isActive** (boolean) - Current operational status; false indicates suspended or cancelled subscription

## Architecture and Data Flow

### Database Query Pattern

The system employs a single-query loading strategy using database joins to retrieve user data with associated subscriptions. When a user context is required:

1. Primary user record is queried from the users table by telegramId
2. A left join operation retrieves all related user_subscription records where isActive is true
3. Another left join fetches corresponding subscription product details
4. Results are aggregated into the UserWithSubscriptions structure

This approach minimizes database round-trips and provides O(1) query complexity regardless of subscription count.

### Context Lifecycle

User context follows a request-scoped lifecycle pattern:

1. **Context Loading**: Triggered by incoming Telegram updates (messages, callbacks, commands)
2. **Telegram ID Extraction**: Update payload is parsed to extract the initiating user's telegramId
3. **Data Retrieval**: Complete user context loaded via joined database query
4. **Context Injection**: UserWithSubscriptions object injected into request handlers
5. **Context Duration**: Persists for the duration of the request processing
6. **Context Invalidation**: Discarded after response is sent; no session caching

### Relationship Model

The data structures represent a one-to-many relationship:

- One User → Many UserSubscription relationships
- One Subscription Product → Many UserSubscription relationships
- UserSubscription acts as the junction entity linking Users and Subscriptions

## Access Control Patterns

### Subscription Presence Validation

The system evaluates the activeSubscriptions array to determine content access eligibility:

- **Empty array**: User has no active subscriptions; display upgrade prompts and restrict premium content
- **Non-empty array**: User has at least one active subscription; grant access to subscriber-only features

### Type-Based Filtering

Content delivery is filtered based on subscription type enumeration:

- **Signal Distribution**: Queries user contexts where activeSubscriptions contains at least one entry with type='signals'
- **Broadcast Delivery**: Targets users with activeSubscriptions entries where type='broadcast'
- **Multi-type Access**: Users can simultaneously access both signal and broadcast content if they hold subscriptions of both types

### Expiration Proximity Detection

The system calculates time-to-expiration for renewal notifications:

- Computes delta between current timestamp and expiresAt value
- Subscriptions with expiresAt <= (currentDate + 3 days) trigger warning notifications
- Null expiresAt values (lifetime subscriptions) bypass expiration logic entirely

### Multi-Subscription Handling

The architecture supports concurrent subscription scenarios:

- Users can maintain multiple active subscriptions of the same type
- Each subscription tracks independent activation and expiration timestamps
- Subscription access is evaluated using OR logic: access granted if ANY qualifying subscription exists
- Expiration of one subscription does not affect other active subscriptions

## Usage Contexts

### User Interaction Processing

When processing user commands or callbacks:

1. Request handler receives UserWithSubscriptions context via dependency injection
2. Handler logic accesses activeSubscriptions array for authorization decisions
3. Response content is tailored based on subscription presence and type
4. User preferences (lang, isPremium) customize presentation format

### Status Display Generation

For subscription status commands:

1. Iterate through activeSubscriptions array
2. Format each entry with name and expiration information
3. Display "Lifetime" label for entries where expiresAt is null
4. Sort by expiration date (nearest first) for user convenience

### Content Broadcasting

When distributing broadcast messages:

1. Query database for users with active broadcast-type subscriptions
2. Filter recipients where activeSubscriptions contains type='broadcast' and isActive=true
3. Further filter by specific subscription.id if targeting a particular broadcast channel
4. Deliver content only to matched user set

### Signal Distribution

For trading signal delivery:

1. Identify signal subscription holders via type='signals' filter
2. Extract recipient list from filtered user contexts
3. Deliver signal content to all qualified users
4. Non-subscribers receive promotional upgrade messaging instead

## Performance Characteristics

### Query Optimization

- **Single Query Loading**: User and subscriptions fetched in one database operation using JOIN clauses
- **Index Utilization**: telegramId indexed for fast user lookups
- **Eager Loading**: Subscription data loaded proactively to avoid N+1 query problems
- **Result Set Size**: Subscriptions per user typically limited (1-10 range), maintaining manageable payload sizes

### Caching Strategy

The system does NOT implement user context caching between requests:

- Each request triggers fresh database query for current state
- Ensures real-time accuracy for subscription status changes
- Eliminates cache invalidation complexity
- Acceptable performance due to optimized single-query pattern

### Scalability Considerations

- Database indexes on telegramId and subscription relationship foreign keys ensure O(log n) lookup performance
- Subscription count per user bounded by business rules, preventing unbounded array growth
- Query complexity remains constant regardless of total user base size

## Testing Scenarios

### Profile Data Integrity

- **User with Complete Profile**: Verify all fields (firstName, lastName, username, lang) populate correctly
- **User with Partial Profile**: Confirm nullable fields handle null values appropriately
- **User Language Preference**: Validate lang field drives correct interface language selection
- **Premium Status Display**: Ensure isPremium flag reflects Telegram Premium status accurately

### Subscription State Verification

- **No Active Subscriptions**: activeSubscriptions array should be empty; verify upgrade prompts display
- **Single Active Subscription**: Array contains exactly one entry; verify correct subscription details shown
- **Multiple Active Subscriptions**: Array contains multiple entries; verify complete list displayed in status commands
- **Expired Subscription Filtering**: Ensure expired subscriptions excluded from activeSubscriptions array

### Expiration Logic Testing

- **Lifetime Subscription**: expiresAt null value; verify no expiration warnings generated
- **Subscription Expiring Soon**: expiresAt within 3 days; confirm warning notification triggered
- **Subscription Expiring Later**: expiresAt beyond 3 days; verify no premature warnings
- **Expired Subscription**: expiresAt in past and isActive=false; confirm exclusion from active list

### Access Control Validation

- **Signal Content Access**: User with signals subscription receives trading signals; non-subscriber blocked
- **Broadcast Content Access**: User with broadcast subscription receives channel messages; non-subscriber excluded
- **Multi-Type Access**: User with both subscription types receives both content categories
- **Subscription Suspension**: isActive=false subscription does not grant access despite valid expiresAt date

### Multi-Subscription Scenarios

- **Independent Expiration**: One subscription expires; verify other subscriptions continue functioning
- **Duplicate Type Subscriptions**: User has two 'signals' subscriptions; verify access granted based on either
- **Mixed Expiration States**: User has mix of lifetime and expiring subscriptions; verify correct handling of each
- **Subscription Addition**: New subscription activated; verify immediate availability in next user context load

### Data Consistency Testing

- **User Not Found**: Invalid telegramId query; verify appropriate error handling
- **Database Join Integrity**: Verify orphaned subscription relationships don't appear in activeSubscriptions
- **Timestamp Accuracy**: Confirm createdAt, activatedAt, expiresAt values reflect UTC timestamps correctly
- **Boolean Flag States**: Validate isPremium and isActive flags represent true/false states accurately

## Integration Points

### Telegram Update Handler

The Update Handler middleware intercepts all incoming Telegram events and enriches them with user context:

- Extracts telegramId from update payload
- Loads UserWithSubscriptions from database
- Injects context into request scope for downstream handlers
- Handles cases where user doesn't exist (first-time interactions)

### Subscription Management Service

When subscriptions are created, modified, or expired:

- Database records updated in user_subscriptions table
- Changes immediately reflected in next user context load (no caching delay)
- Subscription service doesn't need to invalidate caches due to no-cache architecture

### Content Delivery Services

Signal and broadcast services query user contexts for recipient targeting:

- Leverage activeSubscriptions array for filtering
- Use type field for content categorization
- Respect isActive flag to exclude suspended subscriptions

### User Preference Management

User settings services rely on context for personalization:

- lang field determines message localization
- isPremium flag may unlock premium-specific features
- username availability affects display formats

## Business Logic Implications

### Subscription Model Flexibility

The DTO structure supports various business models:

- **Time-Limited Access**: Subscriptions with defined expiresAt dates
- **Lifetime Access**: Null expiresAt for perpetual subscriptions
- **Tiered Access**: Multiple subscription types with different content privileges
- **Bundled Subscriptions**: Users can hold concurrent subscriptions for comprehensive access

### Revenue Optimization

Expiration proximity detection enables proactive renewal campaigns:

- 3-day warning threshold allows timely upgrade prompts
- Subscription name and expiration visibility encourages renewals
- Multi-subscription support facilitates upselling opportunities

### User Experience Enhancement

Rich user context enables personalized interactions:

- Language preference drives localized messaging
- Subscription awareness prevents access frustration
- Clear status display builds trust and transparency

## Summary

The User Context DTOs provide a comprehensive, efficient data structure for managing user identity and subscription entitlements. The UserWithSubscriptions DTO consolidates profile information with active subscription details in a single query-optimized format, while ActiveSubscriptionDto captures granular subscription lifecycle data.

This architecture enables:

- **Efficient Data Access**: Single-query loading pattern minimizes database overhead
- **Flexible Access Control**: Type-based and expiration-based filtering supports diverse content strategies
- **Real-Time Accuracy**: No-cache approach ensures current subscription state always reflected
- **Multi-Subscription Support**: Array-based subscription collection accommodates complex user scenarios
- **Testable Design**: Clear data structure boundaries facilitate comprehensive testing coverage

The system balances performance optimization with real-time accuracy, providing a robust foundation for subscription-based content delivery and user personalization.
