# Task: Implement Filter Selection Handlers

Metadata:
- Dependencies: Task 004 -> Deliverable: Constants and session state types
- Provides: Filter selection callback handlers in MasterbotUpdate
- Size: Small (1-2 files)
- Phase: 3 - Handler Layer
- Verification Level: L1 (Functional Operation)
- Acceptance Criteria: AC1, AC2, AC4

## Implementation Content

Implement callback handlers for filter selection in the broadcast flow. This includes handlers for:
1. Status filter selection (Active/Expired)
2. Bot filter selection (All bots/Specific bot)
3. Helper methods to display filter keyboards

## Target Files

- [x] `libs/masterbot/src/masterbot.update.ts` (implementation)
- [x] `libs/masterbot/src/__tests__/masterbot.update.spec.ts` (unit tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review dependency deliverable: Task 004 constants and session types
- [x] Write failing unit tests for each handler:
  1. `broadcast_filter_active` callback sets correct session state
  2. `broadcast_filter_expired` callback sets correct session state
  3. `broadcast_bot_all` callback sets correct session state
  4. `broadcast_bot_{id}` callback validates and sets bot ID
  5. `showStatusFilterKeyboard` displays correct options
  6. `showBotFilterKeyboard` displays all active bots
- [x] Run tests and confirm they fail

### 2. Green Phase

**Status Filter Handlers:**
- [x] Add handler for `broadcast_filter_active` callback:
  ```typescript
  // Set session.broadcastFilterStatus = 'active'
  // Set session.flowState = 'selecting_bot_filter'
  // Show bot selection keyboard
  ```
- [x] Add handler for `broadcast_filter_expired` callback:
  ```typescript
  // Set session.broadcastFilterStatus = 'expired'
  // Set session.flowState = 'selecting_bot_filter'
  // Show bot selection keyboard
  ```

**Bot Filter Handlers:**
- [x] Add handler for `broadcast_bot_all` callback:
  ```typescript
  // Set session.broadcastFilterBotId = null
  // Set session.flowState = 'awaiting_broadcast_message'
  // Send "Enter your message" prompt
  ```
- [x] Add handler for `broadcast_bot_{id}` callback:
  ```typescript
  // Parse bot ID from callback data
  // Validate bot exists via botsRepository.findById()
  // Set session.broadcastFilterBotId = botId
  // Set session.flowState = 'awaiting_broadcast_message'
  // Send "Enter your message" prompt
  ```

**Helper Methods:**
- [x] Implement `showStatusFilterKeyboard()`:
  ```typescript
  // Display inline keyboard:
  // [Active subscribers] [Expired subscribers]
  // [Cancel]
  ```
- [x] Implement `showBotFilterKeyboard()`:
  ```typescript
  // Fetch active bots via botsRepository.findAllActive()
  // Display inline keyboard:
  // [All bots]
  // [Bot1 Name] [Bot2 Name] ...
  // [Cancel]
  ```

- [x] Run only added tests and confirm they pass

### 3. Refactor Phase

- [x] Extract common keyboard building logic if duplicated
- [x] Ensure consistent error messages
- [x] Confirm added tests still pass

## Handler Specifications

### Status Filter Selection

```typescript
@Action(CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE)
async onBroadcastFilterActive(@Ctx() ctx: Context) {
  const session = await this.getSession(ctx);
  session.broadcastFilterStatus = 'active';
  session.flowState = 'selecting_bot_filter';
  await this.showBotFilterKeyboard(ctx);
}

@Action(CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED)
async onBroadcastFilterExpired(@Ctx() ctx: Context) {
  const session = await this.getSession(ctx);
  session.broadcastFilterStatus = 'expired';
  session.flowState = 'selecting_bot_filter';
  await this.showBotFilterKeyboard(ctx);
}
```

### Bot Filter Selection

```typescript
@Action(CALLBACK_ACTIONS.BROADCAST_BOT_ALL)
async onBroadcastBotAll(@Ctx() ctx: Context) {
  const session = await this.getSession(ctx);
  session.broadcastFilterBotId = null;
  session.flowState = 'awaiting_broadcast_message';
  await ctx.reply('Enter your broadcast message:');
}

@Action(new RegExp(`^${CALLBACK_ACTIONS.BROADCAST_BOT_PREFIX}(\\d+)$`))
async onBroadcastBotSelected(@Ctx() ctx: Context) {
  const match = ctx.callbackQuery?.data?.match(/broadcast_bot_(\d+)/);
  const botId = match ? parseInt(match[1], 10) : null;

  if (!botId) {
    await ctx.reply('Invalid bot selection');
    return;
  }

  const bot = await this.botsRepository.findById(botId);
  if (!bot) {
    await ctx.reply('Bot not found');
    return;
  }

  const session = await this.getSession(ctx);
  session.broadcastFilterBotId = botId;
  session.flowState = 'awaiting_broadcast_message';
  await ctx.reply('Enter your broadcast message:');
}
```

## Completion Criteria

- [x] All added unit tests pass
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`)
- [x] Status filter handlers properly update session state
- [x] Bot filter handlers validate and update session state
- [x] Keyboard helpers display correct options
- [x] Bot list retrieved from `BotsRepository.findAllActive()`

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/__tests__/masterbot.update.spec.ts
```

## Notes

- **Impact scope**: Task 006 will integrate these handlers into the broadcast flow
- **Constraints**: Must handle invalid bot ID gracefully
- **Integration**: Uses `BotsRepository.findAllActive()` for bot list
- **Error Handling**: Show user-friendly error messages for invalid selections

## UI Message Reference (from Design Doc)

### Status Filter Selection Message
```
Select subscriber type:
Choose which subscribers to target:

[Active subscribers]  [Expired subscribers]
[Cancel]
```

### Bot Filter Selection Message
```
Select bot:
Choose which bot's subscribers to target:

[All bots]
[QuantumDealBot (123 users)]
[SignalBot (45 users)]
[Cancel]
```
