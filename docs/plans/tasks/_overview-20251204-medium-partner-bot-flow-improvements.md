# Overall Design Document: Partner Bot Flow Improvements

**Generation Date:** 2025-12-04
**Target Plan Document:** 20251204-medium-partner-bot-flow-improvements.md
**Design Document:** partner-bot-flow-improvements-design.md v1.1.0

## Project Overview

### Purpose and Goals

This work addresses three critical improvements to the partner bot flow:

1. **Critical Bug Fix (botUserId):** Fix `PartnerFlowService.handleVerificationRequest()` which incorrectly passes `userId` (telegramId) to `TrialService.activate()` instead of `botUserId` (bot_users.id). This causes incorrect subscription records.

2. **State-Aware /start Command:** Implement state checking on `/start` to handle users with active trials or pending verification states appropriately.

3. **Trial Status Display:** Show remaining trial time to users who already have an active trial.

### Background and Context

The partner bot flow allows users to activate a trial subscription by verifying channel membership. The current implementation has a critical bug where the wrong user identifier is passed to the trial service, causing subscription records to be created with incorrect `bot_user_id` values.

Additionally, the `/start` command currently treats all users the same without checking their state, leading to poor UX for returning users.

## Task Division Design

### Division Policy

**Selected Approach:** Vertical Slice (Feature-Driven) with prioritization based on risk level.

**Selection Reasoning:**
1. **Critical Bug First (AC-4):** The botUserId bug blocks correct trial functionality and must be fixed first
2. **User Value Per Phase:** Each phase delivers working end-user functionality
3. **Low Risk:** Changes are isolated to partner-bot library
4. **Dependency Chain:** State check (Task 2) depends on correct trial activation (Task 1)

### Inter-task Relationship Map

```
Phase 1 (CRITICAL):
  TASK-001: Fix botUserId Bug in PartnerFlowService (L1)
    |
    +-- Deliverable: Correct botUserId passed to TrialService.activate()
    |
Phase 2:
  TASK-002: Add State Check in StartCommandUpdate (L1)
    |   Depends on: TASK-001 (correct trial activation for status check)
    |
    +-- Deliverable: State-aware /start routing
    |
Phase 3:
  TASK-003: Implement Trial Status Display (L1)
    |   Depends on: TASK-002 (state check calls sendTrialStatus)
    |
    +-- Deliverable: Trial status button with remaining time
    |
Phase 4 (Quality Assurance):
  TASK-004: Verify ReminderSchedulerService (L3)
    |   Depends on: TASK-001 (understand correct botUserId pattern)
    |
  TASK-005: Integration Tests (L2)
    |   Depends on: TASK-001, TASK-002, TASK-003, TASK-004
    |
  TASK-006: Final Quality Checks (L2)
        Depends on: TASK-005
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|---------------------|-------------------|
| `handleVerificationRequest(userId, botId)` | `handleVerificationRequest(userId, botId)` (same signature) | Internal fix only | TASK-001 |
| `handleStart(ctx)` | `handleStart(ctx)` (same signature) | Internal logic change | TASK-002 |
| N/A | `sendTrialStatus(ctx, botUser, lang)` | New private method | TASK-003 |
| N/A | `@Action('partner_trial_status')` handler | New action handler | TASK-003 |

### Common Processing Points

1. **botUser Resolution Pattern:**
   - All subscription operations use `botUser.id` (bot_users.id internal ID)
   - All Telegram API calls use `userId` (telegramId)
   - Pattern: `botUser = await botUsersRepository.findByUserAndBot(userId, botId)`

2. **State Access Pattern:**
   - Use `ctx.botUser?.state?.verificationState` from middleware context
   - No extra DB query needed for state check

3. **Message Resolution:**
   - Follow ADR-004 hierarchy: `bot_messages` -> `messages` -> English fallback -> hardcoded

## Implementation Considerations

### Principles to Maintain Throughout

1. **Type Safety:** No `any` types, use proper `BotUser` typing
2. **Consistent ID Usage:** `botUser.id` for subscriptions, `userId` for Telegram API
3. **TDD Process:** Red-Green-Refactor for all implementation tasks
4. **Logging:** Add debug logs to verify correct parameter values

### Risks and Countermeasures

| Risk | Mitigation |
|------|------------|
| `ctx.botUser` not available in context | Fall back to database resolution, add error logging |
| State check adds latency | Use cached `ctx.botUser.state`, no extra DB query |
| Incorrect botUserId still passed | Add logging to verify correct value, unit tests |
| Breaking existing tests | Update tests to match new behavior before implementation |

### Impact Scope Management

**Allowed Change Scope:**
- `libs/partner-bot/src/services/partner-flow.service.ts`
- `libs/partner-bot/src/commands/start/start.update.ts`
- `libs/partner-bot/src/actions/trial-ui.action.ts`

**No-Change Areas:**
- `libs/bot/src/services/trial.service.ts` (already expects botUserId)
- Database schema
- Standard bot flow (`libs/bot`)
- Channel verification logic

## Test Coverage Summary

### Unit Tests (8 new tests)

| Task | File | Test Count |
|------|------|------------|
| TASK-001 | `partner-flow.service.spec.ts` | 2 |
| TASK-002 | `start.update.spec.ts` | 4 |
| TASK-003 | `start.update.spec.ts` | 2 |

### Integration Tests (6 tests)

| Task | File | Test Count |
|------|------|------------|
| TASK-005 | `partner-flow-improvements.int.spec.ts` | 6 |

## Task Summary

| Task ID | Description | Phase | Verification | Size |
|---------|-------------|-------|--------------|------|
| TASK-001 | Fix botUserId Bug in PartnerFlowService | 1 | L1 | Small (1 file) |
| TASK-002 | Add State Check in StartCommandUpdate | 2 | L1 | Small (1 file) |
| TASK-003 | Implement Trial Status Display | 3 | L1 | Small (2 files) |
| TASK-004 | Verify ReminderSchedulerService | 4 | L3 | Small (1 file) |
| TASK-005 | Integration Tests | 4 | L2 | Small (1 file) |
| TASK-006 | Final Quality Checks | 4 | L2 | N/A |

## Execution Order

Recommended sequential execution:

1. **TASK-001** (Critical, blocking) -> Phase 1 Completion
2. **TASK-002** (Depends on 001) -> Phase 2 Completion
3. **TASK-003** (Depends on 002) -> Phase 3 Completion
4. **TASK-004** (Verification, can run after 001)
5. **TASK-005** (Integration, depends on 001-004)
6. **TASK-006** (Final checks, depends on 005) -> Phase 4 Completion

## Quality Metrics

- Unit test coverage: 70% minimum
- All quality checks passing: `npm run check:all`
- All acceptance criteria verified (AC-1 through AC-6)
