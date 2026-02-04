# Signal Batching Feature - Task Decomposition

Generated: 2026-01-27
Plan Document: [20260127-feature-signal-batching.md](../../plans/20260127-feature-signal-batching.md)

## Overview

This directory contains the decomposed tasks for implementing the Signal Batching feature. Tasks follow a **Vertical Slice (Feature-driven)** approach with TDD Red-Green-Refactor cycle.

## Task Execution Order

### Phase 1: Foundation (L3 - Build Success)
1. **[task-01.md](./task-01.md)** - Interface Definitions (2 files)

### Phase 2: Template Engine (L2 - Unit Tests Pass)
2. **[task-02.md](./task-02.md)** - Template Engine Implementation (2 files)

### Phase 3: Core Batching Service (L2 - Unit Tests Pass)
3. **[task-03.md](./task-03.md)** - Core Batching Service - Buffer & Timer Logic (2 files)

### Phase 4: Message Formatting (L2 - Unit Tests Pass)
4. **[task-04.md](./task-04.md)** - Message Templates SQL (8 language files)
5. **[task-05.md](./task-05.md)** - Batch Message Formatter Service (2 files)

### Phase 5: Repository Extension (L2 - Unit Tests Pass)
6. **[task-06.md](./task-06.md)** - Repository Extension - filterSettings (3 files)

### Phase 6: Integration (L1 - Integration Tests Pass)
7. **[task-07.md](./task-07.md)** - SignalService Integration (2 files + tests)

### Phase 7: Quality Assurance (L1 - E2E Tests Pass)
8. **[phase7-completion.md](./phase7-completion.md)** - E2E Tests + Full Quality Gate

## Task Structure

Each task file contains:
- **Task Overview** - Purpose and context
- **Target Files** - Files to create/modify
- **TDD Implementation Steps** - RED-GREEN-REFACTOR cycle
- **Completion Criteria** - Clear success criteria
- **Verification Procedures** - How to verify completion
- **Test Information** - Test categories, complexity, dependencies
- **Dependencies** - What tasks must complete first
- **Notes** - Design decisions, alternatives considered

## Overall Design

See **[_overview.md](./_overview.md)** for:
- Task division design and rationale
- Inter-task relationship map
- Interface change impact analysis
- Common processing points
- Risk mitigation strategies
- Key design decisions

## Task Statistics

| Metric | Value |
|--------|-------|
| Total Tasks | 8 (7 implementation + 1 completion) |
| Files to Create | 8 (4 TS implementations + 4 test files) |
| Files to Modify | 12 (4 unique files + 8 language SQL files) |
| Estimated Duration | 5-7 days |
| Total Test Cases | 38+ (4 unit + 6 unit + 5 unit + 2 unit + 12 integration + 9 E2E) |

## Dependencies Graph

```
Task 1 (Interfaces)
  ├─→ Task 2 (Template Engine) ──→ Task 5 (Formatter)
  ├─→ Task 3 (Core Service) ─────→ Task 7 (Integration)
  ├─→ Task 5 (Formatter) ────────→ Task 7 (Integration)
  └─→ Task 6 (Repository) ───────→ Task 7 (Integration)

Task 4 (Templates) ─────────────→ Task 5 (Formatter)

Task 7 (Integration) ──→ Phase 7 (Quality Assurance)
```

## Verification Levels

- **L1 (Functional Operation)**: Feature works end-to-end (Phase 6-7)
- **L2 (Test Operation)**: Tests pass with >= 80% coverage (Phase 2-5)
- **L3 (Build Success)**: Code compiles without errors (Phase 1)

**Priority**: L1 > L2 > L3

## Key Implementation Principles

1. **TDD Red-Green-Refactor**: Write failing tests first, minimal implementation, then refactor
2. **Single Responsibility**: Each class/function has one clear purpose
3. **Fail-Fast Error Handling**: Never hide errors with silent fallbacks
4. **Backward Compatibility**: Single signals use existing templates
5. **Per-Bot Fault Isolation**: One bot's failure doesn't affect others

## Test Coverage Requirements

- **Overall Coverage**: >= 70%
- **New Code Coverage**: >= 80%
- **Critical Paths**: 100% (buffer, timer, flush logic)

## Performance Targets

| Metric | Target |
|--------|--------|
| Memory Overhead | < 50MB normal load, circuit breaker at 100MB |
| Batch Window Latency | <= 5s default, <= 500ms variance |
| DB Query Optimization | 0 additional queries (filterSettings in main query) |

## Quick Start

### Execute Tasks Sequentially

```bash
# Phase 1: Foundation
# Execute task-01.md

# Phase 2: Template Engine
# Execute task-02.md

# Phase 3: Core Service
# Execute task-03.md

# Phase 4: Message Formatting
# Execute task-04.md
# Execute task-05.md

# Phase 5: Repository
# Execute task-06.md

# Phase 6: Integration
# Execute task-07.md

# Phase 7: Quality Assurance
# Execute phase7-completion.md
```

### Verify Phase Completion

After each phase, run verification procedures specified in task files:
- Phase 1: `npm run build` - 0 errors
- Phase 2-6: `npm run test -- <task-name>` - all pass
- Phase 7: Full quality gate (typecheck + lint + format + test + coverage)

## Related Documents

- [Work Plan](../../plans/20260127-feature-signal-batching.md) - Implementation phases
- [Design Doc](../../design/signal-batching-design.md) - Technical specifications
- [ADR-011](../../adr/ADR-011-signal-batching.md) - Architecture decisions
- [Overall Design](./_overview.md) - Task relationships and design

## Contact

For questions about task decomposition or implementation approach, refer to:
- ai-development-guide skill - Technical anti-patterns and debugging
- testing-principles skill - TDD and test quality standards
- implementation-approach skill - Strategy selection framework
