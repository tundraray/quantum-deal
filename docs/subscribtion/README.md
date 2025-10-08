# Manual Subscription Broadcast Feature

## ⚠️ IMPLEMENTATION STATUS

**CRITICAL:** This feature is **NOT YET IMPLEMENTED** in the codebase. This documentation describes a planned feature that requires:

1. **Database schema changes** (see database-schema.md) - NOT YET APPLIED
2. **Repository extensions** - NOT YET IMPLEMENTED
3. **New services** - NOT YET CREATED (SubscriptionManagementService, BroadcastService, CodeGenerationService)
4. **Command handlers** - NOT YET ADDED to MasterbotUpdate

**To implement this feature:** Follow the implementation-plan.md document step-by-step, starting with Phase 1 (Database & Repository Layer).

---

## Overview

This feature enables managers to create custom subscriptions with unique invite links and broadcast messages to subscribers through the Master Bot. It extends the existing subscription system with manual subscription management and targeted messaging capabilities.

## CRITICAL: Two Subscription Types

The system now manages **TWO DISTINCT AND INDEPENDENT** subscription types:

### 1. Signals Subscriptions (`type: 'signals'`)
- **Purpose**: Automated trading signal distribution from trading platform
- **How it works**: Users subscribe → receive automated trading signals
- **Status**: Existing system, already implemented
- **NOT part of this feature**: Continues to operate independently
- **Manager interaction**: None through broadcast commands
- **One per user**: Via `users.subscribeId` field

### 2. Broadcast Subscriptions (`type: 'subscription_{uid}'`)
- **Purpose**: Manual broadcast of content by managers to specific groups
- **How it works**: Manager creates subscription → users join via invite link → manager broadcasts messages
- **Status**: NEW feature implemented by this architecture
- **Manager interaction**: Full control through `/subscription` command with menu-based navigation
- **Separation**: Completely independent from signals subscriptions
- **Dynamic Types**: Each subscription has unique type like `'subscription_V1StGXR8_Z'`
- **Multiple per user**: Users can subscribe to many via `codes` table

### Key Principle

**All manager broadcast commands ONLY work with broadcast subscriptions** (type LIKE 'subscription_%'). Signals subscriptions are never shown in broadcast command responses and cannot be closed or broadcasted to through manager commands. This ensures complete separation and prevents accidental interference with automated trading systems.

## Feature Components

### 1. Broadcast Subscription Management
- **Create Subscription**: Generate new **broadcast** subscriptions with dynamic types and unique invite codes
- **Close Subscription**: Deactivate **broadcast** subscriptions and prevent new joins
- **Subscription Status**: Track active/inactive **broadcast** subscription states
- **Type Safety**: All operations filtered to broadcast type pattern only

### 2. Broadcast System (Broadcast Subscriptions Only)
- **Targeted Broadcasting**: Send messages to specific **broadcast** subscription groups only
- **Recipient Counting**: Preview subscriber count before sending (broadcast subscribers only)
- **Confirmation Flow**: Confirm broadcast details before execution
- **Rate Limiting**: Respects Telegram API limits with queue management
- **Type Validation**: Prevents broadcasting to signals subscriptions

## User Flow

### Main Command: `/subscription`

Manager executes `/subscription` command, which displays a menu with three action buttons:
- **Создать подписку** (Create Subscription)
- **Закрыть подписку** (Close Subscription)
- **Отправить сообщение** (Broadcast Message)

### Creating a Broadcast Subscription

1. Manager executes `/subscription` command
2. Bot shows main menu with three buttons
3. Manager clicks **"Создать подписку"** button
4. Bot prompts for subscription name
5. Manager enters name (e.g., "VIP Market Analysis")
6. System creates **broadcast** subscription with dynamic type (e.g., `subscription_V1StGXR8_Z`) and generates unique invite code
7. Bot returns shareable invite link: `https://t.me/QuantumDealBot?start={CODE}`
8. **Note**: This creates a broadcast subscription, completely separate from signals subscriptions

### Closing a Broadcast Subscription

1. Manager executes `/subscription` command
2. Bot shows main menu with three buttons
3. Manager clicks **"Закрыть подписку"** button
4. Bot displays active **broadcast** subscriptions only as inline keyboard buttons
5. Manager selects broadcast subscription to close
6. Bot asks for confirmation
7. Upon confirmation, broadcast subscription is marked inactive
8. New users cannot join via the code
9. **Note**: Signals subscriptions are never shown in this list

### Broadcasting a Message to Broadcast Subscribers

1. Manager executes `/subscription` command
2. Bot shows main menu with three buttons
3. Manager clicks **"Отправить сообщение"** button
4. Bot displays active **broadcast** subscriptions only as inline keyboard
5. Manager selects target broadcast subscription
6. Bot prompts: "Enter your message"
7. Manager types message
8. Bot shows confirmation with recipient count (broadcast subscribers only)
9. Manager confirms or cancels
10. If confirmed, message is queued and sent to all broadcast subscribers
11. **Note**: Only broadcast subscriptions are shown; signals subscriptions cannot be broadcasted to through this command

## Technical Architecture

### Database Schema
- **subscriptions**: Extended with `type` field (varchar 50) for 'signals' or 'subscription_{uid}', and `isActive` flag
- **codes**: Links codes to subscriptions with manager tracking
- **users**: Subscription relationship via `subscribeId` for signals; broadcast via codes table
- **Type Separation**: Database enforces separation with CHECK constraint (signals OR LIKE 'subscription_%')
- **Dynamic Types**: Each broadcast subscription has unique type generated with nanoid

### Services (Type-Aware)
- **SubscriptionManagementService**: CRUD operations for **broadcast** subscriptions only
- **BroadcastService**: Message broadcasting logic (validates broadcast type)
- **CodeGenerationService**: Unique code generation and validation
- **Type Validation**: All services enforce broadcast type filtering (LIKE pattern)

### Controllers
- **MasterbotUpdate**: Extended with new command handlers
- **Scenes**: Optional scene-based flow for multi-step interactions

## Key Benefits

1. **Flexible Segmentation**: Create multiple subscription groups
2. **Controlled Access**: Generate time-limited or one-time codes
3. **Targeted Communication**: Send messages to specific subscriber groups
4. **Manager Tracking**: Full audit trail of who created subscriptions and codes
5. **Safe Broadcasting**: Preview and confirmation before sending

## Security Considerations

- Only authenticated managers can create/close subscriptions
- Only authenticated managers can broadcast messages
- Codes are unique and validated before activation
- Inactive subscriptions cannot receive new members
- Broadcast confirmations prevent accidental sends

## Related Documentation

- [Architecture](./architecture.md) - Technical architecture and design patterns
- [Database Schema](./database-schema.md) - Database structure and migrations
- [API Flows](./api-flows.md) - Detailed command flows and interactions
- [Implementation Plan](./implementation-plan.md) - Step-by-step development guide
- [Code Examples](./code-examples.md) - Reference code patterns

## Dependencies

- **NestJS**: Framework foundation
- **Telegraf**: Telegram bot library
- **Drizzle ORM**: Database operations
- **NotificationService**: Existing broadcast infrastructure
- **BottleNeck**: Rate limiting for Telegram API

## Configuration

No additional environment variables required. Uses existing bot configuration.

## Testing Strategy

- Unit tests for services (subscription CRUD, code generation)
- Integration tests for command flows
- E2E tests for full broadcast cycle
- Load tests for large subscriber lists

## Monitoring

- Track subscription creation/closure events
- Monitor broadcast success/failure rates
- Log manager actions for audit
- Alert on rate limit approaches
