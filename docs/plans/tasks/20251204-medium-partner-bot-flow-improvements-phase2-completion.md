# Phase 2 Completion: State Check Implementation

**Plan:** 20251204-medium-partner-bot-flow-improvements.md
**Phase:** 2 - State Check Implementation
**Verification Level:** L1 (Functional Operation)

## Phase Tasks

- [ ] **TASK-002**: Add State Check in StartCommandUpdate

## E2E Verification Procedures

### Integration Point 2: State Check Flow

**Components:** `StartCommandUpdate` -> `ctx.botUser` -> `UserSubscriptionsRepository`

**Verification Steps:**

1. **trial_activated State Test:**
   - [ ] Set up a user with `state.verificationState = 'trial_activated'`
   - [ ] Ensure user has an active subscription (not expired)
   - [ ] Send `/start` command
   - [ ] Verify: Status message sent (not welcome message)

2. **awaiting_channel_subscription State Test:**
   - [ ] Set up a user with `state.verificationState = 'awaiting_channel_subscription'`
   - [ ] Set `verificationAttempts = 2`
   - [ ] Send `/start` command
   - [ ] Verify: Channel prompt sent (NOT welcome message)
   - [ ] Verify: `verificationAttempts` preserved (still 2)

3. **No State Test:**
   - [ ] Set up a new user with no state (or `state = undefined`)
   - [ ] Send `/start` command
   - [ ] Verify: Welcome message sent
   - [ ] Verify: State initialized to `awaiting_channel_subscription`
   - [ ] Verify: Channel prompt sent

4. **Context Usage Test:**
   - [ ] Verify `ctx.botUser.state` is used from middleware context
   - [ ] Confirm no additional DB query for state (check query logs)

**Expected Results:**
- Each state triggers correct flow branch
- No extra database queries for state
- State not corrupted by `/start` command

## Completion Checklist

- [ ] TASK-002 completed
- [ ] 4 unit tests passing
- [ ] State routing logic implemented
- [ ] Uses `ctx.botUser.state` (no extra DB query)
- [ ] Build passes: `npm run build`

## Acceptance Criteria Covered

- [x] **AC-1**: State Check on /start Command
  - trial_activated + active trial -> shows status (placeholder)
  - awaiting_channel_subscription -> re-sends channel prompt
  - no state -> sends welcome + channel prompt
  - Uses `ctx.botUser.state` from middleware context

- [x] **AC-3**: Pending State Handling
  - Awaiting users see channel prompt on `/start`
  - Welcome message NOT re-sent
  - Verification attempt counter preserved

## Test Resolution Progress

| Metric | Count |
|--------|-------|
| Unit Tests Added (Phase 2) | 4 |
| Unit Tests Passing | 0/4 |
| Cumulative Total | 6 |

## Dependencies on Future Tasks

- `sendTrialStatus()` is a placeholder in this phase
- Full trial status display implemented in Phase 3 (TASK-003)

## Next Phase

Proceed to **Phase 3: Trial Status Display** (TASK-003) after this phase is complete.
