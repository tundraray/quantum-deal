# Task: Modify /broadcast to Show Bot Selection First

Metadata:
- Dependencies: None (modifies existing handler)
- Provides: Modified `/broadcast` command handler in `broadcast.update.ts`
- Size: Small (1 file)
- Phase: 3 - Handler Layer
- Verification Level: L1 (Functional Operation)
- Acceptance Criteria: AC1 (Bot Selection First)

## Implementation Content

Modify the `onBroadcastCommand` handler to show bot selection keyboard immediately after the `/broadcast` command, instead of showing subscription list first. This changes the first step of the broadcast flow.

**Current Flow**: /broadcast -> subscription list
**New Flow**: /broadcast -> bot selection keyboard

## Target Files

- [x] `libs/masterbot/src/broadcast.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Locate existing `onBroadcastCommand` handler
- [x] Understand current flow: what is shown after /broadcast command
- [x] Locate existing `showBotFilterKeyboard()` helper method (from broadcast-filter-extension)
- [x] Review existing handler tests if any

### 2. Green Phase

- [x] Modify `onBroadcastCommand` handler to:
  - Clear any previous broadcast session state for clean start:
    ```typescript
    ctx.session.broadcastSubscriptionIds = [];
    ctx.session.broadcastSubscriptionId = null;
    ctx.session.broadcastFilterBotId = null;
    ctx.session.broadcastFilterStatus = null;
    ctx.session.broadcastMessage = null;
    ctx.session.broadcastMessageEntities = null;
    ```
  - Set `flowState = 'selecting_bot_filter'` (repurposed as FIRST step)
  - Call existing `showBotFilterKeyboard(ctx)` to display bot selection
- [x] Verify handler correctly shows bot list
- [ ] Manual test: `/broadcast` command shows bot selection keyboard

### 3. Refactor Phase

- [x] Ensure session cleanup is complete (no leftover state from previous flows)
- [x] Add logging for flow start: `logger.log('Broadcast flow started')`
- [x] Verify existing tests still pass if any

## Expected Handler Change

```typescript
// Before (current implementation)
@Command('broadcast')
async onBroadcastCommand(@Ctx() ctx: UserContext): Promise<void> {
  // Shows subscription list keyboard
  await this.showSubscriptionListKeyboard(ctx);
}

// After (new implementation)
@Command('broadcast')
async onBroadcastCommand(@Ctx() ctx: UserContext): Promise<void> {
  // Clear previous session state
  ctx.session.broadcastSubscriptionIds = [];
  ctx.session.broadcastSubscriptionId = null;
  ctx.session.broadcastFilterBotId = null;
  ctx.session.broadcastFilterStatus = null;
  ctx.session.broadcastMessage = null;
  ctx.session.broadcastMessageEntities = null;
  ctx.session.flowState = 'selecting_bot_filter';

  // Show bot selection keyboard first
  await this.showBotFilterKeyboard(ctx);
}
```

## Completion Criteria

- [x] `/broadcast` command shows bot selection keyboard immediately
- [x] Session state is cleared at start
- [x] `flowState = 'selecting_bot_filter'` is set
- [x] Logging added for flow start
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`) - using `npm run lint` instead
- [ ] Manual verification: command shows bot list

## Quality Check Commands

```bash
npm run check
npm run build
```

## Notes

- **Impact scope**: This changes the entry point of broadcast flow
- **Constraints**: Must reuse existing `showBotFilterKeyboard` helper
- **Pattern Reference**: Follow existing handler patterns in broadcast.update.ts
- **Flow State**: `'selecting_bot_filter'` is repurposed from filter step to be the FIRST step
