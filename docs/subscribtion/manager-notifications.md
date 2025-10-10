# Manager Notification on Subscription Code Activation

## Overview

When a user activates a subscription code, the system automatically sends a notification to the manager who created the code. This provides real-time feedback to managers about code usage and user subscription activations.

## Implementation Status

✅ **IMPLEMENTED** - October 10, 2025

## Features

### 1. Automatic Manager Notification

When a subscription code is successfully activated:
1. The system identifies the manager who created the code using the `managerId` field from the codes table
2. Generates a formatted notification message with activation details
3. Sends the notification via the `NotificationService` with normal priority
4. Message includes user info, subscription details, and expiration date

### 2. Notification Message Format

The notification uses Markdown formatting and includes:

```
✅ *Subscription Activated*

👤 User: @username (or "John Doe" or "User 123456789")
📋 Subscription: Premium Signals
🏷️ Type: signals subscription (or "broadcast group")
📅 Valid until March 15, 2025
🎫 Code: `ABC123XYZ456DEF`
```

### 3. User Display Logic

The notification intelligently displays user information in priority order:
- **If username exists**: Shows `@username`
- **Else if firstName exists**: Shows the user's first name
- **Otherwise**: Shows `User {telegramId}` using the Telegram user ID

### 4. Subscription Type Detection

The system automatically detects and labels subscription types:
- **Signals subscriptions**: Identified by type value 'signals' and labeled as "signals subscription"
- **Broadcast subscriptions**: Identified by type values starting with 'subscription_' and labeled as "broadcast group"

The system uses the `isBroadcastSubscription()` helper function to determine the subscription category.

## Technical Implementation

### Modified Components

#### 1. BotService (`libs/bot/src/bot.service.ts`)

**Dependencies Added**:
The BotService now integrates with:
- `NotificationService` - for sending messages to managers
- `MessagePriority` and `QueuedMessageType` interfaces - for configuring notification delivery
- Subscription type detection utilities from the database schema layer

**Service Constructor**:
The service now receives `NotificationService` as a dependency alongside existing repositories (UsersRepository, CodesRepository, SubscriptionsRepository, UserSubscriptionsRepository) and the LLMService.

**activateCode Method**:

This method has been enhanced to include manager notification functionality. The method now:

1. **Returns Activation Results**: Provides a result object containing the user record and, if a code was activated, the subscription details including the subscription object and expiration date

2. **Sends Manager Notifications**: After successful activation, if the code has an associated manager:
   - Determines the subscription type label (broadcast group vs signals subscription)
   - Formats the user display name based on availability of username, firstName, or falls back to Telegram ID
   - Formats the expiration date in long format (e.g., "March 15, 2025") or displays "permanently" for codes without expiration
   - Constructs the formatted notification message with all relevant details
   - Queues the notification through the NotificationService with normal priority and Markdown formatting
   - Attaches metadata for tracking (activation type, user ID, subscription ID, code ID)

#### 2. Welcome Prompt (`libs/bot/src/promts/welcome.ts`)

**Enhanced Welcome Message**:

The welcome message prompt has been updated to incorporate subscription information:
- Displays congratulatory message for newly activated subscriptions
- Lists all currently active subscriptions for the user
- Differentiates between signals subscriptions and broadcast group subscriptions
- Shows expiration dates for time-limited signals subscriptions
- Provides appropriate messaging based on subscription status

#### 3. UserSubscriptionsRepository (`libs/db/src/repositories/user-subscriptions.repository.ts`)

**New Query Method**:

A new method `findActiveByUserIdWithSubscription()` has been added that:
- Accepts a user's Telegram ID as input
- Returns an array of active subscription records joined with full subscription details
- Each result contains both the user subscription record (activation date, expiration, status) and the subscription record (name, type, configuration)
- Performs an efficient database JOIN operation to fetch both tables in a single query
- Filters results to only include active subscriptions for the specified user

This method enables efficient retrieval of all relevant subscription data needed for welcome messages and user context.

#### 4. BotService onStart Method

**Enhanced User Onboarding Flow**:

The `onStart` method orchestrates the user welcome experience and has been updated to:

1. **Handle Code Activation**: If a subscription code is provided, activates it and stores the result; otherwise proceeds with existing user data

2. **Fetch Active Subscriptions**: Retrieves all active subscriptions for the user using the new repository method, providing complete subscription details

3. **Build Context Data**: Constructs a comprehensive data object for the AI prompt containing:
   - User information (Telegram ID, username, first name, last name, language preference)
   - List of all active subscriptions with their details (name, type, activation date, expiration date, category flags)
   - Information about the just-activated subscription if applicable (subscription details, expiration, type classification)

4. **Generate Welcome Message**: Sends the context data to the LLM service to generate a personalized welcome message using the gpt-5-mini model and the welcome system prompt

## Message Flow

```
User activates code
    ↓
BotService.onStart(user, code)
    ↓
BotService.activateCode(user, code)
    ↓
1. Validate code exists and unused
2. Validate subscription exists and active
3. Mark code as used (codes.userId, codes.activationDate)
4. Activate subscription (user_subscriptions table)
5. Send manager notification ← NEW
    ↓
NotificationService.addMessage()
    ↓
Message queued with Bottleneck
    ↓
Manager receives Telegram notification
```

## Data Included in Notification Metadata

The notification includes metadata for tracking and analytics purposes. This metadata object contains:

- **type**: Set to 'subscription_activation' to identify this notification category
- **userId**: The Telegram ID (numeric) of the user who activated the code
- **subscriptionId**: The internal database ID (numeric) of the activated subscription
- **codeId**: The internal database ID (numeric) of the code that was used

This metadata can be used for:
- Analytics tracking and reporting
- Debugging activation issues
- Linking notifications to specific activations in the database
- Future reporting and dashboard features
- Audit trail and compliance purposes

## NotificationService Integration

The implementation uses the existing `NotificationService` which provides:
- **Rate limiting**: Bottleneck with 28 messages/second cap
- **Priority queuing**: Normal priority for activation notifications
- **Retry logic**: Automatic retries for failed sends (up to 3 attempts)
- **Error handling**: Permanent error detection (blocked users, etc.)
- **Markdown formatting**: Properly escaped MarkdownV2 for Telegram

Message priority: `MessagePriority.NORMAL` (processed in order, not urgent)

## Benefits

### For Managers
1. **Real-time feedback**: Know immediately when codes are activated
2. **User tracking**: See which users activated which codes
3. **Subscription monitoring**: Track which subscriptions are being used
4. **Expiration awareness**: See when each activation expires

### For the System
1. **Audit trail**: All activations logged via notification metadata
2. **Efficient notification**: Leverages existing NotificationService infrastructure
3. **Type safety**: Proper TypeScript types throughout
4. **Clean separation**: Manager notifications don't affect user flow

## Testing Scenarios

### Scenario 1: User with Username
```
Input: User @johndoe activates code ABC123
Output: "👤 User: @johndoe"
```

### Scenario 2: User without Username
```
Input: User "John Doe" (no username) activates code ABC123
Output: "👤 User: John Doe"
```

### Scenario 3: User with No Name Data
```
Input: User 123456789 (no username, no firstName) activates code ABC123
Output: "👤 User: User 123456789"
```

### Scenario 4: Signals Subscription
```
Input: Signals subscription activated
Output: "🏷️ Type: signals subscription"
Output: "📅 Valid until October 10, 2025"
```

### Scenario 5: Broadcast Subscription
```
Input: Broadcast subscription activated
Output: "🏷️ Type: broadcast group"
Output: "📅 Valid until October 10, 2025"
```

### Scenario 6: Code Without Manager
```
Input: Code has no managerId (legacy code)
Result: No notification sent (silent success)
```

## Error Handling

The notification is non-blocking:
- If notification fails, user activation still succeeds
- Errors logged via NotificationService
- Permanent errors (blocked manager) handled gracefully
- Retry logic for transient failures

## Future Enhancements

Potential improvements:
1. **Manager preferences**: Allow managers to opt-out of activation notifications
2. **Batch notifications**: Group multiple activations in one message
3. **Analytics dashboard**: Track activation rates per manager
4. **Custom messages**: Allow managers to customize notification format
5. **Multi-language**: Detect manager language preference

## Related Features

- **Welcome message**: Now includes subscription info (see `welcome.ts`)
- **User subscriptions**: Fetched via new `findActiveByUserIdWithSubscription()` method
- **Subscription expiration**: 30 days from activation (configurable in future)

## Architecture Impact

This feature maintains clean architecture principles:
- **Single Responsibility**: `activateCode` handles activation, `NotificationService` handles delivery
- **Dependency Injection**: `NotificationService` injected via constructor
- **Type Safety**: Proper TypeScript types for all data
- **Error Isolation**: Notification failures don't affect activation success
- **Separation of Concerns**: Manager notifications separate from user flow
