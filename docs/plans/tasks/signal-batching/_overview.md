# Overall Design Document: Signal Batching Feature

Generation Date: 2026-01-27
Target Plan Document: 20260127-feature-signal-batching.md

## Project Overview

### Purpose and Goals
Implement signal batching to consolidate multiple trading signals arriving within a configurable time window (default 5 seconds) into a single batched notification message per user per bot. This addresses notification fatigue during high-activity trading periods.

### Background and Context
Currently signals are delivered immediately as they arrive from MT5, causing notification spam during market volatility events. This work creates an in-memory buffer with per-bot independent timers to consolidate signals within batch windows, delivering a single formatted message containing all signals.

## Task Division Design

### Division Policy
Tasks are divided following **Vertical Slice (Feature-driven)** approach per Design Doc Phase 6 decision. Each phase delivers a user-testable vertical slice of functionality.

**Verifiability level distribution:**
- **Phase 1 (Foundation)**: L3 (Build success) - Interface definitions establish type contracts
- **Phase 2-5 (Implementation)**: L2 (Unit tests pass) - Each component independently testable
- **Phase 6 (Integration)**: L1 (Integration tests pass) - Components integrated and working together
- **Phase 7 (Quality)**: L1 (E2E tests pass) - Full system verification with all acceptance criteria

**Task Granularity:**
- 1 commit per task (logical change unit)
- Maximum 5 files per task (split if exceeds)
- TDD approach: Red→Green→Refactor cycle within each task

### Inter-task Relationship Map

```
Task 1: Interface Definitions → Deliverable: libs/framework/src/webhook/batching/signal-batching.interface.ts
  ↓ (provides type contracts)
Task 2: Template Engine Implementation → Deliverable: libs/framework/src/webhook/batching/template-engine.ts
  ↓ (independent, used by Task 5)
Task 3: Message Templates SQL → Deliverable: messages/{lang}/messages.sql (8 files)
  ↓ (independent, used by Task 5)
Task 4: Core Batching Service → Deliverable: libs/framework/src/webhook/batching/signal-batching.service.ts
  ↓ (uses Task 1 interfaces)
Task 5: Batch Message Formatter → Deliverable: libs/framework/src/webhook/batching/batch-message-formatter.service.ts
  ↓ (uses Task 1, Task 2, Task 3)
Task 6: Repository Extension → Deliverable: Extended findBySectorForBot() with filterSettings
  ↓ (independent, used by Task 7)
Task 7: SignalService Integration → Deliverable: Updated SignalService with batching routing
  ↓ (uses Task 4, Task 5, Task 6)
Phase 1 Completion: Verify Phase 1 complete
Phase 2 Completion: Verify Phase 2 complete
Phase 3 Completion: Verify Phase 3 complete
Phase 4 Completion: Verify Phase 4 complete
Phase 5 Completion: Verify Phase 5 complete
Phase 6 Completion: Verify Phase 6 complete (integration tests)
Phase 7 Completion: Verify Phase 7 complete (E2E tests + all AC)
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| SignalService.broadcastSignal() | SignalService.broadcastSignal() (modified internals) | Yes - routing logic | Task 7 |
| SubscriptionWithFeatures | SubscriptionWithFeatures (extended) | Yes - add filterSettings field | Task 6 |
| NotificationUser | NotificationUser (extended) | Yes - add filterSettings field | Task 6 |
| LocalizationService | LocalizationService (no change) | None - reused as-is | - |
| NotificationService | NotificationService (no change) | None - reused as-is | - |

### Common Processing Points

**Shared across tasks:**
- **Interface contracts (Task 1)**: Used by Task 4, Task 5, Task 7
- **Template Engine (Task 2)**: Used by Task 5 for {{#each}} loop processing
- **Message templates (Task 3)**: Used by Task 5 for batch formatting
- **Timer pattern**: Reused from FilterSessionService pattern (Map<id, NodeJS.Timeout>)

**Design policy to avoid duplicate implementation:**
- Filtering logic: Extended repository (Task 6) eliminates N queries, reused in Task 7
- Template selection logic: Centralized in BatchMessageFormatter (Task 5)
- Per-bot timer isolation: Implemented once in SignalBatchingService (Task 4)

## Implementation Considerations

### Principles to Maintain Throughout

1. **Fail-Fast Error Handling**: Never hide errors with silent fallbacks (per ai-development-guide)
2. **TDD Practice**: Write failing tests first, minimal implementation, then refactor
3. **Single Responsibility**: Each class/function has one clear responsibility
4. **Verifiability Priority**: L1 > L2 > L3 - prefer functional operation verification
5. **Backward Compatibility**: Single signals use existing templates (seamless UX)
6. **Per-Bot Fault Isolation**: One bot's timer failure doesn't affect others (ADR-007)

### Risks and Countermeasures

| Risk | Countermeasure |
|------|---------------|
| **Data loss on process crash** | Acceptable per ADR-011 (short 5s windows) |
| **Memory pressure under burst** | Circuit breaker at 100MB, maxBatchSize=10 limit |
| **Timer drift under load** | Native setTimeout acceptable for 5s precision |
| **Message exceeds 4096 chars** | Auto-split at 4096 chars (FR-006) |
| **N+1 query problem for filtering** | Extended repository with filterSettings in single query (Task 6) |
| **Integration complexity** | Integration tests created alongside each phase (not deferred) |

### Impact Scope Management

**Allowed change scope:**
- Create new batching module: `libs/framework/src/webhook/batching/`
- Modify SignalService internals (routing logic)
- Extend SubscriptionWithFeatures interface with filterSettings
- Add batch_signals templates to messages SQL
- Add batching config to BotSettings.features JSONB

**No-change areas (must not touch):**
- Per-bot Bottleneck rate limiting (unchanged)
- Custom filtering validation logic (reused, not modified)
- User subscription management
- Bot registration and lifecycle
- Non-signal message delivery paths
- Existing single-signal templates (backward compatibility)

## Task Execution Order

### Phase 1: Foundation (1 task)
1. **Task 1**: Interface Definitions (L3)

### Phase 2: Template Engine (1 task + completion)
2. **Task 2**: Template Engine Implementation (L2)
3. **Phase 1 Completion**: Verify Phase 1 complete

### Phase 3: Core Service (2 tasks + completion)
4. **Task 3**: Core Batching Service - Buffer & Timer Logic (L2)
5. **Task 3 Tests**: Core Batching Service - Unit Tests (L2)
6. **Phase 2 Completion**: Verify Phase 2 complete

### Phase 4: Message Formatting (2 tasks + completion)
7. **Task 4**: Message Templates SQL (8 languages) (L2)
8. **Task 5**: Batch Message Formatter Service (L2)
9. **Phase 3 Completion**: Verify Phase 3 complete

### Phase 5: Repository Extension (1 task + completion)
10. **Task 6**: Repository Extension - filterSettings (L2)
11. **Phase 4 Completion**: Verify Phase 4 complete

### Phase 6: Integration (2 tasks + completion)
12. **Task 7**: SignalService Integration - Routing (L1)
13. **Task 8**: SignalService Integration - In-Memory Filtering (L1)
14. **Phase 5 Completion**: Verify Phase 5 complete

### Phase 7: Quality Assurance (1 task + completion)
15. **Phase 6 Completion**: Integration Tests Execution (L1)
16. **Phase 7 Completion**: E2E Tests + Full Quality Gate (L1)

**Total Tasks**: 16 (11 implementation + 5 completion verification tasks)

## Test Strategy

### Test Skeleton Meta-Information
Test skeletons analyzed for:
- `@category`: Used to determine phase placement (core-functionality first)
- `@dependency`: Used to order tasks within phases
- `@complexity`: Used to estimate effort per task
- ROI scores: High ROI tests (88+) prioritized in earlier phases

### Test Coverage Requirements
- **Overall coverage**: >= 70%
- **New code coverage**: >= 80%
- **Unit tests**: Phase 2-5 (each component >= 80%)
- **Integration tests**: Phase 6 (12 test cases)
- **E2E tests**: Phase 7 (9 test cases)

### Test Resolution Progress
| Phase | Test Type | Cases | Target |
|-------|-----------|-------|--------|
| Phase 2 | Unit | 4+ | template-engine.spec.ts |
| Phase 3 | Unit | 6+ | signal-batching.service.spec.ts |
| Phase 4 | Unit | 5+ | batch-message-formatter.spec.ts |
| Phase 5 | Unit | 2+ | subscriptions.repository.spec.ts |
| Phase 6 | Integration | 12 | signal-batching.int.spec.ts |
| Phase 7 | E2E | 9 | signal-batching.e2e.spec.ts |

## Key Design Decisions

### 1. Template Selection Strategy
**Decision**: Based on batch size at flush time
- 1 signal = existing single-signal template (open/close_plus/etc.)
- 2+ signals = batch_signals template with {{#each}} loop

**Rationale**: Maintains backward compatibility, seamless UX for single signals

### 2. Filtering Location Strategy
**Decision**: In-memory using filterSettings from extended findBySectorForBot()
- Zero additional DB queries
- All data in single repository call
- Filter applied at buffer time (before batching)

**Rationale**: Eliminates N+1 query problem, improves performance

### 3. Timer Strategy
**Decision**: Per-bot independent timers (Map<botId, NodeJS.Timeout>)
- One timer per bot
- First signal for bot starts timer
- Subsequent signals append without resetting timer
- Timer expiry flushes all user batches for that bot

**Rationale**: Fault isolation per ADR-007, simplifies timer management

### 4. Buffer Key Strategy
**Decision**: `${botId}:${userId}` composite key
- One buffer per user per bot
- Enables per-user filtering
- Enables per-user template selection

**Rationale**: Correct filtering behavior, accurate batch counts

### 5. Message Format Strategy
**Decision**: Single `batch_signals` template with {{#each signals}} loop
- Template engine renders loop
- Signal order preserved (chronological)
- Auto-split at 4096 chars if needed

**Rationale**: Simple template structure, flexible iteration

## Implementation Pattern Consistency

All implementation samples and code must comply with:
- **ADR-011**: Signal batching architecture (in-memory buffer, per-bot timers)
- **ADR-007**: Multi-bot signal broadcasting (fault isolation)
- **Design Doc v1.4**: Interface contracts, data flow, acceptance criteria
- **ai-development-guide**: Fail-fast error handling, no silent fallbacks
- **testing-principles**: TDD Red-Green-Refactor cycle, >= 80% coverage

## References

- [ADR-011: Signal Batching Architecture](../../adr/ADR-011-signal-batching.md) v1.3.0
- [Design Doc: Signal Batching](../../design/signal-batching-design.md) v1.4
- [Work Plan](../../plans/20260127-feature-signal-batching.md)
- Integration tests: `libs/framework/src/webhook/__tests__/signal-batching.int.spec.ts`
- E2E tests: `libs/framework/src/webhook/__tests__/signal-batching.e2e.spec.ts`
