# Task: Convert dynamic-telegraf.service.spec.ts it.todo to Test Stubs

Metadata:
- Phase: 0 (Test Preparation)
- Dependencies: None
- Provides: Test skeleton for DynamicTelegrafService
- Size: Small (1 file)
- Verification Level: L3 (Tests exist, all fail as expected - Red state)

## Implementation Content
Convert the existing `it.todo()` placeholders in `dynamic-telegraf.service.spec.ts` to actual test stubs that compile and fail appropriately. This establishes the Red state for TDD.

Design Doc Reference: Section "Test Strategy" - Unit Tests

## Target Files
- [x] `libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts`

## Implementation Steps (TDD: Red Phase Only)

### 1. Red Phase - Convert it.todo to Failing Tests
- [x] Read existing test file structure
- [x] Convert AC-3 tests (3 tests):
  - "Different bots have separate Stage instances"
  - "Scenes registered on one bot Stage are not accessible from another"
  - "Conversation/session state is isolated between different bot instances"
- [x] Convert AC-4 Shared Handler tests (2 tests):
  - "Shared handler without @ForBot decorator is registered on all dynamic bots"
  - "Handler methods receive correct bot context when invoked"
- [x] Convert AC-4 @ForBot tests (2 tests):
  - "@ForBot(botId) handler is only registered on the target bot"
  - "@ForBot decorator with non-existent botId results in handler not registered"
- [x] Convert AC-4 @RequiresFeature tests (3 tests):
  - "@RequiresFeature handler only registered on bots with matching feature enabled"
  - "@RequiresFeature handler skipped when bot has no settings"
  - "Handler with multiple @RequiresFeature requirements needs all features enabled"
- [x] Add minimal mock structure placeholders
- [x] Run tests and confirm all 10 tests fail (Red state) (Note: 10 tests total, not 11)

### Test Conversion Pattern
```typescript
// Before (it.todo)
it.todo('AC-3: Different bots have separate Stage instances');

// After (failing test stub)
it('AC-3: Different bots have separate Stage instances (different object references)', () => {
  // Arrange
  // TODO: Setup mock bots with DynamicTelegrafService

  // Act
  // TODO: Get Stage instances from two different bots

  // Assert
  expect(true).toBe(false); // Intentional failure - Red state
});
```

## Completion Criteria
- [x] All 10 `it.todo()` converted to `it()` with failing assertions (Note: 10 tests total, not 11 as originally stated)
- [x] Test file compiles without errors
- [x] `npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts` runs
- [x] All 10 tests fail (Red state confirmed)

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts
```

Expected output: 11 tests, 11 failed, 0 passed

## Notes
- Impact scope: Test file only - no production code changes
- Constraints: Do not implement actual test logic - only stubs
- The failing assertions are intentional for TDD Red state
- Test implementation will happen in Phase 2 tasks alongside service implementation
