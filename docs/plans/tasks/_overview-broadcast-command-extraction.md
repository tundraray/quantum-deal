# Overall Design Document: Broadcast Command Extraction

Generation Date: 2026-01-09
Target Plan Document: broadcast-command-extraction-workplan.md

## Project Overview

### Purpose and Goals

Extract broadcast functionality from `/subscription` command into a dedicated `/broadcast` command to achieve:
1. **Separation of Concerns**: Subscription management vs. message broadcasting
2. **Extended Reach**: Enable broadcasts to ALL subscription types (signals + broadcast) instead of only broadcast-type subscriptions
3. **Maintainability**: Reduce `masterbot.update.ts` file size by ~400 lines

### Background and Context

- `masterbot.update.ts` is 1362 lines, mixing subscription management and broadcasting
- Broadcast functionality is accessed via `/subscription` menu ("Send message" button)
- Broadcast targets only `getActiveBroadcastSubscriptions()` - excludes signals subscribers (main user base)

## Task Division Design

### Division Policy

**Selected Approach**: Vertical Slice (Feature-Driven)

The extraction is a focused refactoring task that creates a complete, independently testable component. All broadcast functionality moves as a unit.

**Verifiability Levels**:
- Phase 1: L3 (Build Success) - Foundation tasks
- Phase 2: L1 (Functional Operation) - Core implementation
- Phase 3: L1 (Functional Operation) - Cleanup and integration
- Phase 4: L2 (Test Operation) - Quality assurance

### Inter-task Relationship Map

```
Phase 1: Foundation (L3)
Task 1: Add BROADCAST constant
  |
  v
Task 2: Create BroadcastUpdate class structure
  |
  v
Phase 2: Core Implementation (L1)
Task 3: Implement BroadcastUpdate handlers
  |
  v
Task 4: Register BroadcastUpdate in module
  |
  v
Phase 3: Cleanup & Integration (L1)
Task 5: Remove broadcast handlers from MasterbotUpdate
  |
Task 6: Update subscription menu and help text
  |
  v
Phase 4: Quality Assurance (L2)
Task 7: Execute E2E Tests
  |
  v
Task 8: Final Quality Checks
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| `/subscription` broadcast button | `/broadcast` command | Yes | Task 3, 5 |
| `getActiveBroadcastSubscriptions()` | `findActiveSubscriptions()` | Yes | Task 3 |
| N/A | `BroadcastUpdate` class | New | Task 2, 3 |
| N/A | `BROADCAST` constant | New | Task 1 |

### Common Processing Points

- **ensureSession helper**: Copied from MasterbotUpdate (shared utility pattern)
- **Session state types**: Reused without modification (no new types needed)
- **Decorator patterns**: Follow existing MasterbotUpdate patterns exactly

## Implementation Considerations

### Principles to Maintain Throughout

1. **Pattern Consistency**: Follow existing MasterbotUpdate class structure exactly
2. **Session State Reuse**: Use existing session types (broadcastFilterStatus, broadcastFilterBotId, etc.)
3. **No Breaking Changes**: Subscription create/close flows must remain unchanged

### Risks and Countermeasures

- **Risk**: Session state conflicts between BroadcastUpdate and MasterbotUpdate
  **Countermeasure**: Reuse existing session types exactly, both check flowState

- **Risk**: Text handler duplication (both classes register @On('text'))
  **Countermeasure**: Each class checks flowState before handling, no conflicts

- **Risk**: Missing handler extraction
  **Countermeasure**: Comprehensive method list in design doc, verify each extraction

- **Risk**: Regression in /subscription create/close flows
  **Countermeasure**: Test flows after broadcast removal

### Impact Scope Management

**Allowed Change Scope**:
- `libs/masterbot/src/masterbot.update.ts` (handler removal, menu modification)
- `libs/masterbot/src/masterbot.module.ts` (new provider registration)
- `libs/masterbot/src/constants.ts` (new BROADCAST command)
- `libs/masterbot/src/broadcast.update.ts` (new file)

**No-Change Areas**:
- `BroadcastService` (unchanged)
- `SubscriptionManagementService` (unchanged)
- Session state types (reused)
- Translation pipeline (unchanged)
- Filter flow logic (unchanged, just relocated)

## Task Summary

| Task | Description | Size | Verification Level |
|------|-------------|------|-------------------|
| Task 1 | Add BROADCAST constant | Small (1 file) | L3 |
| Task 2 | Create BroadcastUpdate class structure | Small (1 file) | L3 |
| Task 3 | Implement BroadcastUpdate handlers | Medium (1 file + tests) | L1 |
| Task 4 | Register BroadcastUpdate in module | Small (1 file) | L1 |
| Task 5 | Remove broadcast handlers from MasterbotUpdate | Medium (1 file) | L1 |
| Task 6 | Update subscription menu and help text | Small (1 file) | L1 |
| Task 7 | Execute E2E Tests | Small (1 file) | L1 |
| Task 8 | Final Quality Checks | N/A | L2 |

## Test Resolution Progress

| Phase | Tests | Target |
|-------|-------|--------|
| Phase 1 | 0 | N/A (foundation) |
| Phase 2 | 1 integration | AC1 |
| Phase 3 | 3 integration | AC2, AC4, Menu |
| Phase 4 | 2 E2E | Full flows |
| **Total** | **6** | - |

## References

- Design Doc: `docs/design/broadcast-command-extraction-design.md`
- Work Plan: `docs/plans/broadcast-command-extraction-workplan.md`
- Integration Tests: `libs/masterbot/src/__tests__/broadcast.integration.spec.ts`
- E2E Tests: `libs/masterbot/src/__tests__/e2e/broadcast-command.e2e.spec.ts`
