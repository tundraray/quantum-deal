# Overall Design Document: Broadcast Flow Redesign

Generation Date: 2026-01-12
Target Plan Document: 20260112-feature-broadcast-flow-redesign.md

## Project Overview

### Purpose and Goals

Redesign the MasterBot `/broadcast` command flow to:
1. Start with bot selection immediately after command (instead of subscription)
2. Allow multiple subscription selection with toggle buttons
3. Show unique user count with per-subscription breakdown in preview
4. Deduplicate users when broadcasting to multiple subscriptions

### Background and Context

Current flow limitations:
- **Unintuitive order**: Subscription is selected before bot, making it unclear which bot's subscribers will receive the message
- **Single subscription selection**: Cannot broadcast to multiple subscription groups simultaneously
- **No filtering feedback**: Empty subscriptions are filtered out without context of selected bot

**Flow Change**:
- Old: /broadcast -> subscription -> status -> bot -> message -> confirmation
- New: /broadcast -> bot -> subscriptions (multiple) -> status -> message -> confirmation

## Task Division Design

### Division Policy

**Selected Approach**: Vertical Slice (Feature-driven)

The feature is divided by architectural layers with clear verification levels:
- Phase 1 (L3): Foundation - type definitions and constants
- Phase 2 (L2): Service Layer - business logic with unit tests
- Phase 3 (L1): Handler Layer - UI and user interaction
- Phase 4 (L1): Quality Assurance - E2E and final checks

### Inter-task Relationship Map

```
Phase 1: Foundation (L3 Verification)
  Task 1: Session interface update (broadcastSubscriptionIds)
    |
  Task 2: Callback action constants
    |
    v
Phase 2: Service Layer (L2 Verification)
  Task 3: getUniqueUserCount method -> Integration Test AC5
    |
  Task 4: sendBroadcastMulti method -> Integration Test AC6
    |
    v
Phase 3: Handler Layer (L1 Verification)
  Task 5: /broadcast -> bot selection first
    |
  Task 6: Subscription toggle keyboard -> Integration Test AC2
    |
  Task 7: Toggle/Select-All/Done handlers
    |
  Task 8: Preview with breakdown
    |
  Task 9: Confirmation handler update
    |
    v
Phase 4: Quality Assurance (L1 Verification)
  Task 10: Execute E2E Tests (AC1-AC6)
    |
  Task 11: Final Quality Checks
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| broadcastSubscriptionId | broadcastSubscriptionIds[] | Yes (array) | Task 1 |
| sendBroadcast() | sendBroadcastMulti() | New method | Task 4 |
| - | getUniqueUserCount() | New method | Task 3 |
| - | BROADCAST_SUB_TOGGLE_PREFIX | New constant | Task 2 |
| - | BROADCAST_SUB_SELECT_ALL | New constant | Task 2 |
| - | BROADCAST_SUB_DONE | New constant | Task 2 |

### Common Processing Points

- **Session state management**: All handlers share session state with `broadcastSubscriptionIds[]`
- **User deduplication logic**: Shared between `getUniqueUserCount` and `sendBroadcastMulti`
- **Keyboard refresh pattern**: Toggle and Select All handlers both refresh the same keyboard

## Implementation Considerations

### Principles to Maintain Throughout

1. **TDD Approach**: All service layer methods must have tests before implementation
2. **Backward Compatibility**: Keep deprecated `broadcastSubscriptionId` for transition
3. **Type Safety**: Use strict TypeScript types for all new interfaces
4. **Existing Patterns**: Follow existing `showBotFilterKeyboard` pattern for new keyboards

### Risks and Countermeasures

| Risk | Countermeasure |
|------|---------------|
| Session array state complexity | Clear initialization, defensive null checks |
| Keyboard button limit exceeded | Pagination for many subscriptions (deferred) |
| Deduplication query performance | Use efficient SQL with DISTINCT |
| User confusion with new flow | Clear UI labels, help text in messages |

### Impact Scope Management

**Allowed change scope**:
- `libs/masterbot/src/broadcast.update.ts` - flow reorder, new handlers
- `libs/masterbot/src/services/broadcast.service.ts` - multi-subscription support
- `libs/masterbot/src/constants.ts` - new callback actions
- `libs/masterbot/src/interfaces/user-context.interface.ts` - session state array

**No-change areas**:
- Message translation pipeline (LLMService)
- NotificationService queue-based delivery
- Code generation flow
- Subscription create/close flows

## Task Summary

| Task | Description | Files | Verification | AC |
|------|-------------|-------|--------------|-----|
| 1 | Session interface update | 1 | L3 | AC3 |
| 2 | Callback action constants | 1 | L3 | AC3 |
| 3 | getUniqueUserCount method | 1 | L2 | AC5 |
| 4 | sendBroadcastMulti method | 1 | L2 | AC6 |
| 5 | Bot selection first | 1 | L1 | AC1 |
| 6 | Subscription toggle keyboard | 1 | L1 | AC2, AC3 |
| 7 | Toggle handlers | 1 | L1 | AC3 |
| 8 | Preview with breakdown | 1 | L1 | AC5 |
| 9 | Confirmation update | 1 | L1 | AC6 |
| 10 | E2E Tests | 1 | L1 | AC1-6 |
| 11 | Final Quality Checks | - | L2 | All |

## Acceptance Criteria Traceability

| AC | Description | Tasks | Tests |
|----|-------------|-------|-------|
| AC1 | Bot Selection First | 5 | E2E |
| AC2 | Subscription Filtering by Bot | 6 | Integration |
| AC3 | Multiple Subscription Selection | 1, 2, 6, 7 | Unit, E2E |
| AC4 | Status Filter Step | - (existing) | E2E |
| AC5 | Preview with User Count Breakdown | 3, 8 | Unit, Integration |
| AC6 | Broadcast Execution with Deduplication | 4, 9 | Unit, Integration |

## Test Resolution Progress

| Phase | Tests | Initial |
|-------|-------|---------|
| Phase 1 | Type checking only | 0/0 (L3) |
| Phase 2 | 9 unit + 3 integration | 0/12 |
| Phase 3 | Handler tests + 1 integration | 0/10+ |
| Phase 4 | 1-3 E2E | 0/3 |
| **Total** | **~25** | **0/25** |

## Execution Order

1. Task 1 - Session interface (foundation for all handlers)
2. Task 2 - Constants (foundation for handlers)
3. Task 3 - getUniqueUserCount (service layer)
4. Task 4 - sendBroadcastMulti (service layer)
5. Task 5 - /broadcast command modification
6. Task 6 - Subscription toggle keyboard
7. Task 7 - Toggle handlers
8. Task 8 - Preview update
9. Task 9 - Confirmation update
10. Task 10 - E2E Tests
11. Task 11 - Final Quality Checks

## References

- Design Doc: `docs/design/broadcast-flow-redesign-design.md`
- Work Plan: `docs/plans/20260112-feature-broadcast-flow-redesign.md`
- Integration Tests: `libs/masterbot/src/__tests__/broadcast-flow-redesign.int.test.ts`
- E2E Tests: `libs/masterbot/src/__tests__/e2e/broadcast-flow-redesign.e2e.spec.ts`
