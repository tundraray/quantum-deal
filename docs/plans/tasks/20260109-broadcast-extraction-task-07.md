# Task: Execute E2E Tests

Metadata:
- Phase: 4 (Quality Assurance)
- Dependencies: Tasks 05, 06 complete
- Provides: E2E verification of complete user journeys
- Size: Small (1 file)
- Verification Level: L1 (Functional Operation)

## Implementation Content

Implement and execute E2E tests to verify the complete broadcast command extraction functionality works end-to-end.

## Target Files

- [x] `libs/masterbot/src/__tests__/e2e/broadcast-command.e2e.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Verify E2E test file exists with placeholder tests:
  - `it.todo('User Journey: Manager broadcasts to signals subscribers via /broadcast command')`
  - `it.todo('User Journey: /subscription for management, /broadcast for messaging')`

### 2. Green Phase

**Resolve E2E Test 1: Manager broadcasts to signals subscribers**

- [x] Implement `'User Journey: Manager broadcasts to signals subscribers via /broadcast command'`:
  - Test complete flow: /broadcast -> select signals subscription -> status filter -> bot filter -> message -> confirm
  - Verify signals subscribers receive message
  - Verify delivery report shows correct counts

```typescript
it('User Journey: Manager broadcasts to signals subscribers via /broadcast command', async () => {
  // Arrange: Create manager, signals subscription with subscribers

  // Act: Execute complete broadcast flow
  // 1. Send /broadcast command
  // 2. Select signals subscription
  // 3. Select status filter (active)
  // 4. Select bot filter (all bots)
  // 5. Enter message
  // 6. Confirm broadcast

  // Assert:
  // - Signals subscription appeared in list
  // - Filter selection worked
  // - Message was sent to subscribers
  // - Delivery report correct
});
```

**Resolve E2E Test 2: Separation of concerns**

- [x] Implement `'User Journey: /subscription for management, /broadcast for messaging'`:
  - Test /subscription shows only Create and Close buttons
  - Test /broadcast provides broadcast functionality

```typescript
it('User Journey: /subscription for management, /broadcast for messaging', async () => {
  // Arrange: Create manager

  // Act & Assert Part 1: /subscription menu
  // 1. Send /subscription command
  // 2. Verify response contains "Create subscription" button
  // 3. Verify response contains "Close subscription" button
  // 4. Verify response does NOT contain "Send message" button

  // Act & Assert Part 2: /broadcast command
  // 1. Send /broadcast command
  // 2. Verify subscription list appears
  // 3. Verify can proceed through broadcast flow
});
```

### 3. Refactor Phase

- [x] Ensure test isolation (each test independent)
- [x] Clean up test data after each test
- [x] Verify all assertions are meaningful

## E2E Test Resolution Progress

- Before: 0/2 tests implemented
- After: 2/2 tests implemented and passing

## Completion Criteria

- [x] E2E test 1 implemented: Manager broadcasts to signals subscribers
- [x] E2E test 2 implemented: Separation of /subscription and /broadcast
- [x] All E2E tests pass
- [x] Tests verify complete user journeys
- [x] Test coverage of acceptance criteria:
  - [x] AC1: /broadcast shows ALL subscription types
  - [x] AC2: Filter selection flow
  - [x] AC3: Removed broadcast from /subscription
  - [x] AC4: Confirm triggers sendBroadcast with filters

## Quality Check Commands

```bash
npm test -- libs/masterbot/src/__tests__/e2e/broadcast-command.e2e.spec.ts
```

## Notes

- Impact scope: E2E test file only
- Test framework: Vitest
- Ensure tests are independent and can run in any order
- Estimated time: 20 minutes
