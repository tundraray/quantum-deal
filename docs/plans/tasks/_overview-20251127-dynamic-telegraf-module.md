# Overall Design Document: Dynamic Telegraf Module Implementation

Generation Date: 2025-11-27
Target Plan Document: 20251127-dynamic-telegraf-module-workplan.md

## Project Overview

### Purpose and Goals
Implement the `forRootDynamic()` method in `@libs/telegraf` to enable database-driven dynamic bot loading. This extends the existing NestJS Telegraf integration module to support loading Telegram bot configurations from a database at application startup, eliminating the need for code changes when adding new bots.

### Background and Context
Currently, adding new Telegram bots requires:
1. Adding environment variables for bot tokens
2. Creating dedicated NestJS modules for handlers
3. Adding `TelegrafModule.forRootAsync()` registration
4. Application restart

Target: Add new bots by database record insertion + restart only (no code changes).

## Task Division Design

### Division Policy
**Vertical Slice (Feature-driven)** - Selected based on ADR-006 decision

Reasoning:
- Each component delivers testable functionality independently
- `forRootDynamic()` is a self-contained feature
- Can be tested without database implementation
- Early value delivery: basic bot loading works before advanced features

### Verifiability Level Distribution
- L1 (Functional): Phase 4 tasks (module integration, webhook routing)
- L2 (Test): Phase 2, 3, 5 tasks (service implementation, handler registration)
- L3 (Build): Phase 0, 1 tasks (interfaces, constants, test skeleton)

### Inter-task Relationship Map
```
Phase 0: Test Preparation
  Task 0.1: Convert dynamic-telegraf.service.spec.ts it.todo to test stubs
    |
  Task 0.2: Convert dynamic-listeners-explorer.service.spec.ts it.todo to test stubs
    |
Phase 1: Foundation
  Task 1.1: Create dynamic-telegraf-options.interface.ts
    |
  Task 1.2: Add constants to telegraf.constants.ts
    |
  Task 1.3: Update interfaces/index.ts exports
    |
Phase 2: Core Service
  Task 2.1: Create DynamicTelegrafService skeleton
    |
  Task 2.2: Implement bot loading from BotConfigurationProvider
    |
  Task 2.3: Implement bot registry (Map<number, DynamicBotInstance>)
    |
  Task 2.4: Implement per-bot Stage creation
    |
  Task 2.5: Implement initializeBot() method
    |
  Task 2.6: Implement fault isolation (try-catch per bot)
    |
  Task 2.7: Implement graceful shutdown
    |
  Task 2.8: Implement handleUpdate() method
    |
  Task 2.9: Update services/index.ts exports
    |
Phase 3: Handler Registration
  Task 3.1: Create @ForBot decorator
    |
  Task 3.2: Create @RequiresFeature decorator
    |
  Task 3.3: Update decorators/core/index.ts exports
    |
  Task 3.4: Extend MetadataAccessorService
    |
  Task 3.5: Create DynamicListenersExplorerService skeleton
    |
  Task 3.6: Implement registerHandlers() method
    |
  Task 3.7: Implement registerUpdates() method
    |
  Task 3.8: Implement registerScenes() method
    |
  Task 3.9: Implement registerComposers() method
    |
  Task 3.10: Implement shouldRegisterHandler() method
    |
  Task 3.11: Implement registerListeners() and createContextCallback()
    |
  Task 3.12: Update services/index.ts exports
    |
Phase 4: Module Integration
  Task 4.1: Create DynamicTelegrafCoreModule
    |
  Task 4.2: Add forRootDynamic() to TelegrafModule
    |
  Task 4.3: Update index.ts exports
    |
  Task 4.4: Create integration test implementations
    |
Phase 5: Quality Assurance
  Task 5.1: Run all unit tests
    |
  Task 5.2: Run integration tests
    |
  Task 5.3: Run quality checks
    |
  Task 5.4: Verify acceptance criteria
    |
  Task 5.5: Final documentation review
```

### Interface Change Impact Analysis
| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|---------------------|-------------------|
| TelegrafModule (forRoot, forRootAsync) | TelegrafModule (+ forRootDynamic) | None (additive) | Task 4.2 |
| MetadataAccessorService | MetadataAccessorService (+ getBotTargetMetadata, getFeatureFlagMetadata) | None (additive) | Task 3.4 |
| telegraf.constants.ts | telegraf.constants.ts (+ 4 new tokens) | None (additive) | Task 1.2 |

### Common Processing Points
- **MetadataAccessorService**: Shared between ListenersExplorerService and DynamicListenersExplorerService
- **BaseExplorerService**: Common base class for module scanning
- **TelegrafParamsFactory**: Shared parameter factory for NestJS context creation
- **Decorator metadata constants**: Shared metadata keys

### Impact Scope Management
**Allowed change scope**:
- New files in `libs/telegraf/src/`
- Additive changes to existing exports
- New constants in `telegraf.constants.ts`
- New methods in `MetadataAccessorService`
- New static method in `TelegrafModule`

**No-change areas**:
- `forRoot()` method behavior
- `forRootAsync()` method behavior
- `TelegrafCoreModule` internals
- `ListenersExplorerService` for static bots
- Existing decorator behavior

## Implementation Considerations

### Principles to Maintain Throughout
1. **Backward Compatibility**: Existing static bot configurations must continue working unchanged
2. **Fault Isolation**: Failed bot initialization must not affect other bots
3. **Type Safety**: All new interfaces must be fully typed without `any`
4. **TDD Process**: Red-Green-Refactor cycle for each implementation task
5. **Per-bot Isolation**: Each dynamic bot has isolated Stage instance

### Risks and Countermeasures
| Risk | Mitigation |
|------|------------|
| Type conflicts with existing Telegraf types | Use unique interface names, avoid extending Telegraf types |
| Handler registration conflicts | Test coexistence in Phase 4 integration tests |
| Stage middleware ordering issues | Apply stage middleware after global middlewares |
| MetadataScanner compatibility | Follow existing ListenersExplorerService pattern |

## Files Summary

### Files to Create (6 new)
| File | Phase | Task |
|------|-------|------|
| `interfaces/dynamic-telegraf-options.interface.ts` | 1 | 1.1 |
| `decorators/core/for-bot.decorator.ts` | 3 | 3.1 |
| `decorators/core/requires-feature.decorator.ts` | 3 | 3.2 |
| `services/dynamic-telegraf.service.ts` | 2 | 2.1-2.8 |
| `services/dynamic-listeners-explorer.service.ts` | 3 | 3.5-3.11 |
| `dynamic-telegraf-core.module.ts` | 4 | 4.1 |

### Files to Modify (7 existing)
| File | Phase | Task |
|------|-------|------|
| `telegraf.constants.ts` | 1 | 1.2 |
| `interfaces/index.ts` | 1 | 1.3 |
| `services/metadata-accessor.service.ts` | 3 | 3.4 |
| `decorators/core/index.ts` | 3 | 3.3 |
| `services/index.ts` | 2, 3 | 2.9, 3.12 |
| `telegraf.module.ts` | 4 | 4.2 |
| `index.ts` | 4 | 4.3 |

## Test Summary

### Unit Tests (25 total)
| File | Count | Phase |
|------|-------|-------|
| `dynamic-telegraf.service.spec.ts` | 11 | 2 |
| `dynamic-listeners-explorer.service.spec.ts` | 14 | 3 |

### Integration Tests (16+ total)
| File | Count | Phase |
|------|-------|-------|
| `dynamic-telegraf-module.int.spec.ts` | 16+ | 4, 5 |

### Acceptance Criteria Mapping
| AC | Description | Test Location |
|----|-------------|---------------|
| AC-1 | forRootDynamic() coexistence | Integration tests |
| AC-2 | Database loading | Integration tests |
| AC-3 | Per-bot Stage isolation | Unit tests |
| AC-4 | Handler registration | Unit tests |
| AC-5 | Fault isolation | Unit + Integration tests |
| AC-6 | Graceful shutdown | Integration tests |
| AC-7 | Webhook routing | Integration tests |

## Task Count Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 0 | 2 | Test preparation |
| 1 | 3 | Foundation (interfaces, constants) |
| 2 | 9 | Core service |
| 3 | 12 | Handler registration |
| 4 | 4 | Module integration |
| 5 | 5 | Quality assurance |
| **Total** | **35** | + 5 phase completion tasks |
