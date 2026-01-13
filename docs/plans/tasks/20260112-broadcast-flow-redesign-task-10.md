# Task: Execute E2E Tests

Metadata:
- Dependencies: Tasks 1-9 complete
- Provides: E2E test results for all acceptance criteria
- Size: Small (1 file)
- Phase: 4 - Quality Assurance
- Verification Level: L1 (Functional Operation)
- Acceptance Criteria: All AC (AC1-AC6)

## Implementation Content

Execute and resolve the E2E tests for the broadcast flow redesign. The test file contains `it.todo` placeholders that need to be implemented to verify the complete user journey.

## Target Files

- [ ] `libs/masterbot/src/__tests__/e2e/broadcast-flow-redesign.e2e.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [ ] Review existing E2E test patterns in the codebase
- [ ] Identify test utilities and helpers available
- [ ] Check test file structure and setup

### 2. Green Phase

- [ ] Resolve primary E2E test `it.todo`:
  ```typescript
  it('User Journey: Manager broadcasts to multiple subscriptions with deduplicated recipients', async () => {
    // Setup: Create test data
    // - Bot with 2+ subscriptions
    // - Overlapping subscribers (user A in both subs)
    // - Non-overlapping subscribers

    // Step 1: /broadcast -> verify bot selection keyboard shown
    await sendCommand('/broadcast');
    expect(lastMessage).toContain('Bot selection');

    // Step 2: Select bot -> verify subscription toggle keyboard
    await clickButton('broadcast_bot_1');
    expect(lastMessage).toContain('Select subscriptions');
    expect(lastMessage).toContain('users)');

    // Step 3: Toggle 2 subscriptions
    await clickButton('broadcast_sub_toggle_1');
    await clickButton('broadcast_sub_toggle_2');

    // Step 4: Click Done -> verify status filter shown
    await clickButton('broadcast_sub_done');
    expect(lastMessage).toContain('Active');
    expect(lastMessage).toContain('Expired');

    // Step 5: Select status -> verify message prompt
    await clickButton('broadcast_filter_active');
    expect(lastMessage).toContain('Enter your message');

    // Step 6: Send message -> verify preview with breakdown
    await sendMessage('Test broadcast message');
    expect(lastMessage).toContain('Broadcast Preview');
    expect(lastMessage).toContain('unique users');
    expect(lastMessage).toContain('Subscription');

    // Step 7: Confirm -> verify delivery report
    await clickButton('broadcast_confirm');
    expect(lastMessage).toContain('Broadcast Complete');
    expect(lastMessage).toContain('queued');

    // Verify deduplication: Total queued < sum of subscription counts
    // (because overlapping users receive message once)
  });
  ```

- [ ] Implement edge case tests (if time permits):
  ```typescript
  it('should handle bot with no subscribers in all subscriptions (fallback)', async () => {
    // Setup: Bot with 0 subscribers in all subscriptions
    // Verify: All subscriptions shown anyway
  });

  it('should work correctly with single subscription selection', async () => {
    // Setup: Select only 1 subscription
    // Verify: Works same as old flow but with new UI
  });
  ```

- [ ] Run E2E tests and verify all pass

### 3. Refactor Phase

- [ ] Clean up test data after tests
- [ ] Ensure tests are independent and repeatable
- [ ] Add meaningful test names and comments

## E2E Test Coverage

| Test | AC Coverage | Status |
|------|-------------|--------|
| Multi-subscription broadcast journey | AC1-AC6 | Implement |
| Bot with no subscribers fallback | AC2 | Optional |
| Single subscription selection | AC3, AC6 | Optional |

## Test Setup Requirements

```typescript
// Required test setup
beforeEach(async () => {
  // Create test bot
  // Create test subscriptions (2+)
  // Create test users with overlapping subscriptions
  // Initialize test context with manager role
});

afterEach(async () => {
  // Clean up test data
  // Reset session state
});
```

## Completion Criteria

- [ ] Primary E2E test passes (User Journey)
- [ ] Test verifies complete flow: /broadcast -> bot -> subscriptions -> status -> message -> confirm
- [ ] Test verifies deduplication (unique user count < sum of subscription counts)
- [ ] Test verifies preview shows breakdown
- [ ] Test verifies delivery report shows queued count
- [ ] All AC verified through test assertions

## Quality Check Commands

```bash
npm test -- libs/masterbot/src/__tests__/e2e/broadcast-flow-redesign.e2e.spec.ts
```

## Notes

- **Impact scope**: Full flow verification
- **Constraints**: Tests must be independent and repeatable
- **Pattern Reference**: Follow existing E2E test patterns in codebase
- **ROI Consideration**: Edge case tests may be deferred if time constrained (ROI < 70)
