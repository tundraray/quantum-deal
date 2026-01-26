# Task: Final Quality Checks

## Metadata

- **Task ID:** TASK-006
- **Phase:** 4 (Quality Assurance)
- **Priority:** High
- **Verification Level:** L2 (Test Operation)
- **Acceptance Criteria:** All (Final verification)
- **Dependencies:** TASK-005
- **Size:** N/A (Quality assurance only)

## Implementation Content

Run comprehensive quality checks to ensure all changes meet project standards. This is the final gate before considering the work plan complete.

## Quality Check Commands

Execute all checks in order:

### 1. Lint and Format Check

```bash
npm run check           # Biome (lint + format)
```

**Expected Result:** No errors or warnings

### 2. Unused Exports Detection

```bash
npm run check:unused    # Detect unused exports
```

**Expected Result:** No new unused exports introduced

### 3. TypeScript Build

```bash
npm run build           # TypeScript build
```

**Expected Result:** Build succeeds without errors

### 4. Unit Tests

```bash
npm test                # All tests
```

**Expected Result:** All tests pass

### 5. Coverage Measurement

```bash
npm run test:coverage   # Coverage measurement
```

**Expected Result:** Coverage meets 70% threshold

### 6. Integrated Check

```bash
npm run check:all       # Overall integrated check
```

**Expected Result:** All checks pass

## Completion Checklist

### Lint and Format
- [ ] `npm run check` passes with no errors
- [ ] No formatting issues
- [ ] No linting violations

### Unused Code
- [ ] `npm run check:unused` shows no new unused exports
- [ ] Any removed functionality has been properly cleaned up

### Build
- [ ] `npm run build` succeeds without errors
- [ ] No TypeScript type errors
- [ ] All imports resolved correctly

### Tests
- [ ] All unit tests pass (8 new tests from TASK-001, 002, 003)
- [ ] All integration tests pass (6 tests from TASK-005)
- [ ] No existing tests broken by changes

### Coverage
- [ ] Overall coverage meets 70% threshold
- [ ] New code has adequate test coverage
- [ ] Partner-bot library maintains coverage standards

### Acceptance Criteria Verification

Final verification that all acceptance criteria are met:

- [ ] **AC-1**: State check on /start command works correctly
  - trial_activated + active trial -> shows status
  - awaiting_channel_subscription -> re-sends prompt
  - no state -> shows welcome + prompt

- [ ] **AC-2**: Trial status button displays correctly
  - Shows days when >= 1 day remaining
  - Shows hours when < 1 day remaining
  - Button callback is `partner_trial_status`

- [ ] **AC-3**: Pending state handling works
  - Welcome message NOT re-sent
  - Verification attempt counter preserved

- [ ] **AC-4**: botUserId migration complete
  - `handleVerificationRequest()` passes `botUser.id` to TrialService
  - Error handling for null botUser

- [ ] **AC-5**: ReminderSchedulerService verified
  - Uses `botUser.id` for subscriptions
  - Uses `botUser.userId` for Telegram API

- [ ] **AC-6**: Context integration works
  - `ctx.botUser` available in handlers
  - Correctly typed with id and state

## Test Summary

| Category | Count | Status |
|----------|-------|--------|
| Unit Tests (new) | 8 | Pending |
| Integration Tests | 6 | Pending |
| Existing Tests | - | Pending |
| **Total New** | **14** | **Pending** |

## Issue Resolution

If any checks fail:

1. **Lint/Format failures:**
   - Run `npm run check:fix` to auto-fix
   - Manual review for complex issues

2. **Type errors:**
   - Review type definitions
   - Check import statements
   - Verify interface changes

3. **Test failures:**
   - Review failed test output
   - Check if test expectations match new behavior
   - Verify mocks are properly configured

4. **Coverage below threshold:**
   - Add tests for uncovered branches
   - Review coverage report for gaps

## Notes

### Quality Gate
This task is the final gate. Do NOT proceed to marking the work plan complete until all checks pass.

### Documentation
After all checks pass, update the work plan progress tracking:
- Mark all phases complete
- Update test resolution progress to final counts
- Verify all tasks checked off

### Rollback Consideration
If significant issues are discovered:
1. Document the issues
2. Create follow-up tasks if needed
3. Consider partial rollback of problematic changes
