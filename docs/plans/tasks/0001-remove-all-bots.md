# Task: Remove "All bots" Functionality

Metadata:
- Dependencies: None (Independent cleanup task)
- Provides: Cleaner broadcast flow without "All bots" shortcut
- Size: Small (1 file)
- Phase: 1 - Remove "All bots" Functionality
- Verification Level: L1 (Functional Operation Verification)
- Acceptance Criteria: AC1 (button not displayed), AC2 (handler removed)

## Implementation Content

Remove the "All bots" option from the broadcast flow to simplify targeting. This is a cleanup task that removes code rather than adding it.

Changes required:
1. Remove "All bots" button from `showBotSelectionKeyboardReply()` (line 743-747)
2. Remove "All bots" button from `showBotFilterKeyboard()` (line 703-707)
3. Remove `onBroadcastBotAll` handler method (lines 246-273)
4. Remove `@Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL)` decorator

## Target Files

- [x] `libs/masterbot/src/broadcast.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review existing `showBotSelectionKeyboardReply()` implementation
- [x] Identify the "All bots" button creation code (look for `BROADCAST_BOT_ALL`)
- [x] Review existing `showBotFilterKeyboard()` implementation
- [x] Locate `onBroadcastBotAll` handler method
- [x] No tests needed for removal - compile-time verification sufficient

### 2. Green Phase

- [x] Remove "All bots" button from `showBotSelectionKeyboardReply()`:
  - Locate the line creating button with `BROADCAST_BOT_ALL` callback
  - Remove the entire button creation and any surrounding array push

- [x] Remove "All bots" button from `showBotFilterKeyboard()`:
  - Same pattern as above

- [x] Remove `onBroadcastBotAll` handler:
  - Remove the entire method including decorator
  - The method starts with `@Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL)`
  - Remove from line ~246 to ~273

- [x] Run type check to verify no broken references

### 3. Refactor Phase

- [x] Ensure no commented-out code remains
- [x] Verify no unused imports remain
- [x] Run lint to check for any issues
- [x] Run build to verify compilation

## Expected Code Changes

### Before (showBotSelectionKeyboardReply)
```typescript
const buttons: InlineKeyboardButton[][] = [
  [Markup.button.callback('All bots', MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL)],
  // ... bot buttons
];
```

### After (showBotSelectionKeyboardReply)
```typescript
const buttons: InlineKeyboardButton[][] = [
  // ... bot buttons only
];
```

### Handler Removal
```typescript
// REMOVE ENTIRELY:
@Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_BOT_ALL)
async onBroadcastBotAll(@Ctx() ctx: UserContext): Promise<void> {
  // ... entire method body
}
```

## Completion Criteria

- [x] "All bots" button NOT displayed in bot selection keyboard
- [x] "All bots" button NOT displayed in bot filter keyboard
- [x] `onBroadcastBotAll` handler method removed
- [x] Build succeeds without errors (`pnpm build`)
- [x] Type check passes (`pnpm typecheck`)
- [x] Lint passes (`pnpm lint`)

## Operational Verification Procedures

1. Run `/broadcast` command in bot
2. Verify bot selection keyboard shows only specific bot buttons and cancel
3. Verify no "All bots" button is present
4. Run quality checks:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

## Quality Check Commands

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Notes

- **Impact scope**: Only broadcast.update.ts modified
- **Constraints**: BROADCAST_BOT_ALL constant may remain in constants.ts for session compatibility (no need to remove)
- **Backward Compatibility**: Users with active sessions using old flow will need to restart `/broadcast`
