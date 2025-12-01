# Overall Design Document: Multi-Bot Signal Broadcasting

Generation Date: 2025-12-01
Target Plan Document: 20251201-feature-multi-bot-signal-broadcasting.md

## Project Overview

### Purpose and Goals
Extend the existing single-bot signal delivery system to distribute MT5 trading signals across ALL active Telegram bots simultaneously. This enables:
- Per-bot rate limiting (28 msg/sec per bot)
- Bot-specific message templates
- Bot-scoped subscription filtering
- Parallel fault-isolated delivery

### Background and Context
The current architecture uses a single hardcoded bot (`QuantumDealBot`) for all signal delivery. As the platform expands to support multiple branded bots for different broker partners, signals must be routed to users through their respective bot instances.

**Prerequisite ADRs**:
- ADR-007: Multi-bot signal broadcasting architecture
- ADR-004: Multi-bot database architecture
- ADR-006: Dynamic Telegraf module loading pattern

## Task Division Design

### Division Policy
**Selected**: Vertical Slice (Feature-driven) with foundation-first phases

**Rationale**:
- Multi-bot broadcasting is a complete feature with clear user value
- Minimal external dependencies outside the signal delivery path
- Can be verified end-to-end at each integration point
- Static bot continues working during development (backward compatible)
- Phases ordered by technical dependencies

### Verifiability Level Distribution
| Level | Description | Tasks |
|-------|-------------|-------|
| L1 | Functional Operation | Phase 6, Phase 7 (E2E signal delivery) |
| L2 | Test Operation | Phase 2, 3, 4, 5 (Unit/Integration tests) |
| L3 | Build Success | Phase 1 (Interface definitions) |

### Inter-task Relationship Map

```
Phase 1: Interface Definitions (L3)
  |-- Task 1-1: bot-registry.interface.ts
  |-- Task 1-2: multi-bot-signal.interface.ts
  |-- Task 1-3: Update index.ts exports
  |
  v
Phase 2: DynamicBotInstance Extension (L2)
  |-- Task 2-1: Add limiter to interface
  |-- Task 2-2: Initialize Bottleneck in service
  |
  +----> Phase 3: Repository Extension (L2)
  |        |-- Task 3-1: Add findBySectorForBot method
  |
  +----> Phase 4: BotRegistryService (L2)
           |-- Task 4-1: Create BotRegistryService
           |-- Task 4-2: Register in bot module
           |
           v
Phase 5: NotificationService Extension (L2)
  |-- Task 5-1: Add sendWithBot method
  |
  v
Phase 6: MultiBotSignalService (L1)
  |-- Task 6-1: Create MultiBotSignalService
  |-- Task 6-2: Register in bot module
  |-- Task 6-3: Update package exports
  |
  v
Phase 7: Integration & QA (L1)
  |-- Task 7-1: Modify WebhookProcessorService
  |-- Task 7-2: Execute E2E tests
  |-- Task 7-3: Quality verification
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| - | SignalCapableBot | N/A (new) | Task 1-1 |
| - | BotRegistry | N/A (new) | Task 1-1 |
| - | BotDeliveryResult | N/A (new) | Task 1-2 |
| - | BroadcastResult | N/A (new) | Task 1-2 |
| DynamicBotInstance | DynamicBotInstance + limiter | No | Task 2-1 |
| SubscriptionsRepository | + findBySectorForBot() | No (new method) | Task 3-1 |
| NotificationService | + sendWithBot() | No (new method) | Task 5-1 |
| WebhookProcessorService | Route to MultiBotSignalService | Yes | Task 7-1 |

### Common Processing Points

1. **Bottleneck Configuration** (shared across services)
   - Location: Each service creates its own instance
   - Config: `{ maxConcurrent: 4, minTime: 30, reservoir: 28, reservoirRefreshAmount: 28, reservoirRefreshInterval: 1000 }`
   - Note: Could be extracted to `bottleneck.config.ts` for DRY compliance

2. **Placeholder Replacement Logic**
   - Existing: WebhookProcessorService has placeholder logic
   - New: MultiBotSignalService will have similar logic
   - Decision: Duplicate for isolation (different contexts)

3. **Custom Filtering Logic**
   - Existing: WebhookProcessorService.shouldSendSignal()
   - New: MultiBotSignalService.shouldSendSignal() (replicates logic)
   - Decision: Duplicate intentionally for service isolation

## Implementation Considerations

### Principles to Maintain Throughout

1. **Backward Compatibility**
   - Existing `findBySector()` method remains unchanged
   - Existing `addMessage()` method remains unchanged
   - Static bot continues to work if no dynamic bots configured

2. **Per-Bot Isolation**
   - Each bot has its own Bottleneck rate limiter
   - Failure in one bot does not affect others
   - User queries are bot-scoped

3. **Type Safety**
   - No `any` types allowed
   - Proper type guards for external data
   - Union types for bot instance variations

### Risks and Countermeasures

| Risk | Impact | Probability | Mitigation | Detection Task |
|------|--------|-------------|------------|----------------|
| Rate limit blocks queue | High | Low | Per-bot Bottleneck instances | Task 4-1 tests |
| Memory overhead | Medium | Low | Bottleneck ~2KB each | Phase 7 E2E |
| Query performance | Medium | Low | Existing indexes | Task 3-1 tests |
| Bot API errors | Medium | Medium | Per-user retry logic | Task 5-1 tests |

### Impact Scope Management

**Allowed Change Scope**:
- `libs/bot/src/interfaces/` - New interface files
- `libs/bot/src/services/` - New services + notification.service.ts modification
- `libs/telegraf/src/interfaces/` - DynamicBotInstance extension
- `libs/telegraf/src/services/` - DynamicTelegrafService modification
- `libs/db/src/repositories/` - SubscriptionsRepository extension

**No-Change Areas**:
- `libs/bot/src/services/notification.service.ts` - `addMessage()` method
- `libs/db/src/repositories/subscriptions.repository.ts` - `findBySector()` method
- User subscription management
- Bot registration and lifecycle (beyond limiter addition)
- Custom filtering logic implementation (logic only moved)

## Task Summary

| Task ID | Phase | Description | Target Files | Size | Verification |
|---------|-------|-------------|--------------|------|--------------|
| 1-1 | 1 | Create bot-registry.interface.ts | 1 new | Small | L3 |
| 1-2 | 1 | Create multi-bot-signal.interface.ts | 1 new | Small | L3 |
| 1-3 | 1 | Update interfaces/index.ts | 1 mod | Small | L3 |
| 2-1 | 2 | Add limiter to DynamicBotInstance | 1 mod | Small | L3 |
| 2-2 | 2 | Initialize Bottleneck in DynamicTelegrafService | 1 mod | Small | L2 |
| 3-1 | 3 | Add findBySectorForBot method | 1 mod | Small | L2 |
| 4-1 | 4 | Create BotRegistryService | 1 new | Medium | L2 |
| 4-2 | 4 | Register in bot module | 1 mod | Small | L3 |
| 5-1 | 5 | Add sendWithBot method | 1 mod | Medium | L2 |
| 6-1 | 6 | Create MultiBotSignalService | 1 new | Medium | L2 |
| 6-2 | 6 | Register in bot module | 1 mod | Small | L3 |
| 6-3 | 6 | Update package exports | 2 mod | Small | L3 |
| 7-1 | 7 | Modify WebhookProcessorService | 1 mod | Small | L1 |
| 7-2 | 7 | Execute E2E tests | 0 | Small | L1 |
| 7-3 | 7 | Quality verification | 0 | Small | L1 |

**Total**: 4 new files, 9 modified files, 15 tasks + 7 phase completion tasks

## Acceptance Criteria Traceability

| AC | Description | Implementation Task | Test Task |
|----|-------------|---------------------|-----------|
| AC-001 | Signal delivers to ALL active bots | Task 6-1 | Task 7-2 |
| AC-002 | Parallel processing via Promise.all | Task 6-1 | Task 6-1 |
| AC-003 | findBySectorForBot returns botId IS NULL | Task 3-1 | Task 3-1 |
| AC-004 | findBySectorForBot returns specific bot users | Task 3-1 | Task 3-1 |
| AC-005 | Each bot has own Bottleneck limiter | Task 2-2, 4-1 | Task 4-1 |
| AC-006 | Fault isolation between bots | Task 6-1 | Task 7-2 |
| AC-007 | BroadcastResult includes per-bot stats | Task 6-1 | Task 6-1 |
| AC-008 | Static bot included when enabled | Task 4-1 | Task 4-1 |
| AC-009 | sendWithBot uses provided bot/limiter | Task 5-1 | Task 5-1 |
| AC-010 | Delivery within 5 seconds | Task 6-1 | Task 7-2 |

## Execution Order

**Recommended Execution Order** (respecting dependencies):
1. Task 1-1, Task 1-2, Task 1-3 (can be parallel)
2. Phase 1 Completion
3. Task 2-1, Task 2-2 (sequential)
4. Phase 2 Completion
5. Task 3-1, Task 4-1 (can be parallel after Phase 2)
6. Task 4-2
7. Phase 3 Completion, Phase 4 Completion
8. Task 5-1
9. Phase 5 Completion
10. Task 6-1, Task 6-2, Task 6-3 (sequential)
11. Phase 6 Completion
12. Task 7-1, Task 7-2, Task 7-3 (sequential)
13. Phase 7 Completion (Final QA)

---

**Document Version**: 1.0
**Created**: 2025-12-01
**Based On**: Work Plan 20251201-feature-multi-bot-signal-broadcasting.md, Design Doc multi-bot-signal-broadcasting-design.md
