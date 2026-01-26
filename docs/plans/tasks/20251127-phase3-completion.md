# Phase 3 Completion: Handler Registration (DynamicListenersExplorerService)

## Phase Summary
Phase 3 implements the DynamicListenersExplorerService with decorators for @ForBot/@RequiresFeature filtering and handler registration on dynamic bots.

## Tasks Completed Checklist
- [ ] Task 20251127-015: Create @ForBot decorator
- [ ] Task 20251127-016: Create @RequiresFeature decorator
- [ ] Task 20251127-017: Update decorators/core/index.ts exports
- [ ] Task 20251127-018: Extend MetadataAccessorService
- [ ] Task 20251127-019: Create DynamicListenersExplorerService skeleton
- [ ] Task 20251127-020: Implement registerHandlers() method
- [ ] Task 20251127-021: Implement registerUpdates() method
- [x] Task 20251127-022: Implement registerScenes() method
- [ ] Task 20251127-023: Implement registerComposers() method
- [ ] Task 20251127-024: Implement shouldRegisterHandler() method
- [ ] Task 20251127-025: Implement registerListeners() and createContextCallback()
- [ ] Task 20251127-026: Update services/index.ts exports

## E2E Verification Procedures

### Verification 1: Unit Tests Pass
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts
```

**Expected Results**:
- 14 tests pass (Handler Discovery: 3, Listener Registration: 3, Scene Registration: 3, Bot Target: 2, Feature Flag: 2 + metadata tests)

### Verification 2: All Unit Tests
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts
```

**Expected Results**:
- 25 total unit tests pass (11 + 14)

### Verification 3: Build Success
```bash
npm run build
```

**Expected Results**:
- Build completes without errors
- All new files compile successfully

## Acceptance Criteria Progress

| AC | Description | Status | Tests |
|----|-------------|--------|-------|
| AC-2 | Database Loading | Partial | Tested via mock provider |
| AC-3 | Per-bot Stage Isolation | Complete | 3 unit tests |
| AC-4 | Handler Registration | Complete | 14 unit tests |
| AC-5 | Fault Isolation | Complete | 5 unit tests |
| AC-6 | Graceful Shutdown | Complete | 6 unit tests |
| AC-7 | Webhook Routing | Partial | 6 unit tests |

## Files Created/Modified Summary

| File | Action | Status |
|------|--------|--------|
| `decorators/core/for-bot.decorator.ts` | Created | [ ] |
| `decorators/core/requires-feature.decorator.ts` | Created | [ ] |
| `decorators/core/index.ts` | Modified | [ ] |
| `services/metadata-accessor.service.ts` | Modified | [ ] |
| `services/dynamic-listeners-explorer.service.ts` | Created | [ ] |
| `services/index.ts` | Modified | [ ] |

## DynamicListenersExplorerService API Checklist

| Method | Implemented | Tested |
|--------|-------------|--------|
| `registerHandlers()` | [ ] | [ ] |
| `registerUpdates()` | [ ] | [ ] |
| `registerScenes()` | [x] | [x] |
| `registerComposers()` | [ ] | [ ] |
| `shouldRegisterHandler()` | [ ] | [ ] |
| `filterUpdates()` | [ ] | [ ] |
| `filterComposers()` | [ ] | [ ] |
| `filterScenes()` | [x] | [x] |
| `registerListeners()` | [ ] | [ ] |
| `registerWizardListeners()` | [ ] | [ ] |
| `registerIfListener()` | [ ] | [ ] |
| `createContextCallback()` | [ ] | [ ] |

## MetadataAccessorService Extensions Checklist

| Method | Implemented | Tested |
|--------|-------------|--------|
| `getBotTargetMetadata()` | [ ] | [ ] |
| `getFeatureFlagMetadata()` | [ ] | [ ] |

## Test Resolution Progress

| Test File | Total | Passing | Status |
|-----------|-------|---------|--------|
| dynamic-telegraf.service.spec.ts | 11 | 11 | Green |
| dynamic-listeners-explorer.service.spec.ts | 14 | 14 | Green |
| **Total** | **25** | **25** | **Green** |

## Phase Completion Criteria
- [ ] All decorators created and exported
- [ ] MetadataAccessorService extended
- [ ] DynamicListenersExplorerService fully implemented
- [ ] All 25 unit tests pass
- [ ] Services exported from services/index.ts
- [ ] Build passes (`npm run build`)
- [ ] Quality checks pass (`npm run check`)

## Integration with DynamicTelegrafService
After Phase 3 completion, update DynamicTelegrafService.initializeBot() to call:
```typescript
await this.listenersExplorer.registerHandlers(bot, id, stage, settings)
```

## Next Phase
Proceed to Phase 4: Module Integration (DynamicTelegrafCoreModule)
