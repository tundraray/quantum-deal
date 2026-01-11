# Phase 3 Completion: Handler Layer

Phase: 3 - Handler Layer
Verification Level: L1 (Functional Operation)
Related Tasks: Task 004, Task 005, Task 006

## Phase Overview

Phase 3 implements the complete handler layer for broadcast filter selection. This includes callback constants, session state management, filter selection handlers, and integration with the broadcast flow.

## Prerequisites

- [ ] Phase 2 completed (Task 002, 003 - Service layer extensions)
- [ ] Task 004 can run in parallel with Phase 2

## Completed Tasks Checklist

- [ ] Task 004: Add callback constants and session state fields
- [ ] Task 005: Implement filter selection handlers
- [ ] Task 006: Update broadcast flow with filter steps

## Acceptance Criteria Verification

### AC1: Expired Subscription Filter Selection
- [ ] After selecting subscription, manager sees filter options
- [ ] "Expired subscribers" option available and functional
- [ ] Filter properly stored in session state

### AC2: Bot Selection Filter
- [ ] Manager can select "All bots" or specific bot
- [ ] Bot list shows all active bots with names
- [ ] Selection properly stored in session state

### AC3: Filter Combination
- [ ] Both filters can be selected in sequence
- [ ] Combined filters reflected in recipient count

### AC4: Message Preview with Filters
- [ ] Preview shows "Target: Active/Expired subscribers"
- [ ] Preview shows "Bot: All bots / [Bot Name]"
- [ ] Recipient count reflects combined filters

### AC5: Backward Compatibility
- [ ] Existing broadcast flow continues working
- [ ] Default behavior (no explicit filter) targets active subscribers

## E2E Verification Procedures

### Integration Point 2: Service -> Handler

**Components:** `BroadcastService` -> `MasterbotUpdate`

**Verification Steps:**
1. Verify session state correctly tracks filter selections
2. Confirm `sendBroadcast` receives filter parameters from session
3. Check preview count matches actual recipient list

### Integration Point 3: Handler -> User

**Components:** `MasterbotUpdate` -> Telegram UI

**Verification Steps:**
1. Status filter keyboard displays correctly:
   - "Active subscribers" button
   - "Expired subscribers" button
   - "Cancel" button
2. Bot filter keyboard shows all active bots with names
3. Preview message shows filter descriptions and accurate count
4. Broadcast confirmation uses correct filter parameters

**Success Criteria:**
- Filter selection flow is intuitive
- Preview accurately reflects selections
- Message delivery uses correct filters

## Quality Checks

```bash
# Type check
npm run check

# Build verification
npm run build

# Unit tests for handlers
npm test -- libs/masterbot/src/__tests__/masterbot.update.spec.ts
```

## Test Resolution Progress

| Test File | Tests | Status |
|-----------|-------|--------|
| `masterbot.update.spec.ts` | 6+ new (handlers) | Pending |
| `masterbot.update.spec.ts` | 6+ new (flow) | Pending |

## Deliverables

- [ ] Filter callback constants in `libs/masterbot/src/constants.ts`
- [ ] Extended session state in `libs/masterbot/src/interfaces/user-context.interface.ts`
- [ ] Filter selection handlers in `libs/masterbot/src/masterbot.update.ts`
- [ ] Updated broadcast flow with filter steps
- [ ] Handler unit tests passing

## Phase Completion Criteria

- [ ] All unit tests pass
- [ ] Build succeeds without errors
- [ ] Type check passes
- [ ] Filter selection flow operational
- [ ] Preview displays filter information
- [ ] Session state properly managed
- [ ] Backward compatibility maintained

## User Flow Verification

### Manual Verification Steps

1. **Start Broadcast Flow**
   - Command: `/subscription` -> Select subscription -> Broadcast
   - Expected: Status filter keyboard appears

2. **Select Status Filter**
   - Action: Tap "Expired subscribers"
   - Expected: Bot filter keyboard appears

3. **Select Bot Filter**
   - Action: Tap specific bot or "All bots"
   - Expected: "Enter your message" prompt

4. **Enter Message**
   - Action: Type broadcast message
   - Expected: Preview with filter descriptions

5. **Confirm Broadcast**
   - Action: Tap "Send"
   - Expected: Delivery report with recipient count

6. **Cancel Flow**
   - Action: Tap "Cancel" at any step
   - Expected: Session state reset, returned to idle

## Notes

- Task 004 can start before Phase 2 completes (no dependencies)
- Task 005 depends on Task 004 constants
- Task 006 depends on all other tasks in this phase and Phase 2

## Rollback Procedure

If phase completion fails:
1. Revert handler changes in `masterbot.update.ts`
2. Revert session state changes in `user-context.interface.ts`
3. Revert constant additions in `constants.ts`
4. Remove added unit tests
5. Verify existing tests still pass
