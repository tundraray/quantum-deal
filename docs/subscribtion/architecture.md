# Technical Architecture

## System Overview

The manual subscription broadcast feature follows NestJS clean architecture principles with clear separation of concerns across modules, services, and repositories.

## CRITICAL: Two Subscription Types Architecture

This system manages **TWO DISTINCT AND INDEPENDENT** subscription types:

### Two Subscription Types - AS-IS (Current State)

#### 1. Signals Subscriptions (`type: 'signals'`)
- **Purpose**: Automated trading signal distribution
- **Source**: Trading platform
- **Existing System**: Already implemented
- **User Flow**: Users subscribe → receive automated trading signals
- **NOT affected by this feature**: Continues to operate independently
- **AS-IS Storage**: ONE per user via `users.subscribeId` field (one-to-one relationship)

#### 2. Broadcast Subscriptions (`type: 'subscription_{uid}'`)
- **Purpose**: Manual broadcast of content by managers to specific groups
- **Source**: Manager-initiated via bot commands
- **NEW Feature**: Implemented by this architecture
- **User Flow**: Manager creates subscription → users join via invite link → manager broadcasts messages
- **Isolation**: Only interacts with broadcast subscriptions, never signals subscriptions
- **Dynamic Type**: Each subscription has unique type like `'subscription_V1StGXR8_Z'`
- **AS-IS Storage**: Via `codes` table (userId + activationDate + expirationDate)

### Two Subscription Types - TO-BE (After Migration)

#### 1. Signals Subscriptions (`type: 'signals'`)
- **TO-BE Storage**: MULTIPLE per user via `user_subscriptions` table (many-to-many relationship)
- **Migration**: Data moved from `users.subscribeId` → `user_subscriptions`

#### 2. Broadcast Subscriptions (`type: 'subscription_{uid}'`)
- **TO-BE Storage**: MULTIPLE per user via `user_subscriptions` table (many-to-many relationship)
- **Migration**: Data moved from `codes.userId/activationDate/expirationDate` → `user_subscriptions`
- **Unified Architecture**: Same table as signals subscriptions

### Architectural Separation Principle

**All broadcast commands MUST filter by `type LIKE 'subscription_%'`**:
- `/subscription` menu → "Создать подписку" action → Creates ONLY broadcast subscriptions
- `/subscription` menu → "Закрыть подписку" action → Shows/closes ONLY broadcast subscriptions
- `/subscription` menu → "Отправить сообщение" action → Sends to ONLY broadcast subscriptions

**Signals subscriptions remain untouched** by manager broadcast commands.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   MasterbotUpdate (Command Handlers)                 │   │
│  │   - /subscription (main menu command)                │   │
│  │   - @Action('subscription_create')                   │   │
│  │   - @Action('subscription_close')                    │   │
│  │   - @Action('subscription_broadcast')                │   │
│  │   - Other Callback Query Handlers                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌────────────────────┐  ┌────────────────────────────┐     │
│  │ Subscription       │  │ Broadcast                  │     │
│  │ ManagementService  │  │ Service                    │     │
│  │ - create()         │  │ - sendBroadcast()          │     │
│  │ - close()          │  │ - countSubscribers()       │     │
│  │ - getActive()      │  │ - validateMessage()        │     │
│  │ - getById()        │  └────────────────────────────┘     │
│  └────────────────────┘                                      │
│                                                               │
│  ┌────────────────────┐                                      │
│  │ Code               │                                      │
│  │ GenerationService  │                                      │
│  │ - generate()       │                                      │
│  │ - validate()       │                                      │
│  │ - ensureUnique()   │                                      │
│  └────────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Data Access Layer                        │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Subscriptions    │  │ Codes        │  │ Users        │  │
│  │ Repository       │  │ Repository   │  │ Repository   │  │
│  │ (Extended)       │  │ (Extended)   │  │ (Existing)   │  │
│  └──────────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        Database Layer                        │
│                    PostgreSQL + Drizzle ORM                  │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

### MasterbotModule (Extended)

**Location**: `libs/masterbot/src/masterbot.module.ts`

**New Providers**:
- `SubscriptionManagementService`
- `BroadcastService`
- `CodeGenerationService`

**Existing Providers** (Used):
- `MasterbotService`
- `MasterbotUpdate` (Extended)
- `SubscriptionsRepository` (Extended)
- `CodesRepository` (Extended)
- `UsersRepository`
- `NotificationService` (from BotModule)

**Dependencies**:
- `DbModule` (Database access)
- `FrameworkModule` (Utilities)
- `BotModule` (NotificationService)

## Service Design

### 1. SubscriptionManagementService

**Responsibilities**:
- Create new **BROADCAST** subscriptions with unique names and dynamic types
- Mark subscriptions as active/inactive
- Retrieve active **BROADCAST** subscriptions list (filtered by type pattern)
- Validate subscription ownership (future)
- **CRITICAL**: All operations must filter by `type LIKE 'subscription_%'`

**Interface**:
```typescript
interface ISubscriptionManagementService {
  createSubscription(name: string, managerId: number): Promise<CreateSubscriptionResult>;
  closeSubscription(subscriptionId: number, managerId: number): Promise<void>;
  getActiveBroadcastSubscriptions(): Promise<SubscriptionDto[]>; // UPDATED: only broadcast
  getSubscriptionById(id: number): Promise<SubscriptionDto | null>;
  validateSubscriptionName(name: string): boolean;
}
```

**Key Methods**:
- `createSubscription()`: Creates **broadcast** subscription with dynamic type (`subscription_{uid}`) + generates invite code
- `closeSubscription()`: Soft delete via `isActive` flag (validates it's broadcast type)
- `getActiveBroadcastSubscriptions()`: Filter by `type LIKE 'subscription_%' AND isActive = true`
- **Type Safety**: All methods ensure they only operate on broadcast subscriptions

### 2. CodeGenerationService

**Responsibilities**:
- Generate unique alphanumeric codes
- Validate code uniqueness
- Link codes to subscriptions and managers
- Generate shareable invite URLs

**Interface**:
```typescript
interface ICodeGenerationService {
  generateUniqueCode(subscriptionId: number, managerId: number): Promise<CodeDto>;
  validateCode(code: string): Promise<boolean>;
  getInviteUrl(code: string): Promise<string>;
}
```

**Key Methods**:
- `generateUniqueCode()`: 15-character alphanumeric code with collision check
- `validateCode()`: Check if code exists and is unused
- `getInviteUrl()`: Returns `t.me/{botUsername}?start={code}`

### 3. BroadcastService

**Responsibilities**:
- Count subscribers for **BROADCAST** subscriptions only
- Validate broadcast messages
- Queue messages via NotificationService
- Track broadcast status and errors
- **CRITICAL**: All operations validate subscription is broadcast type

**Interface**:
```typescript
interface IBroadcastService {
  countSubscribers(subscriptionId: number): Promise<number>;
  validateMessage(message: string): MessageValidationResult;
  sendBroadcast(subscriptionId: number, message: string, managerId: number): Promise<BroadcastResultDto>;
}
```

**Key Methods**:
- `countSubscribers()`: Count active users with **broadcast** subscription (validates type inline)
- `validateMessage()`: Check length, format, forbidden content
- `sendBroadcast()`: Queue messages via NotificationService (validates broadcast type inline)

## Data Transfer Objects (DTOs)

### Core DTOs

**SubscriptionDto**:
```typescript
interface SubscriptionDto {
  id: number;
  name: string;
  type: string; // 'signals' or 'subscription_{uid}' for broadcasts
  scope: string[] | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  closedBy?: number;
}
```

**CreateSubscriptionResult**:
```typescript
interface CreateSubscriptionResult {
  subscription: SubscriptionDto;
  code: CodeDto;
  inviteUrl: string;
}
```

**CodeDto**:
```typescript
interface CodeDto {
  id: number;
  code: string;
  subscriptionId: number;
  managerId: number;
  isActive: boolean;
  createdAt: Date;
}
```

**BroadcastResultDto**:
```typescript
interface BroadcastResultDto {
  queuedCount: number;
  errorCount: number;
  recipientCount: number;
  queuedIds: string[];
  errors: string[];
}
```

**MessageValidationResult**:
```typescript
interface MessageValidationResult {
  valid: boolean;
  error?: string;
}
```

## Data Flow

### Create Subscription Flow

```
Manager → /subscription → Clicks "Создать подписку" button
    ↓
MasterbotUpdate.onCreateSubscription() [@Action('subscription_create')]
    ↓
SubscriptionManagementService.createSubscription()
    ↓
    ├─→ SubscriptionsRepository.create()
    └─→ CodeGenerationService.generateUniqueCode()
            ↓
        CodesRepository.create()
            ↓
        Return invite URL
```

### Broadcast Flow

```
Manager → /subscription → Clicks "Отправить сообщение" button
    ↓
MasterbotUpdate.onBroadcast() [@Action('subscription_broadcast')]
    ↓
Show active subscriptions (inline keyboard)
    ↓
Manager selects subscription
    ↓
MasterbotUpdate.onSubscriptionSelected()
    ↓
Enter "waiting for message" state
    ↓
Manager sends message
    ↓
BroadcastService.countSubscribers()
    ↓
Show confirmation with count
    ↓
Manager confirms
    ↓
BroadcastService.sendBroadcast()
    ↓
    ├─→ UsersRepository.findBySubscription()
    └─→ NotificationService.addMessages()
            ↓
        Queue messages with rate limiting
```

## User Interface Flow

### Main Menu Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Manager Interface                            │
│                                                                       │
│  Command: /subscription                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  📋 Управление подписками                                    │    │
│  │                                                               │    │
│  │  Выберите действие:                                          │    │
│  │                                                               │    │
│  │  ┌───────────────────────────────────────────────────────┐  │    │
│  │  │  ➕ Создать подписку                                  │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────────────┐  │    │
│  │  │  🔒 Закрыть подписку                                  │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────────────┐  │    │
│  │  │  📢 Отправить сообщение                               │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│         │                     │                     │                │
│         ▼                     ▼                     ▼                │
│    Flow 1: Create        Flow 2: Close        Flow 3: Broadcast     │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 1: Create Subscription

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CREATE SUBSCRIPTION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

     Manager clicks "➕ Создать подписку"
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Request Name                                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  📝 Create New Subscription                                  │    │
│  │                                                               │    │
│  │  Please enter the subscription name:                         │    │
│  │                                                               │    │
│  │  Example: Premium Trading Signals                            │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  State: awaiting_subscription_name                                   │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼ Manager types: "Premium Trading Signals"
              │
┌─────────────────────────────────────────────────────────────────────┐
│  Step 2: Processing                                                  │
│                                                                       │
│  - Validate name (3-50 characters)                                   │
│  - Generate unique subscription type: subscription_V1StGXR8_Z        │
│  - Create subscription record                                        │
│  - Generate 15-char invite code: ABC123XYZ456DEF                     │
│  - Create invite URL: t.me/QuantumDealBot?start=ABC123XYZ456DEF     │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 3: Success Message                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  ✅ Subscription Created Successfully                        │    │
│  │                                                               │    │
│  │  📋 Name: Premium Trading Signals                            │    │
│  │  🆔 ID: 42                                                    │    │
│  │  📅 Created: 2025-10-08 14:30:00                             │    │
│  │                                                               │    │
│  │  🎫 Invite Link:                                             │    │
│  │  t.me/QuantumDealBot?start=ABC123XYZ456DEF                   │    │
│  │                                                               │    │
│  │  Share this link with users to join this subscription.       │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  State: null (flow completed)                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 2: Close Subscription

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLOSE SUBSCRIPTION FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

     Manager clicks "🔒 Закрыть подписку"
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Select Subscription                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  🔒 Close Subscription                                       │    │
│  │                                                               │    │
│  │  Select a subscription to close:                             │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │  Premium Trading Signals                            │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │  VIP Signals                                        │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │  Basic Package                                      │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │  🔙 Cancel                                          │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  Note: Only shows broadcast subscriptions (type LIKE 'subscription_%')│
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼ Manager clicks "Premium Trading Signals"
              │
┌─────────────────────────────────────────────────────────────────────┐
│  Step 2: Confirmation                                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  ⚠️ Confirm Closure                                          │    │
│  │                                                               │    │
│  │  Are you sure you want to close Premium Trading Signals?     │    │
│  │                                                               │    │
│  │  • New users cannot join                                     │    │
│  │  • Existing subscribers keep access                          │    │
│  │  • This action can be reversed later                         │    │
│  │                                                               │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐         │    │
│  │  │  ✅ Yes, Close       │  │  ❌ Cancel           │         │    │
│  │  └──────────────────────┘  └──────────────────────┘         │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼ Manager clicks "✅ Yes, Close"
              │
┌─────────────────────────────────────────────────────────────────────┐
│  Step 3: Processing                                                  │
│                                                                       │
│  - Update subscription: isActive = false                             │
│  - Set closedAt = current timestamp                                  │
│  - Set closedBy = manager's telegramId                               │
│  - Deactivate unused invite codes                                    │
│  - Log action                                                        │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 4: Success Message                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  ✅ Subscription Closed                                      │    │
│  │                                                               │    │
│  │  Premium Trading Signals has been closed.                    │    │
│  │                                                               │    │
│  │  No new users can join this subscription.                    │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 3: Broadcast Message

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BROADCAST MESSAGE FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

     Manager clicks "📢 Отправить сообщение"
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Select Subscription                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  📢 Broadcast Message                                        │    │
│  │                                                               │    │
│  │  Select a subscription to broadcast to:                      │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │  Premium Trading Signals (45 users)                 │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │  VIP Signals (12 users)                             │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │  🔙 Cancel                                          │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  Note: Only active broadcast subscriptions with subscribers shown    │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼ Manager clicks "Premium Trading Signals (45 users)"
              │
┌─────────────────────────────────────────────────────────────────────┐
│  Step 2: Enter Message                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  📝 Enter Broadcast Message                                  │    │
│  │                                                               │    │
│  │  Subscription: Premium Trading Signals                       │    │
│  │                                                               │    │
│  │  Type your message below.                                    │    │
│  │  Tip: You can use Markdown formatting                        │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  State: awaiting_broadcast_message                                   │
│  Session: { broadcastSubscriptionId: 42 }                            │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼ Manager types: "🚀 New trading signal available!"
              │
┌─────────────────────────────────────────────────────────────────────┐
│  Step 3: Validation & Preview                                        │
│                                                                       │
│  - Validate message length (max 4096 chars)                          │
│  - Count active subscribers                                          │
│  - Store message in session                                          │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 4: Confirmation Preview                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  📊 Broadcast Preview                                        │    │
│  │                                                               │    │
│  │  Subscription: Premium Trading Signals                       │    │
│  │  Recipients: 45 active users                                 │    │
│  │                                                               │    │
│  │  Message:                                                    │    │
│  │  🚀 New trading signal available!                            │    │
│  │                                                               │    │
│  │  Send this message?                                          │    │
│  │                                                               │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐         │    │
│  │  │  ✅ Send Now         │  │  ❌ Cancel           │         │    │
│  │  └──────────────────────┘  └──────────────────────┘         │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  State: confirming_broadcast                                         │
│  Session: { broadcastSubscriptionId: 42,                             │
│             broadcastMessage: "🚀 New trading signal..." }           │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼ Manager clicks "✅ Send Now"
              │
┌─────────────────────────────────────────────────────────────────────┐
│  Step 5: Processing                                                  │
│                                                                       │
│  - Get all active subscribers for subscription                       │
│  - Prepare message queue (45 messages)                               │
│  - Send to NotificationService.addMessages()                         │
│  - Apply rate limiting (28 msg/sec via Bottleneck)                   │
│  - Log broadcast action                                              │
│  - Clear session state                                               │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 6: Initial Confirmation                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  ⏳ Broadcast Queued                                         │    │
│  │                                                               │    │
│  │  Your message is being sent...                               │    │
│  │  This may take a few moments.                                │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼ (After processing completes)
              │
┌─────────────────────────────────────────────────────────────────────┐
│  Step 7: Completion Report                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                               │    │
│  │  ✅ Broadcast Completed                                      │    │
│  │                                                               │    │
│  │  Queued: 43 messages                                         │    │
│  │  Errors: 2                                                   │    │
│  │                                                               │    │
│  │  Messages are being delivered with rate limiting.            │    │
│  │                                                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  State: null (flow completed)                                        │
│  Session: cleared                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Session State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SESSION STATE TRANSITIONS                        │
└─────────────────────────────────────────────────────────────────────┘

CREATE FLOW:
    null  →  awaiting_subscription_name  →  null
             (waiting for name input)        (completed)

CLOSE FLOW:
    null  (no intermediate states)  →  null
    (selection and confirmation via callback queries)

BROADCAST FLOW:
    null  →  awaiting_broadcast_message  →  confirming_broadcast  →  null
             (waiting for message text)       (preview shown)         (completed)

SESSION DATA STRUCTURE:
{
  state: 'awaiting_subscription_name' |
         'awaiting_broadcast_message' |
         'confirming_broadcast' |
         null,

  // Broadcast context
  broadcastSubscriptionId: number | null,
  broadcastMessage: string | null,
}
```

## State Management

### Conversation State Pattern

For multi-step interactions (broadcast flow), use Telegraf scenes or custom state storage:

**Option 1: Scenes** (Recommended)
```typescript
@Scene('BROADCAST_SCENE')
export class BroadcastScene {
  @SceneEnter()
  async onEnter(ctx: UserContext) { }

  @On('text')
  async onMessage(ctx: UserContext) { }

  @Action('confirm_broadcast')
  async onConfirm(ctx: UserContext) { }
}
```

**Option 2: Context State**
```typescript
// Store in ctx.session
ctx.session.broadcastState = {
  subscriptionId: 123,
  step: 'waiting_for_message'
};
```

## Repository Extensions

### SubscriptionsRepository (Extended)

**New Methods** (with type filtering):
```typescript
// CRITICAL: Filter by broadcast type pattern
findActiveBroadcastSubscriptions(): Promise<Subscription[]>

// Type-aware operations
updateStatus(id: number, isActive: boolean): Promise<Subscription>
findByManager(managerId: number): Promise<Subscription[]> // Future

// Validation helpers
isBroadcastSubscriptionById(id: number): Promise<boolean>
```

**Type Safety**:
All repository methods that interact with broadcast commands MUST filter by `type LIKE 'subscription_%'` to maintain separation from signals subscriptions.

### CodesRepository (Extended)

**New Methods**:
```typescript
findBySubscription(subscriptionId: number): Promise<Code[]>
findActiveCodesBySubscription(subscriptionId: number): Promise<Code[]>
countCodesBySubscription(subscriptionId: number): Promise<number>
```

### UsersRepository (Existing)

**Used Methods**:
```typescript
findBySubscription(subscriptionId: number): Promise<User[]> // Already exists
findActiveUsers(): Promise<User[]> // Already exists
```

### UserSubscriptionsRepository (NEW - CRITICAL)

**Central repository for unified subscription management**

**Location**: `libs/db/src/repositories/user-subscriptions.repository.ts`

**Purpose**: Manages the many-to-many relationship between users and subscriptions, replacing:
- `users.subscribeId` (old signals subscription)
- `codes.userId` + activation/expiration data (old broadcast activations)

**New Methods**:
```typescript
// Create subscription relationship (activation)
async create(data: NewUserSubscription): Promise<UserSubscription>

// Find all user subscriptions (unified query - replaces multiple queries)
async findByUserId(userId: number): Promise<UserSubscription[]>

// Find subscriptions by type for a user
async findByUserIdAndType(userId: number, subscriptionType: string): Promise<UserSubscription[]>

// Find all subscribers for a subscription (replaces UsersRepository.findBySubscription)
async findBySubscriptionId(subscriptionId: number): Promise<UserSubscription[]>

// Check if user has active subscription
async isUserSubscribed(userId: number, subscriptionId: number): Promise<boolean>

// Activate subscription (create relationship)
async activate(
  userId: number,
  subscriptionId: number,
  expiresAt?: Date
): Promise<UserSubscription>

// Deactivate subscription
async deactivate(userId: number, subscriptionId: number): Promise<void>

// Find expiring subscriptions (replaces UsersRepository.findUsersWithExpiringSubscriptions)
async findExpiring(daysFromNow: number, subscriptionType?: string): Promise<Array<{
  user: User;
  subscription: Subscription;
  userSubscription: UserSubscription;
}>>
```

**Key Patterns:**

```typescript
// Unified query example - get all user subscriptions with JOIN
const subscriptions = await this.db
  .select({
    userSubscription: userSubscriptions,
    subscription: subscriptions,
  })
  .from(userSubscriptions)
  .innerJoin(subscriptions, eq(subscriptions.id, userSubscriptions.subscriptionId))
  .where(
    and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.isActive, true)
    )
  );
```

**Replaces:**
- `UsersRepository.findBySubscription()` → Use `findBySubscriptionId()` then JOIN with users
- `UsersRepository.findUsersWithExpiringSubscriptions()` → Use `findExpiring()`

**Naming Convention**:
- Repository methods use `find*` prefix (data access layer)
- Service methods use `get*` prefix (business logic layer)

## Error Handling Strategy

### Service Layer Errors

**Custom Exceptions**:
- `SubscriptionNotFoundException`
- `DuplicateSubscriptionNameException`
- `CodeGenerationFailedException`
- `InvalidMessageException`
- `BroadcastFailedException`

**Error Handler**:
```typescript
@Catch()
export class BroadcastExceptionFilter implements ExceptionFilter {
  catch(exception: Error, ctx: TelegrafContext) {
    // Log to Sentry
    // Send user-friendly message
  }
}
```

### Telegram API Errors

- Handle blocked users gracefully
- Retry on rate limit errors
- Log failed sends for analysis

## Transaction Management

### Critical Operations

Operations requiring transactions:
1. **Create Subscription + Code**: Ensure both succeed or rollback
2. **Close Subscription**: Update subscription + invalidate codes

**Pattern**:
```typescript
await this.subscriptionsRepository.transaction(async (tx) => {
  const subscription = await tx.insert(subscriptions).values({...}).returning();
  const code = await tx.insert(codes).values({...}).returning();
  return { subscription, code };
});
```

## Integration Points

### NotificationService Integration

The BroadcastService leverages the existing `NotificationService` for:
- Rate-limited message queuing
- Retry logic for failed sends
- Telegram API error handling
- Bottleneck queue management

**Usage**:
```typescript
const result = await this.notificationService.addMessages(
  subscribers.map(user => ({
    userId: user.telegramId,
    message: broadcastMessage,
    options: {
      priority: MessagePriority.NORMAL,
      messageType: QueuedMessageType.MARKDOWN
    }
  }))
);
```

## Performance Considerations

### Scalability

1. **Large Subscriber Lists**: Batch processing via NotificationService
2. **Code Generation**: In-memory cache for recently generated codes
3. **Active Subscriptions Query**: Add database index on `isActive`
4. **Broadcast Status**: Real-time updates via WebSocket (future)

### Caching Strategy

- Cache active subscriptions for 5 minutes
- Cache subscriber counts for 1 minute
- Invalidate on subscription updates

## Security Architecture

### Authorization

- Manager authentication via existing middleware
- Action logging via MasterbotService
- Subscription ownership validation (future enhancement)

### Input Validation

- DTOs with class-validator decorators
- Message length limits (Telegram max: 4096 chars)
- Sanitize HTML/Markdown in messages
- Prevent code injection in subscription names

### Rate Limiting

- Per-manager command rate limits
- Global broadcast rate limits
- Leverage existing Telegram API limits via NotificationService

## Monitoring & Observability

### Logging

- All manager actions logged via `MasterbotService.logManagerAction()`
- Broadcast events logged with metadata
- Error tracking via Sentry

### Metrics

Key metrics to track:
- Subscription creation rate
- Active subscriptions count
- Broadcast success/failure rate
- Average broadcast size (recipients)
- Code generation failures

### Alerts

- High broadcast failure rate (>5%)
- Code generation failures
- Rate limit approaches
- Subscription creation spikes

## Testing Strategy

### Unit Tests

- Service methods with mocked repositories
- Code generation uniqueness validation
- Message validation logic
- Error handling scenarios

### Integration Tests

- Full command flows with test database
- Transaction rollbacks on errors
- Repository method interactions

### E2E Tests

- Complete broadcast cycle
- Subscription lifecycle (create → use → close)
- Error scenarios (blocked users, rate limits)

## Future Enhancements

1. **Scheduled Broadcasts**: Send messages at specific times
2. **Broadcast Templates**: Save and reuse message templates
3. **Analytics Dashboard**: Track subscription engagement
4. **Subscription Ownership**: Multi-manager support
5. **Broadcast History**: View past broadcasts
6. **Message Preview**: Preview before sending
7. **Subscriber Import/Export**: CSV import/export
8. **Webhook Triggers**: Auto-broadcast on events
