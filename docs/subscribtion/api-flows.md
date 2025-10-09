# API Flows and Command Interactions

## ⚠️ IMPLEMENTATION STATUS

**CRITICAL:** The command flows described in this document are **NOT YET IMPLEMENTED**. This is a design specification for the planned feature.

**Current Reality:**
- ❌ `/subscription` command - DOES NOT EXIST in MasterbotUpdate
- ❌ Action handlers (subscription_create, subscription_close, subscription_broadcast) - NOT IMPLEMENTED
- ❌ Session state management for broadcast flows - NOT CONFIGURED
- ✅ Base command pattern (MasterbotUpdate with @Command, @Action decorators) - EXISTS and is CORRECT

**To implement:** Follow implementation-plan.md Phase 3 (Command Handlers & UI) after completing Phases 1 and 2.

---

## Overview

This document details the step-by-step flows for each command and user interaction in the subscription broadcast feature.

## Command Flows

### Main Menu Flow

**Command**: `/subscription`

**User Journey**:
```
Manager → /subscription
    ↓
Bot: "📋 Управление подписками

      Выберите действие:"
      [Создать подписку] [Закрыть подписку] [Отправить сообщение]
```

**Detailed Flow**:

1. **Command Handler**: `MasterbotUpdate.onSubscriptionMenu()`
   ```typescript
   @Command('subscription')
   async onSubscriptionMenu(@Ctx() ctx: UserContext): Promise<void> {
     // 1. Validate manager
     if (!ctx.manager) {
       await ctx.reply('❌ Authentication required.');
       return;
     }

     // 2. Show main menu with inline keyboard
     await ctx.reply(
       '📋 *Управление подписками*\n\n' +
       'Выберите действие:',
       {
         parse_mode: 'Markdown',
         reply_markup: {
           inline_keyboard: [
             [
               { text: '➕ Создать подписку', callback_data: 'subscription_create' },
             ],
             [
               { text: '🔒 Закрыть подписку', callback_data: 'subscription_close' },
             ],
             [
               { text: '📢 Отправить сообщение', callback_data: 'subscription_broadcast' },
             ],
           ],
         },
       }
     );
   }
   ```

---

### 1. Create Subscription Flow

**Trigger**: User clicks **"Создать подписку"** button from menu

**User Journey**:
```
Manager → /subscription → Clicks "Создать подписку"
    ↓
Bot: "Please enter the subscription name:"
    ↓
Manager: "Premium Trading Signals"
    ↓
Bot: "✅ Subscription created successfully!
      📋 Name: Premium Trading Signals
      🎫 Invite Link: https://t.me/QuantumDealBot?start=ABC123XYZ456DEF
      🔗 Share this link with users to join this subscription."
```

**Detailed Flow**:

1. **Callback Handler**: `MasterbotUpdate.onCreateSubscription()`
   ```typescript
   @Action('subscription_create')
   async onCreateSubscription(@Ctx() ctx: UserContext): Promise<void> {
     // 1. Validate manager
     if (!ctx.manager) {
       await ctx.reply('❌ Authentication required.');
       return;
     }

     // 2. Edit message to show prompt
     await ctx.editMessageText(
       '📝 *Create New Subscription*\n\n' +
       'Please enter the subscription name:\n\n' +
       '_Example: Premium Trading Signals_',
       { parse_mode: 'Markdown' }
     );

     // 3. Set conversation state
     ctx.session.state = 'awaiting_subscription_name';
     ctx.session.commandContext = 'create_subscription';

     // 4. Answer callback query
     await ctx.answerCbQuery();
   }
   ```

2. **Text Message Handler**: Handle subscription name input
   ```typescript
   @On('text')
   async onText(@Ctx() ctx: UserContext): Promise<void> {
     if (ctx.session.state !== 'awaiting_subscription_name') return;

     const name = ctx.message.text.trim();

     // 3. Validate name
     if (!this.subscriptionService.validateSubscriptionName(name)) {
       await ctx.reply('❌ Invalid name. Please use 3-50 characters.');
       return;
     }

     // 4. Create subscription + code
     try {
       const result = await this.subscriptionService.createSubscription(
         name,
         ctx.manager.telegramId
       );

       // 5. Reset state
       ctx.session.state = null;

       // 6. Send success message with invite link
       await ctx.reply(
         '✅ *Subscription Created Successfully*\n\n' +
         `📋 **Name:** ${result.subscription.name}\n` +
         `🆔 **ID:** ${result.subscription.id}\n` +
         `📅 **Created:** ${new Date().toLocaleString()}\n\n` +
         `🎫 **Invite Link:**\n\`${result.inviteUrl}\`\n\n` +
         `Share this link with users to join this subscription.`,
         { parse_mode: 'Markdown' }
       );
     } catch (error) {
       await ctx.reply('❌ Failed to create subscription. Please try again.');
     }
   }
   ```

**Service Implementation**:
```typescript
async createSubscription(name: string, managerId: number): Promise<CreateSubscriptionResult> {
  // Use transaction to ensure atomicity: if code generation fails, subscription is rolled back
  return await this.subscriptionsRepository.transaction(async (tx) => {
    // 1. Generate unique subscription type
    const subscriptionType = generateBroadcastSubscriptionType(); // e.g., 'subscription_V1StGXR8_Z'

    // 2. Create BROADCAST subscription (CRITICAL: dynamic type)
    const subscription = await this.subscriptionsRepository.create({
      name,
      type: subscriptionType, // CRITICAL: Dynamic type with UID
      isActive: true,
      scope: null,
    });

    // 2. Generate unique code
    const code = await this.codeService.generateUniqueCode(
      subscription.id,
      managerId
    );

    // 3. Get invite URL
    const inviteUrl = await this.codeService.getInviteUrl(code.code);

    return { subscription, code, inviteUrl };
  });
}
```

**Error Scenarios**:
- Invalid name format → Show validation error
- Duplicate name → Show "Name already exists"
- Code generation fails → Rollback transaction
- Database error → Generic error message + Sentry log

---

### 2. Close Subscription Flow

**Trigger**: User clicks **"Закрыть подписку"** button from menu

**User Journey**:
```
Manager → /subscription → Clicks "Закрыть подписку"
    ↓
Bot: Shows inline keyboard with active subscriptions:
     [Premium Trading Signals]
     [VIP Signals]
     [Basic Package]
     [🔙 Cancel]
    ↓
Manager: Clicks "Premium Trading Signals"
    ↓
Bot: "⚠️ Are you sure you want to close 'Premium Trading Signals'?
     - New users cannot join
     - Existing subscribers keep access
     - This action can be reversed later"
     [✅ Yes, Close] [❌ Cancel]
    ↓
Manager: Clicks "✅ Yes, Close"
    ↓
Bot: "✅ Subscription 'Premium Trading Signals' has been closed.
      No new users can join this subscription."
```

**Detailed Flow**:

1. **Callback Handler**: `MasterbotUpdate.onCloseSubscription()`
   ```typescript
   @Action('subscription_close')
   async onCloseSubscription(@Ctx() ctx: UserContext): Promise<void> {
     if (!ctx.manager) {
       await ctx.reply('❌ Authentication required.');
       return;
     }

     // 1. Get active BROADCAST subscriptions only (CRITICAL)
     // This method explicitly filters WHERE type LIKE 'subscription_%' AND is_active = true
     const subscriptions = await this.subscriptionService.getActiveBroadcastSubscriptions();

     if (subscriptions.length === 0) {
       await ctx.reply('ℹ️ No active broadcast subscriptions to close.');
       return;
     }

     // 2. Create inline keyboard
     const buttons = subscriptions.map(sub => [
       {
         text: sub.name,
         callback_data: `close_sub_${sub.id}`,
       },
     ]);
     buttons.push([{ text: '🔙 Cancel', callback_data: 'close_sub_cancel' }]);

     // 3. Edit message to show selection
     await ctx.editMessageText(
       '🔒 *Close Subscription*\n\n' +
       'Select a subscription to close:',
       {
         parse_mode: 'Markdown',
         reply_markup: { inline_keyboard: buttons },
       }
     );

     // 4. Answer callback query
     await ctx.answerCbQuery();
   }
   ```

2. **Callback Handler**: Subscription selection
   ```typescript
   @Action(/^close_sub_(\d+)$/)
   async onCloseSubscriptionSelected(@Ctx() ctx: UserContext): Promise<void> {
     const subscriptionId = parseInt(ctx.match[1], 10);

     // 1. Get subscription details
     const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
     if (!subscription) {
       await ctx.answerCbQuery('❌ Subscription not found');
       return;
     }

     // 2. Show confirmation
     await ctx.editMessageText(
       `⚠️ *Confirm Closure*\n\n` +
       `Are you sure you want to close **${subscription.name}**?\n\n` +
       `• New users cannot join\n` +
       `• Existing subscribers keep access\n` +
       `• This action can be reversed later`,
       {
         parse_mode: 'Markdown',
         reply_markup: {
           inline_keyboard: [
             [
               { text: '✅ Yes, Close', callback_data: `confirm_close_${subscriptionId}` },
               { text: '❌ Cancel', callback_data: 'close_sub_cancel' },
             ],
           ],
         },
       }
     );

     await ctx.answerCbQuery();
   }
   ```

3. **Callback Handler**: Confirmation
   ```typescript
   @Action(/^confirm_close_(\d+)$/)
   async onConfirmCloseSubscription(@Ctx() ctx: UserContext): Promise<void> {
     const subscriptionId = parseInt(ctx.match[1], 10);

     try {
       // 1. Close subscription
       await this.subscriptionService.closeSubscription(
         subscriptionId,
         ctx.manager.telegramId
       );

       // 2. Get subscription name for message
       const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);

       // 3. Show success
       await ctx.editMessageText(
         `✅ *Subscription Closed*\n\n` +
         `**${subscription.name}** has been closed.\n\n` +
         `No new users can join this subscription.`,
         { parse_mode: 'Markdown' }
       );

       await ctx.answerCbQuery('✅ Subscription closed');
     } catch (error) {
       await ctx.answerCbQuery('❌ Failed to close subscription');
       await ctx.reply('❌ An error occurred. Please try again.');
     }
   }
   ```

**Service Implementation**:
```typescript
async closeSubscription(subscriptionId: number, managerId: number): Promise<void> {
  // CRITICAL: Validate it's a broadcast subscription
  const subscription = await this.subscriptionsRepository.findById(subscriptionId);
  if (!subscription || !isBroadcastSubscription(subscription.type)) {
    throw new BadRequestException('Can only close broadcast subscriptions');
  }

  await this.subscriptionsRepository.update(subscriptionId, {
    isActive: false,
    closedAt: new Date(),
    closedBy: managerId,
  });

  // Optionally: Deactivate all unused codes for this subscription
  await this.codesRepository.deactivateCodesBySubscription(subscriptionId);

  // Log action
  this.logger.log(`Analytical subscription ${subscriptionId} closed by manager ${managerId}`);
}
```

**Error Scenarios**:
- No active subscriptions → Show info message
- Subscription not found → Answer callback with error
- Database error → Generic error + log

---

### 3. Broadcast Message Flow

**Trigger**: User clicks **"Отправить сообщение"** button from menu

**User Journey**:
```
Manager → /subscription → Clicks "Отправить сообщение"
    ↓
Bot: Shows inline keyboard with active subscriptions:
     [Premium Trading Signals (45 users)]
     [VIP Signals (12 users)]
     [🔙 Cancel]
    ↓
Manager: Clicks "Premium Trading Signals (45 users)"
    ↓
Bot: "📝 Enter your broadcast message for 'Premium Trading Signals'

      Tip: You can use Markdown formatting"
    ↓
Manager: "🚀 New trading signal available! Check your alerts."
    ↓
Bot: "📊 Broadcast Preview

      Subscription: Premium Trading Signals
      Recipients: 45 active users
      Message: 🚀 New trading signal available! Check your alerts.

      Send this message?"
     [✅ Send Now] [❌ Cancel]
    ↓
Manager: Clicks "✅ Send Now"
    ↓
Bot: "✅ Broadcast queued successfully!

      Sending to 45 users...
      Messages are being sent with rate limiting."
    ↓
(After completion)
Bot: "✅ Broadcast completed

      Successfully sent: 43
      Failed: 2
      Total: 45"
```

**Detailed Flow**:

1. **Callback Handler**: `MasterbotUpdate.onBroadcast()`
   ```typescript
   @Action('subscription_broadcast')
   async onBroadcast(@Ctx() ctx: UserContext): Promise<void> {
     if (!ctx.manager) {
       await ctx.reply('❌ Authentication required.');
       return;
     }

     // 1. Get active BROADCAST subscriptions with subscriber counts (CRITICAL)
     // This method explicitly filters WHERE type LIKE 'subscription_%' AND is_active = true
     const subscriptions = await this.subscriptionService.getActiveBroadcastSubscriptions();

     if (subscriptions.length === 0) {
       await ctx.reply('ℹ️ No active broadcast subscriptions available for broadcast.');
       return;
     }

     // 2. Get subscriber counts
     const subscriptionsWithCounts = await Promise.all(
       subscriptions.map(async (sub) => ({
         ...sub,
         subscriberCount: await this.broadcastService.countSubscribers(sub.id),
       }))
     );

     // 3. Filter out subscriptions with no subscribers
     const validSubscriptions = subscriptionsWithCounts.filter(
       sub => sub.subscriberCount > 0
     );

     if (validSubscriptions.length === 0) {
       await ctx.reply('ℹ️ No subscriptions have active subscribers.');
       return;
     }

     // 4. Create inline keyboard
     const buttons = validSubscriptions.map(sub => [
       {
         text: `${sub.name} (${sub.subscriberCount} users)`,
         callback_data: `broadcast_sub_${sub.id}`,
       },
     ]);
     buttons.push([{ text: '🔙 Cancel', callback_data: 'broadcast_cancel' }]);

     // 5. Edit message to show selection
     await ctx.editMessageText(
       '📢 *Broadcast Message*\n\n' +
       'Select a subscription to broadcast to:',
       {
         parse_mode: 'Markdown',
         reply_markup: { inline_keyboard: buttons },
       }
     );

     // 6. Answer callback query
     await ctx.answerCbQuery();
   }
   ```

2. **Callback Handler**: Subscription selection
   ```typescript
   @Action(/^broadcast_sub_(\d+)$/)
   async onBroadcastSubscriptionSelected(@Ctx() ctx: UserContext): Promise<void> {
     const subscriptionId = parseInt(ctx.match[1], 10);

     // 1. Store in session
     ctx.session.broadcastSubscriptionId = subscriptionId;
     ctx.session.state = 'awaiting_broadcast_message';

     // 2. Get subscription details
     const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);

     // 3. Prompt for message
     await ctx.editMessageText(
       `📝 *Enter Broadcast Message*\n\n` +
       `**Subscription:** ${subscription.name}\n\n` +
       `Type your message below.\n` +
       `_Tip: You can use Markdown formatting_`,
       { parse_mode: 'Markdown' }
     );

     await ctx.answerCbQuery();
   }
   ```

3. **Text Handler**: Receive broadcast message
   ```typescript
   @On('text')
   async onText(@Ctx() ctx: UserContext): Promise<void> {
     if (ctx.session.state !== 'awaiting_broadcast_message') return;

     const message = ctx.message.text;
     const subscriptionId = ctx.session.broadcastSubscriptionId;

     // 1. Validate message
     const validation = this.broadcastService.validateMessage(message);
     if (!validation.valid) {
       await ctx.reply(`❌ ${validation.error}`);
       return;
     }

     // 2. Store message in session
     ctx.session.broadcastMessage = message;
     ctx.session.state = 'confirming_broadcast';

     // 3. Get details
     const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
     const count = await this.broadcastService.countSubscribers(subscriptionId);

     // 4. Show preview and confirmation
     await ctx.reply(
       `📊 *Broadcast Preview*\n\n` +
       `**Subscription:** ${subscription.name}\n` +
       `**Recipients:** ${count} active users\n\n` +
       `**Message:**\n${message}\n\n` +
       `Send this message?`,
       {
         parse_mode: 'Markdown',
         reply_markup: {
           inline_keyboard: [
             [
               { text: '✅ Send Now', callback_data: 'broadcast_confirm' },
               { text: '❌ Cancel', callback_data: 'broadcast_cancel' },
             ],
           ],
         },
       }
     );
   }
   ```

4. **Callback Handler**: Confirm and send
   ```typescript
   @Action('broadcast_confirm')
   async onBroadcastConfirm(@Ctx() ctx: UserContext): Promise<void> {
     const subscriptionId = ctx.session.broadcastSubscriptionId;
     const message = ctx.session.broadcastMessage;

     // 1. Clear session
     ctx.session.state = null;
     ctx.session.broadcastSubscriptionId = null;
     ctx.session.broadcastMessage = null;

     try {
       // 2. Send initial confirmation
       await ctx.editMessageText(
         `⏳ *Broadcast Queued*\n\n` +
         `Your message is being sent...\n` +
         `This may take a few moments.`,
         { parse_mode: 'Markdown' }
       );

       await ctx.answerCbQuery('✅ Sending broadcast...');

       // 3. Execute broadcast
       const result = await this.broadcastService.sendBroadcast(
         subscriptionId,
         message,
         ctx.manager.telegramId
       );

       // 4. Send completion notification
       await ctx.reply(
         `✅ *Broadcast Completed*\n\n` +
         `**Queued:** ${result.queuedCount} messages\n` +
         `**Errors:** ${result.errorCount}\n\n` +
         `Messages are being delivered with rate limiting.`,
         { parse_mode: 'Markdown' }
       );
     } catch (error) {
       await ctx.reply('❌ Failed to send broadcast. Please try again.');
       await ctx.answerCbQuery('❌ Broadcast failed');
     }
   }
   ```

**Service Implementation**:
```typescript
async sendBroadcast(
  subscriptionId: number,
  message: string,
  managerId: number
): Promise<BroadcastResult> {
  // CRITICAL: Validate it's a broadcast subscription
  const subscription = await this.subscriptionsRepository.findById(subscriptionId);
  if (!subscription || !isBroadcastSubscription(subscription.type)) {
    throw new BadRequestException('Can only broadcast to broadcast subscriptions');
  }

  // 1. Get active subscribers
  const subscribers = await this.usersRepository.findBySubscription(subscriptionId);

  // 2. Prepare messages
  const messages = subscribers.map(user => ({
    userId: user.telegramId,
    message,
    options: {
      priority: MessagePriority.NORMAL,
      messageType: QueuedMessageType.MARKDOWN,
    },
  }));

  // 3. Send via NotificationService
  const result = await this.notificationService.addMessages(messages);

  // 4. Log broadcast (optional: save to broadcast_history table)
  await this.saveBroadcastHistory({
    subscriptionId,
    managerId,
    message,
    recipientCount: subscribers.length,
    queuedCount: result.queuedCount,
    errorCount: result.errorCount,
  });

  return result;
}
```

**Error Scenarios**:
- No active subscriptions → Info message
- No subscribers → Info message
- Invalid message (too long) → Validation error
- Broadcast fails → Error message + retry option
- Some messages fail → Show partial success stats

---

### 4. User Subscription Activation Flow (via Invite Code)

**Trigger**: User clicks invite link with activation code

**User Journey**:
```
User clicks: t.me/QuantumDealBot?start=ABC123XYZ456DEF
    ↓
Bot receives /start command with code parameter
    ↓
Bot validates code (active, subscription exists and is active)
    ↓
Bot checks if user already has this subscription (user_subscriptions)
    ↓
If not subscribed: Create user_subscriptions record
    ↓
Bot: "✅ Successfully subscribed to [Subscription Name]!"
```

**Implementation** (in `BotService` or `StartCommand`):

```typescript
@Command('start')
async handleStart(@Ctx() ctx: Context) {
  const startParam = ctx.message.text.split(' ')[1]; // Extract code

  if (!startParam) {
    return ctx.reply('Welcome to QuantumDeal Bot!');
  }

  // This is an activation code
  const code = startParam;

  // Validate code
  const isValid = await this.subscriptionManagementService.validateCode(code);
  if (!isValid) {
    return ctx.reply('❌ Invalid or expired activation code');
  }

  // Get code details
  const codeData = await this.codesRepository.findByCode(code);
  const subscription = await this.subscriptionsRepository.findById(codeData.subscriptionId);

  // Check if user already has this subscription
  const existingSub = await this.userSubscriptionsRepository.findByUserAndSubscription(
    ctx.from.id,
    codeData.subscriptionId
  );

  if (existingSub) {
    return ctx.reply(`You already have subscription: ${subscription.name}`);
  }

  // Activate subscription for user
  await this.userSubscriptionsRepository.create({
    userId: ctx.from.id,
    subscriptionId: codeData.subscriptionId,
    activatedAt: new Date(),
    expiresAt: subscription.expirationDays
      ? new Date(Date.now() + subscription.expirationDays * 24 * 60 * 60 * 1000)
      : null,
    isActive: true,
  });

  return ctx.reply(`✅ Successfully subscribed to: ${subscription.name}!`);
}
```

---

## Session State Management

### Session Structure

```typescript
interface BotSession {
  // General state
  state: 'awaiting_subscription_name' | 'awaiting_broadcast_message' | 'confirming_broadcast' | null;
  commandContext: string | null;

  // Create subscription context
  // (none needed, handled in one step)

  // Broadcast context
  broadcastSubscriptionId: number | null;
  broadcastMessage: string | null;
}
```

### State Transitions

**Create Subscription**:
```
null → awaiting_subscription_name → null
```

**Broadcast**:
```
null → awaiting_broadcast_message → confirming_broadcast → null
```

### Session Cleanup

```typescript
// Reset session after completion or cancellation
ctx.session.state = null;
ctx.session.commandContext = null;
ctx.session.broadcastSubscriptionId = null;
ctx.session.broadcastMessage = null;
```

---

## Error Handling Patterns

```typescript
import { MASTERBOT_CONSTANTS } from './constants';
```

### 1. Authentication Errors

```typescript
if (!ctx.manager) {
  await ctx.reply(MASTERBOT_CONSTANTS.MESSAGES.AUTH_REQUIRED);
  return;
}
```

### 2. Validation Errors

```typescript
const validation = this.service.validate(input);
if (!validation.valid) {
  await ctx.reply(`❌ ${validation.error}`);
  return;
}
```

### 3. Database Errors

```typescript
try {
  await this.service.performOperation();
} catch (error) {
  this.logger.error('Operation failed', error);
  Sentry.captureException(error);
  await ctx.reply('❌ An error occurred. Please try again later.');
}
```

### 4. Callback Query Errors

```typescript
try {
  await ctx.answerCbQuery('✅ Success');
} catch (error) {
  this.logger.error('Failed to answer callback', error);
  // Don't throw - callback timeout is acceptable
}
```

---

## Rate Limiting

### Telegram API Limits

- 30 messages/second to different users
- 1 message/second to same user
- Handled by existing `NotificationService` with Bottleneck

### Command Rate Limiting (Future Enhancement)

```typescript
// Limit subscription actions to 1 per minute per manager
@UseGuards(ThrottlerGuard)
@Throttle(1, 60)
@Action('subscription_broadcast')
async onBroadcast(@Ctx() ctx: UserContext): Promise<void> { }
```

---

## Logging and Monitoring

### Action Logging

```typescript
this.masterbotService.logManagerAction(ctx.manager, 'CREATE_SUBSCRIPTION', {
  subscriptionName: name,
});

this.masterbotService.logManagerAction(ctx.manager, 'CLOSE_SUBSCRIPTION', {
  subscriptionId,
  subscriptionName,
});

this.masterbotService.logManagerAction(ctx.manager, 'BROADCAST_SENT', {
  subscriptionId,
  recipientCount,
  queuedCount,
  errorCount,
});
```

### Sentry Breadcrumbs

```typescript
Sentry.addBreadcrumb({
  message: 'Broadcast initiated',
  data: { subscriptionId, recipientCount },
  level: 'info',
});
```

---

## Cancel Actions

### Cancel Handlers

```typescript
@Action('close_sub_cancel')
async onCancelCloseSubscription(@Ctx() ctx: UserContext): Promise<void> {
  await ctx.editMessageText('❌ Cancelled');
  await ctx.answerCbQuery();
}

@Action('broadcast_cancel')
async onCancelBroadcast(@Ctx() ctx: UserContext): Promise<void> {
  // Reset state
  ctx.session.state = null;
  ctx.session.broadcastSubscriptionId = null;
  ctx.session.broadcastMessage = null;

  await ctx.editMessageText('❌ Broadcast cancelled');
  await ctx.answerCbQuery();
}
```

---

## Message Formatting

### Markdown Escaping

Use `telegramify-markdown` for user-generated content:

```typescript
import telegramifyMarkdown from 'telegramify-markdown';

const escapedMessage = telegramifyMarkdown(message, 'escape');
```

### Template Messages

```typescript
const createSuccessMessage = (subscription: Subscription, inviteUrl: string) => `
✅ *Subscription Created Successfully*

📋 **Name:** ${subscription.name}
🆔 **ID:** ${subscription.id}
📅 **Created:** ${new Date().toLocaleString()}

🎫 **Invite Link:**
\`${inviteUrl}\`

Share this link with users to join this subscription.
`;
```

---

## Pagination (Future Enhancement)

For large subscription lists:

```typescript
function createPaginatedButtons(items: any[], page: number, pageSize: number) {
  const start = page * pageSize;
  const end = start + pageSize;
  const pageItems = items.slice(start, end);

  const buttons = pageItems.map(item => [
    { text: item.name, callback_data: `item_${item.id}` }
  ]);

  // Add navigation
  const nav = [];
  if (page > 0) nav.push({ text: '◀️ Prev', callback_data: `page_${page - 1}` });
  if (end < items.length) nav.push({ text: 'Next ▶️', callback_data: `page_${page + 1}` });

  if (nav.length > 0) buttons.push(nav);

  return buttons;
}
```

---

## Testing Scenarios

### Unit Tests

- Validate message length limits
- Test subscription name validation
- Test code generation uniqueness
- Test subscriber counting logic

### Integration Tests

- Full create subscription flow
- Full close subscription flow
- Full broadcast flow with mocked Telegram API
- Cancel actions at each step

### E2E Tests

- Create subscription and verify invite link
- Close subscription and verify no new joins
- Broadcast to subscribers and verify delivery
- Error recovery (retry, timeout handling)
