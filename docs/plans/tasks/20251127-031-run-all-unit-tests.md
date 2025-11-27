# Task: Run All Unit Tests

Metadata:
- Phase: 5 (Quality Assurance)
- Dependencies: Phase 4 completion
- Provides: Unit test verification
- Size: Small (verification task)
- Verification Level: L2 (All Tests Pass)

## Implementation Content
Execute all unit tests for the dynamic module components and verify 100% pass rate. Fix any failing tests discovered.

Design Doc Reference: Section "Test Strategy" - Unit Tests

## Target Files
- [ ] `libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts`
- [ ] `libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts`

## Implementation Steps

### 1. Execute Unit Tests
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts
```

### 2. Verify Results
- [ ] `dynamic-telegraf.service.spec.ts`: 11/11 pass
- [ ] `dynamic-listeners-explorer.service.spec.ts`: 14/14 pass

### 3. Fix Any Failures
- [ ] If tests fail, identify root cause
- [ ] Fix implementation or test as appropriate
- [ ] Re-run tests until all pass

## Expected Test Distribution

### DynamicTelegrafService (11 tests)
| Category | Count |
|----------|-------|
| AC-3: Per-bot Stage Isolation | 3 |
| AC-4: Shared Handler Registration | 2 |
| AC-4: Per-bot Handler Filtering | 2 |
| AC-4: Feature Flag Filtering | 3 |
| Registry operations | 5 |
| AC-5: Fault Isolation | 5 |
| AC-6: Graceful Shutdown | 6 |
| AC-7: Webhook Routing | 6 |

### DynamicListenersExplorerService (14 tests)
| Category | Count |
|----------|-------|
| Handler Discovery | 3 |
| Listener Registration | 3 |
| Scene Registration | 3 |
| Bot Target Filtering | 2 |
| Feature Flag Filtering | 2 |
| Metadata accessor | 1 |

## Completion Criteria
- [ ] All 25 unit tests execute
- [ ] All 25 unit tests pass (0 failures)
- [ ] No skipped tests
- [ ] Test output captured and documented

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/ --reporter=verbose
```

## Notes
- Impact scope: Verification only - no code changes unless fixing failures
- This task confirms all unit-level functionality works correctly
