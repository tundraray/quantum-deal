# Overall Design Document: Broadcast Enhancements

Generation Date: 2026-01-13
Target Plan Document: broadcast-enhancements-work-plan.md

## Project Overview

### Purpose and Goals

Enhance the MasterBot `/broadcast` command to improve targeting capabilities and UI clarity:
1. Remove confusing "All bots" option that bypasses proper targeting flow
2. Add ability to target users without any subscription (for conversion campaigns)
3. Display subscriber counts in filter buttons for better audience visibility
4. Show total user counts (not just active) when selecting subscriptions

### Background and Context

Current broadcast flow has several UX issues:
- "All bots" option skips subscription/status selection, leading to accidental mass broadcasts
- No way to target users who never activated any subscription (valuable for onboarding)
- Status filter buttons lack counts, making audience size unclear
- Subscription selection shows only active subscriber counts, not total reach

## Task Division Design

### Division Policy

**Selected Approach**: Horizontal Slice (Foundation-driven)

The implementation follows layer-by-layer construction:
- Phase 1: Cleanup (Remove obsolete code)
- Phase 2: Repository Layer (Data access)
- Phase 3: Service Layer (Business logic)
- Phase 4: Handler Layer (UI and interaction)
- Phase 5: Quality Assurance

This approach ensures stable foundations before adding features.

### Inter-task Relationship Map

```
Phase 1: Remove "All bots" (Independent, L1 Verification)
  Task 1: Remove "All bots" button and handler
    |
    v
Phase 2: Repository Layer (L3 Verification)
  Task 2: Add findWithoutSubscription and countWithoutSubscription methods
    |
    v
Phase 3: Service Layer (L2 Verification)
  Task 3: Add count methods and sendBroadcastToNonSubscribers
    |
    v
Phase 4: Handler Layer (L1 Verification)
  Task 4: Update subscription toggle keyboard with total counts
    |
  Task 5: Update status filter keyboard with counts
    |
  Task 6: Add "Without subscription" handler and callback constant
    |
    v
Phase 5: Quality Assurance (L1 Verification)
  Task 7: Final verification of all acceptance criteria
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| onBroadcastBotAll() | - (removed) | Delete | Task 1 |
| - | findWithoutSubscription() | New method | Task 2 |
| - | countWithoutSubscription() | New method | Task 2 |
| - | countUsersWithoutSubscription() | New method | Task 3 |
| - | countAllSubscribers() | New method | Task 3 |
| - | sendBroadcastToNonSubscribers() | New method | Task 3 |
| countSubscribers(id, 'active', botId) | countAllSubscribers(id, botId) | Different query | Task 4 |
| - | BROADCAST_FILTER_NO_SUBSCRIPTION | New constant | Task 6 |
| broadcastFilterStatus union | + 'no_subscription' | Extended | Task 6 |

### Common Processing Points

- **Session state management**: broadcastFilterStatus extended to include 'no_subscription'
- **Count display pattern**: Both subscription and status keyboards display counts in button text
- **LEFT JOIN exclusion pattern**: Used by findWithoutSubscription and countWithoutSubscription

## Implementation Considerations

### Principles to Maintain Throughout

1. **TDD Approach**: Service layer methods must have tests before implementation
2. **Existing Patterns**: Follow existing repository and service patterns
3. **Type Safety**: Extend existing union types properly
4. **Clean Removal**: Remove unused code completely, no commented-out code

### Risks and Countermeasures

| Risk | Countermeasure |
|------|---------------|
| LEFT JOIN query performance | Add index on user_subscriptions(bot_user_id) if needed |
| Count queries slow down keyboard display | Use parallel queries |
| Session state inconsistency with new status | Clear session on flow start, validate before broadcast |

### Impact Scope Management

**Allowed change scope**:
- `libs/masterbot/src/broadcast.update.ts` - remove All bots, add handlers, update keyboards
- `libs/masterbot/src/services/broadcast.service.ts` - add count and send methods
- `libs/masterbot/src/constants.ts` - add BROADCAST_FILTER_NO_SUBSCRIPTION
- `libs/db/src/repositories/bot-users.repository.ts` - add findWithoutSubscription

**No-change areas**:
- Message translation pipeline (LLMService)
- NotificationService queue-based delivery
- Existing sendBroadcast and sendBroadcastMulti methods
- Preview and confirmation UI structure (only content changes)

## Task Summary

| Task | Description | Files | Verification | AC |
|------|-------------|-------|--------------|-----|
| 1 | Remove "All bots" functionality | 1 | L1 | AC1, AC2 |
| 2 | Add repository methods | 1 | L3 | AC3 foundation |
| 3 | Add service layer methods | 1 | L2 | AC3-AC6 foundation |
| 4 | Update subscription toggle keyboard | 1 | L1 | AC5 |
| 5 | Update status filter keyboard | 1 | L1 | AC4 |
| 6 | Add no-subscription handler | 2 | L1 | AC3, AC6 |
| 7 | Quality assurance | - | L1 | All |

## Acceptance Criteria Traceability

| AC | Description | Tasks | Tests |
|----|-------------|-------|-------|
| AC1 | "All bots" button not displayed | 1 | E2E |
| AC2 | onBroadcastBotAll handler removed | 1 | Compile-time |
| AC3 | "Without subscription" option available | 2, 3, 6 | Unit, E2E |
| AC4 | Status filter buttons display counts | 3, 5 | E2E |
| AC5 | Subscription toggle shows total counts | 3, 4 | E2E |
| AC6 | "Without subscription" broadcast works | 2, 3, 6 | Unit, E2E |

## Test Strategy

### Unit Tests (Phase 3)
- `countUsersWithoutSubscription()` returns correct count
- `countAllSubscribers()` includes active + expired
- `sendBroadcastToNonSubscribers()` calls NotificationService correctly

### Integration Tests (Phase 4)
- Full flow verification with counts displayed
- "Without subscription" flow skips status filter

### E2E Tests (Phase 5)
- Bot selection shows no "All bots" button
- Subscription buttons show total counts
- Status filter buttons show counts
- "Without subscription" broadcast delivery

## Execution Order

1. Task 1 - Remove "All bots" (independent cleanup)
2. Task 2 - Repository methods (foundation)
3. Task 3 - Service methods (depends on Task 2)
4. Task 4 - Subscription keyboard update (depends on Task 3)
5. Task 5 - Status filter keyboard update (depends on Task 3)
6. Task 6 - No-subscription handler (depends on Task 3)
7. Task 7 - Quality assurance (all complete)

## References

- Design Doc: `docs/plans/broadcast-enhancements-design.md`
- Work Plan: `docs/plans/broadcast-enhancements-work-plan.md`
- Related ADR: `docs/adr/ADR-004-multi-bot-architecture.md`
