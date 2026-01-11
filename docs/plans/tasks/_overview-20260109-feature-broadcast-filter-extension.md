# Overall Design Document: Broadcast Filter Extension

Generation Date: 2026-01-09
Target Plan Document: 20260109-feature-broadcast-filter-extension.md

## Project Overview

### Purpose and Goals
Extend the MasterBot broadcast functionality with two new filtering capabilities:
1. **Expired Subscription Filter**: Broadcast to users whose signals subscriptions have expired (re-engagement mechanism)
2. **Bot-specific Filter**: Broadcast to users of a specific bot or all bots

### Background and Context
Currently, broadcast targets only active subscribers (`isActive = true AND expiresAt >= NOW()`). Managers need the ability to:
- Re-engage churned users through targeted promotional messages
- Run bot-specific campaigns for different partner bots
- Combine filters for precise targeting (e.g., expired subscribers of a specific bot)

## Task Division Design

### Division Policy
**Selected Approach**: Vertical Slice (Feature-driven) with Horizontal Layer Progression

Tasks are divided by architectural layer (Repository -> Service -> Handler) to respect technical dependencies while ensuring each layer is fully functional before the next. This approach ensures:
- Foundation stability before building dependent features
- Clear verification boundaries at each layer
- Minimal risk of integration issues

### Verifiability Level Distribution
| Level | Tasks | Purpose |
|-------|-------|---------|
| L3 (Build Success) | Task 001, Task 004 | Type definitions, interfaces, foundation |
| L2 (Test Operation) | Task 002, Task 003, Task 007 | Service logic with unit/integration tests |
| L1 (Functional Operation) | Task 005, Task 006, Task 008 | End-user visible functionality |

### Inter-task Relationship Map

```
Phase 1: Repository Layer (L3)
Task 001: Add findExpired method -> Deliverable: Repository method with consistent return type

Phase 2: Service Layer (L2)
  |
  v
Task 002: Extend countSubscribers -> Uses Task 001 findExpired
  |
  v
Task 003: Extend sendBroadcast -> Uses Task 001, Task 002

Phase 3: Handler Layer (L1)
  |
  v
Task 004: Add constants and session state (parallel with Phase 2)
  |
  v
Task 005: Implement filter handlers -> Uses Task 004 constants
  |
  v
Task 006: Update broadcast flow -> Uses Task 002, 003, 004, 005

Phase 4: Quality Assurance (L2)
  |
  v
Task 007: Execute Integration Tests -> All implementation complete
  |
  v
Task 008: Execute E2E Tests -> Task 007 complete
  |
  v
Task 009: Final Quality Checks -> All tests complete
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|---------------------|-------------------|
| `countSubscribers(subscriptionId)` | `countSubscribers(subscriptionId, filterStatus?, filterBotId?)` | Backward compatible | Task 002 |
| `sendBroadcast(subscriptionId, message, entities, managerId)` | `sendBroadcast(..., filterStatus?, filterBotId?)` | Backward compatible | Task 003 |
| `flowState` types | Extended with 2 new states | Additive | Task 004 |
| Session interface | Extended with 2 filter fields | Additive | Task 004 |
| N/A (new) | `findExpired(subscriptionType?, botId?, subscriptionId?)` | New method | Task 001 |

### Common Processing Points

1. **Filter Types**: `'active' | 'expired'` and `number | null` for botId used across:
   - Session state (Task 004)
   - Service methods (Task 002, 003)
   - Handler logic (Task 005, 006)

2. **Pattern Reference**: `findExpiring` method provides the implementation template for `findExpired`:
   - Same Drizzle ORM condition pattern
   - Same return type structure
   - Same join strategy with botUsers and subscriptions tables

3. **Callback Constants**: Used in both handler implementation and tests:
   - `BROADCAST_FILTER_ACTIVE`, `BROADCAST_FILTER_EXPIRED`
   - `BROADCAST_BOT_ALL`, `BROADCAST_BOT_PREFIX`

## Implementation Considerations

### Principles to Maintain Throughout

1. **Backward Compatibility**: Default behavior (no filters) must remain identical to current implementation
2. **Pattern Consistency**: `findExpired` must follow `findExpiring` implementation pattern exactly
3. **Type Safety**: All filter parameters must be properly typed (no `any` usage)
4. **Session State Hygiene**: Filter state must be properly initialized and reset

### Risks and Countermeasures

- **Risk**: Performance degradation for large expired user sets
  **Countermeasure**: Add database index `idx_user_subscriptions_expired` if performance issues detected

- **Risk**: Session state complexity increase
  **Countermeasure**: Clear session reset on cancel, defensive initialization

- **Risk**: Filter state loss during long flows
  **Countermeasure**: Store filters early, validate before send

- **Risk**: Backward compatibility regression
  **Countermeasure**: Extensive testing of default (no filter) flow in Task 008

### Impact Scope Management

**Allowed Change Scope**:
- `libs/db/src/repositories/user-subscriptions.repository.ts` (new method)
- `libs/masterbot/src/services/broadcast.service.ts` (method extension)
- `libs/masterbot/src/masterbot.update.ts` (flow extension)
- `libs/masterbot/src/constants.ts` (new constants)
- `libs/masterbot/src/interfaces/user-context.interface.ts` (session extension)

**No-Change Areas**:
- Existing `findExpiring` method logic
- Message translation pipeline
- NotificationService queue
- Code generation flow
- Subscription create/close flows

## Task Summary

| Task ID | Description | Files | Verification Level | Dependencies |
|---------|-------------|-------|-------------------|--------------|
| 001 | Add findExpired repository method | 1-2 | L3 | None |
| 002 | Extend countSubscribers with filters | 1-2 | L2 | Task 001 |
| 003 | Extend sendBroadcast with filters | 1-2 | L2 | Task 001, 002 |
| 004 | Add callback constants and session state | 2 | L3 | None |
| 005 | Implement filter selection handlers | 1-2 | L1 | Task 004 |
| 006 | Update broadcast flow with filter steps | 1-2 | L1 | Task 002, 003, 004, 005 |
| 007 | Execute and fix Integration Tests | 1 | L2 | Task 001-006 |
| 008 | Execute and fix E2E Tests | 1 | L1 | Task 007 |
| 009 | Final Quality Checks | 0 | L2 | Task 008 |

## Phase Completion Checkpoints

### Phase 1 Completion (Task 001)
- [ ] `findExpired` method exists and follows `findExpiring` pattern
- [ ] Return type matches `{ botUser, subscription, userSubscription }[]`
- [ ] Build succeeds without errors
- [ ] 4 unit tests pass

### Phase 2 Completion (Tasks 002-003)
- [ ] `countSubscribers` accepts filter parameters
- [ ] `sendBroadcast` accepts filter parameters
- [ ] Default behavior identical to pre-filter implementation
- [ ] 3 additional unit tests pass

### Phase 3 Completion (Tasks 004-006)
- [ ] New callback constants defined
- [ ] Session state supports filter fields
- [ ] Filter selection handlers functional
- [ ] Broadcast flow includes filter steps
- [ ] Full flow operational with filters

### Phase 4 Completion (Tasks 007-009)
- [ ] 8 integration tests pass
- [ ] 4 E2E tests pass
- [ ] All quality checks pass
- [ ] Coverage meets 70% threshold
- [ ] AC1-AC5 verified

## Acceptance Criteria Traceability

| AC | Description | Primary Task | Verification Task |
|----|-------------|--------------|-------------------|
| AC1 | Expired Subscription Filter Selection | Task 001, 002, 003 | Task 007, 008 |
| AC2 | Bot Selection Filter | Task 001, 005 | Task 007, 008 |
| AC3 | Filter Combination | Task 002, 003, 006 | Task 007, 008 |
| AC4 | Message Preview with Filters | Task 006 | Task 008 |
| AC5 | Backward Compatibility | Task 002, 003, 006 | Task 008 |
