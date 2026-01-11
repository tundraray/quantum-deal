# Task: Final Quality Checks

Metadata:
- Dependencies: Task 007 (Integration tests), Task 008 (E2E tests)
- Provides: Quality assurance sign-off for feature release
- Size: Small (0 files - verification only)
- Phase: 4 - Quality Assurance
- Verification Level: L2 (Test Operation)
- Acceptance Criteria: All AC achieved

## Implementation Content

Execute the complete quality check suite to ensure the broadcast filter extension meets all quality standards. This task verifies linting, unused exports, build success, test coverage, and acceptance criteria compliance.

## Target Files

No files modified - verification task only.

## Implementation Steps

### 1. Code Quality Checks

- [ ] Run Biome lint and format check:
  ```bash
  npm run check
  ```
  Expected: No lint errors, no format issues

- [ ] Check for unused exports:
  ```bash
  npm run check:unused
  ```
  Expected: No unused exports introduced by this feature

### 2. Build Verification

- [ ] Run TypeScript build:
  ```bash
  npm run build
  ```
  Expected: Build succeeds without errors

### 3. Test Suite Execution

- [ ] Run all unit tests:
  ```bash
  npm test
  ```
  Expected: All tests pass

- [ ] Run coverage measurement:
  ```bash
  npm run test:coverage
  ```
  Expected: Coverage meets 70% threshold

### 4. Integrated Quality Check

- [ ] Run full quality check suite:
  ```bash
  npm run check:all
  ```
  Expected: All checks pass

### 5. Acceptance Criteria Verification

Verify each acceptance criterion from Design Doc:

**AC1: Expired Subscription Filter Selection**
- [ ] After selecting subscription, filter options displayed
- [ ] "Expired subscribers" option functional
- [ ] Query returns users with `isActive = false AND expiresAt < NOW()`
- [ ] Only `bot_users.is_active = true` included

**AC2: Bot Selection Filter**
- [ ] "All bots" option available and functional
- [ ] Specific bot selection displays all active bots
- [ ] Bot filter applied correctly to queries

**AC3: Filter Combination**
- [ ] Both filters can be applied together
- [ ] Count reflects combined filter results
- [ ] Delivery matches preview count

**AC4: Message Preview with Filters**
- [ ] Preview shows "Target: Active/Expired subscribers"
- [ ] Preview shows "Bot: All bots / [Bot Name]"
- [ ] Recipient count accurate

**AC5: Backward Compatibility**
- [ ] Existing broadcast flow unchanged
- [ ] Default behavior (no filters) targets active subscribers
- [ ] All existing tests still pass

## Completion Criteria

- [ ] `npm run check` passes (0 errors)
- [ ] `npm run check:unused` passes (0 unused exports)
- [ ] `npm run build` succeeds
- [ ] All unit tests pass
- [ ] All integration tests pass (8 tests)
- [ ] All E2E tests pass (4 tests)
- [ ] Coverage meets 70% threshold
- [ ] All 5 acceptance criteria verified

## Quality Check Commands

```bash
# Individual checks
npm run check           # Biome (lint + format)
npm run check:unused    # Detect unused exports
npm run build           # TypeScript build
npm test                # All tests
npm run test:coverage   # Coverage measurement

# Integrated check
npm run check:all       # Overall integrated check
```

## Test Summary

| Category | Count | Status |
|----------|-------|--------|
| Unit Tests (Repository) | 4 | [ ] Pass |
| Unit Tests (Service) | 5 | [ ] Pass |
| Unit Tests (Handler) | 12+ | [ ] Pass |
| Integration Tests | 8 | [ ] Pass |
| E2E Tests | 4 | [ ] Pass |
| **Total** | **33+** | [ ] Pass |

## Coverage Report Targets

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| `user-subscriptions.repository.ts` | >= 70% | >= 70% | >= 70% | >= 70% |
| `broadcast.service.ts` | >= 70% | >= 70% | >= 70% | >= 70% |
| `masterbot.update.ts` | >= 70% | >= 70% | >= 70% | >= 70% |
| `constants.ts` | >= 70% | >= 70% | >= 70% | >= 70% |

## Final Checklist

### Code Quality
- [ ] No lint errors
- [ ] Consistent formatting
- [ ] No unused exports
- [ ] No `any` types used
- [ ] Proper error handling

### Functionality
- [ ] All features work as designed
- [ ] Edge cases handled
- [ ] Error messages user-friendly
- [ ] Session state properly managed

### Documentation
- [ ] Code comments where needed
- [ ] JSDoc on public methods
- [ ] Design Doc up to date

### Performance
- [ ] No obvious performance issues
- [ ] Database queries efficient
- [ ] No N+1 query problems

## Notes

- This is the final gate before feature completion
- All previous tasks must be complete
- Any failures require returning to fix the source task
- Document any deviations or known issues

## Sign-off

Upon successful completion:

```
Feature: Broadcast Filter Extension
Status: Complete
Date: YYYY-MM-DD
Verified by: [Name/Agent]

Quality Metrics:
- Lint: Pass
- Build: Pass
- Tests: 33+ passing
- Coverage: XX%

Acceptance Criteria: All 5 verified

Ready for deployment: Yes
```
