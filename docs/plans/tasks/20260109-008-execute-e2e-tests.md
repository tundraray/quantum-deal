# Task: Execute and Fix E2E Tests

Metadata:
- Dependencies: Task 007 (Integration tests passing)
- Provides: Verified end-to-end user journeys
- Size: Small (1 file)
- Phase: 4 - Quality Assurance
- Verification Level: L1 (Functional Operation)
- Acceptance Criteria: AC1, AC2, AC3, AC4, AC5

## Implementation Content

Execute the pre-defined E2E tests in `broadcast-filter-flow.e2e.spec.ts` and resolve all `it.todo` placeholders with working test implementations. These tests verify complete user journeys from filter selection through message delivery.

## Target Files

- [x] `libs/masterbot/src/__tests__/e2e/broadcast-filter-flow.e2e.spec.ts`

## Implementation Steps

### 1. Preparation

- [x] Verify Task 007 (integration tests) complete
- [x] Run build to ensure no compilation errors: `npm run build`
- [x] Review E2E test file structure

### 2. Test Implementation

Resolve each `it.todo` with working test:

**User Journey 1: Expired Subscribers Only (AC1, AC4)**
- [x] Implement: Manager sends broadcast to expired subscribers only
  ```typescript
  it('Manager sends broadcast to expired subscribers only', async () => {
    // 1. Start broadcast flow
    // 2. Select subscription
    // 3. Select "Expired subscribers"
    // 4. Select "All bots"
    // 5. Enter message
    // 6. Verify preview shows "Target: Expired subscribers"
    // 7. Confirm broadcast
    // 8. Verify only expired subscribers received message
  });
  ```

**User Journey 2: Combined Filters (AC1-4)**
- [x] Implement: Manager sends broadcast with combined filters
  ```typescript
  it('Manager sends broadcast with combined filters', async () => {
    // 1. Start broadcast flow
    // 2. Select subscription
    // 3. Select "Expired subscribers"
    // 4. Select specific bot
    // 5. Enter message
    // 6. Verify preview shows both filters and count
    // 7. Confirm broadcast
    // 8. Verify only matching subscribers received message
  });
  ```

**User Journey 3: Backward Compatibility (AC5)**
- [x] Implement: Default broadcast flow works identically
  ```typescript
  it('Default broadcast flow works identically (backward compatibility)', async () => {
    // 1. Start broadcast flow
    // 2. Select subscription
    // 3. Select "Active subscribers" (or default)
    // 4. Select "All bots"
    // 5. Enter message
    // 6. Confirm broadcast
    // 7. Verify behavior matches pre-filter implementation
  });
  ```

**Edge Case: No Expired Subscribers**
- [x] Implement: Error handling when no expired subscribers found
  ```typescript
  it('Shows appropriate message when no expired subscribers found', async () => {
    // 1. Ensure no expired subscriptions exist
    // 2. Start broadcast flow
    // 3. Select subscription
    // 4. Select "Expired subscribers"
    // 5. Verify "No expired subscribers found" message
    // 6. Verify graceful return to filter selection
  });
  ```

### 3. Verification

- [x] Run all E2E tests: `npm test -- libs/masterbot/src/__tests__/e2e/broadcast-filter-flow.e2e.spec.ts`
- [x] Verify all 4 tests pass
- [x] Verify tests cover all acceptance criteria

## Completion Criteria

- [x] All 4 E2E tests pass
- [x] No `it.todo` remaining in test file
- [x] All acceptance criteria covered
- [x] Edge cases handled gracefully

## Quality Check Commands

```bash
npm test -- libs/masterbot/src/__tests__/e2e/broadcast-filter-flow.e2e.spec.ts
```

## Test Resolution Progress

| # | AC | Test Description | Status |
|---|----|--------------------|--------|
| 1 | AC1, AC4 | Expired subscribers broadcast (all bots) | it.todo -> Pass |
| 2 | AC1-4 | Combined filters broadcast | it.todo -> Pass |
| 3 | AC5 | Default flow backward compatibility | it.todo -> Pass |
| 4 | Edge | No expired subscribers handling | it.todo -> Pass |

**Target: 4/4 tests passing**

## Notes

- **E2E tests simulate complete user interaction** - use Telegraf test utilities
- **Test isolation**: Each test should have clean state
- **Timeout**: E2E tests may need longer timeout (30s+)
- **Mocking**: Only external services (Telegram API) should be mocked

## E2E Test Pattern

```typescript
describe('Broadcast Filter Flow E2E', () => {
  let testContext: TestContext;
  let mockBot: MockBot;

  beforeEach(async () => {
    testContext = await createTestContext();
    mockBot = testContext.mockBot;

    // Setup test data
    await setupTestSubscriptions(testContext);
  });

  afterEach(async () => {
    await cleanupTestData(testContext);
  });

  it('Manager sends broadcast to expired subscribers only', async () => {
    // Simulate /subscription command
    await mockBot.sendCommand('/subscription');
    expect(mockBot.lastReply()).toContain('subscription list');

    // Simulate subscription selection
    await mockBot.pressButton('broadcast_sub_1');
    expect(mockBot.lastReply()).toContain('Select subscriber type');

    // Simulate status filter selection
    await mockBot.pressButton('broadcast_filter_expired');
    expect(mockBot.lastReply()).toContain('Select bot');

    // Simulate bot filter selection
    await mockBot.pressButton('broadcast_bot_all');
    expect(mockBot.lastReply()).toContain('Enter your message');

    // Simulate message input
    await mockBot.sendMessage('Test broadcast message');
    expect(mockBot.lastReply()).toContain('Target: Expired subscribers');
    expect(mockBot.lastReply()).toContain('Bot: All bots');

    // Simulate confirmation
    await mockBot.pressButton('broadcast_confirm');
    expect(mockBot.lastReply()).toContain('Broadcast sent');

    // Verify delivery
    const deliveredMessages = await getDeliveredMessages(testContext);
    expect(deliveredMessages.every(m => m.recipientExpired)).toBe(true);
  });
});
```

## Acceptance Criteria Verification Matrix

| AC | Test Coverage | Verification Method |
|----|---------------|---------------------|
| AC1 | Test 1, 2 | Expired filter selection, recipient verification |
| AC2 | Test 2 | Bot filter selection, recipient verification |
| AC3 | Test 2 | Combined filters, count verification |
| AC4 | Test 1, 2 | Preview message assertions |
| AC5 | Test 3 | Default flow behavior comparison |
