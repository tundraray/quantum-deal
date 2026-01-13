# Phase 1 Completion: Remove "All bots" Functionality

## Phase Overview

Phase 1 focuses on removing the "All bots" shortcut option from the broadcast flow to simplify targeting and prevent accidental mass broadcasts.

## Included Tasks

- [x] Task 0001: Remove "All bots" functionality

## Acceptance Criteria Verification

### AC1: "All bots" button is not displayed in bot selection keyboard
- [ ] Run `/broadcast` command
- [ ] Verify bot selection keyboard shows only specific bot buttons and cancel
- [ ] Verify no "All bots" button is present

### AC2: `onBroadcastBotAll` handler is removed
- [ ] Verify handler method no longer exists in broadcast.update.ts
- [ ] Build and type check pass (compile-time verification)

## Quality Checks

- [ ] `pnpm typecheck` - zero errors
- [ ] `pnpm lint` - zero errors
- [ ] `pnpm build` - success

## Operational Verification Procedures

1. **Bot Selection Verification**:
   - Start bot in development mode
   - Send `/broadcast` command to MasterBot
   - Observe keyboard response
   - Confirm only individual bot buttons and cancel are shown
   - Screenshot or document result

2. **Code Removal Verification**:
   - Search codebase for `onBroadcastBotAll`
   - Confirm zero handler implementations found
   - Note: Constant reference may remain for compatibility

## Phase Completion Criteria

- [ ] All tasks in phase completed
- [ ] AC1 verified (manual test)
- [ ] AC2 verified (compile-time)
- [ ] Quality checks pass
- [ ] Ready to proceed to Phase 2

## Phase Dependencies

- **Depends on**: None (independent phase)
- **Required for**: Phase 2-5 can proceed independently

## Notes

- This phase is independent and can be executed first
- The `BROADCAST_BOT_ALL` constant may remain in constants.ts for session compatibility
- No database or session migration required
