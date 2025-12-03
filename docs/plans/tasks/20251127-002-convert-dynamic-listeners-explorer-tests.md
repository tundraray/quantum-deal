# Task: Convert dynamic-listeners-explorer.service.spec.ts it.todo to Test Stubs

Metadata:
- Phase: 0 (Test Preparation)
- Dependencies: Task 20251127-001
- Provides: Test skeleton for DynamicListenersExplorerService
- Size: Small (1 file)
- Verification Level: L3 (Tests exist, all fail as expected - Red state)

## Implementation Content
Convert the existing `it.todo()` placeholders in `dynamic-listeners-explorer.service.spec.ts` to actual test stubs that compile and fail appropriately. This establishes the Red state for TDD.

Design Doc Reference: Section "Test Strategy" - Unit Tests

## Target Files
- [x] `libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts`

## Implementation Steps (TDD: Red Phase Only)

### 1. Red Phase - Convert it.todo to Failing Tests
- [x] Read existing test file structure
- [x] Convert Handler Discovery tests (3 tests):
  - "Discovers all @Update decorated classes from shared handler modules"
  - "Discovers all @Scene decorated classes from shared handler modules"
  - "Discovers all @Wizard decorated classes from shared handler modules"
- [x] Convert Listener Registration tests (3 tests):
  - "Registers @Start, @Command, @On decorated methods on Composer"
  - "Wraps listener callbacks with NestJS external context"
  - "Auto-replies with handler return value when non-void"
- [x] Convert Scene Registration tests (3 tests):
  - "Registers @Scene classes as BaseScene on per-bot Stage"
  - "Registers @Wizard classes as WizardScene with @WizardStep middlewares"
  - "Warns and skips duplicate scene IDs during registration"
- [x] Convert Bot Target Filtering tests (2 tests):
  - "Extracts bot target ID from @ForBot decorator metadata"
  - "Skips handler registration when @ForBot botId does not match current bot"
- [x] Convert Feature Flag Filtering tests (2 tests):
  - "Extracts feature key from @RequiresFeature decorator metadata"
  - "Evaluates feature flag against bot settings for handler registration decision"
- [x] Add minimal mock structure placeholders
- [x] Run tests and confirm all 13 tests fail (Red state) - Note: Task spec says 14 but lists 13

### Test Conversion Pattern
```typescript
// Before (it.todo)
it.todo('Discovers all @Update decorated classes from shared handler modules');

// After (failing test stub)
it('Discovers all @Update decorated classes from shared handler modules', () => {
  // Arrange
  // TODO: Setup mock ModulesContainer with @Update decorated classes

  // Act
  // TODO: Call DynamicListenersExplorerService discovery method

  // Assert
  expect(true).toBe(false); // Intentional failure - Red state
});
```

## Completion Criteria
- [x] All 13 `it.todo()` converted to `it()` with failing assertions (Note: spec says 14 but lists 13)
- [x] Test file compiles without errors
- [x] `npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts` runs
- [x] All 13 tests fail (Red state confirmed)

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts
```

Expected output: 14 tests, 14 failed, 0 passed

## Notes
- Impact scope: Test file only - no production code changes
- Constraints: Do not implement actual test logic - only stubs
- The failing assertions are intentional for TDD Red state
- Test implementation will happen in Phase 3 tasks alongside service implementation
