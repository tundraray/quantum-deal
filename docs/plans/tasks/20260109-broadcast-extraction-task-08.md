# Task: Final Quality Checks

Metadata:
- Phase: 4 (Quality Assurance)
- Dependencies: Task 07 (E2E tests complete)
- Provides: Complete quality verification of broadcast extraction
- Size: N/A (verification only)
- Verification Level: L2 (Test Operation)

## Implementation Content

Execute comprehensive quality checks to verify all Design Doc acceptance criteria are achieved and the implementation meets quality standards.

## Target Files

None - this task is verification only.

## Implementation Steps

### 1. Run Full Quality Check Suite

```bash
# Biome (lint + format)
npm run check

# Detect unused exports
npm run check:unused

# TypeScript build
npm run build

# All tests
npm test

# Coverage measurement
npm run test:coverage

# Overall integrated check
npm run check:all
```

### 2. Verify Design Doc Acceptance Criteria

**New /broadcast Command:**
- [ ] `/broadcast` command responds with list of ALL active subscriptions
- [ ] List includes signals subscription (if active)
- [ ] List includes all broadcast-type subscriptions with subscribers
- [ ] Each subscription shows subscriber count
- [ ] Subscriptions with 0 subscribers are filtered out

**Broadcast Filter Flow:**
- [ ] After subscription selection, status filter keyboard appears (Active/Expired)
- [ ] After status selection, bot filter keyboard appears (All bots / Specific bot)
- [ ] After bot selection, message input prompt appears
- [ ] Message preview shows subscription name, target status, target bot, recipient count
- [ ] Confirm/Cancel buttons work correctly

**Removed /subscription Broadcast Option:**
- [ ] `/subscription` menu shows only "Create subscription" and "Close subscription"
- [ ] "Send message" button is removed from subscription menu

**Code Organization:**
- [ ] `broadcast.update.ts` file exists with `BroadcastUpdate` class
- [ ] `BroadcastUpdate` is registered in `masterbot.module.ts`
- [ ] `BROADCAST` command constant added to `constants.ts`
- [ ] `MasterbotUpdate` no longer contains broadcast handlers
- [ ] All broadcast-related session state is properly managed in `BroadcastUpdate`

**Backward Compatibility:**
- [ ] Existing subscription create flow works unchanged
- [ ] Existing subscription close flow works unchanged
- [ ] Code generation via `/code` works unchanged

### 3. Test Summary Verification

| Test Type | Count | Status |
|-----------|-------|--------|
| Unit tests (BroadcastUpdate) | 4+ | Pass |
| Integration tests | 4 | Pass |
| E2E tests | 2 | Pass |
| **Total** | **10+** | **All Pass** |

### 4. Coverage Verification

```bash
npm run test:coverage
```

Expected: Coverage meets 70% threshold for new code.

## Completion Criteria

- [ ] All linting checks pass (npm run check)
- [ ] No unused exports (npm run check:unused)
- [ ] Build succeeds without errors (npm run build)
- [ ] All unit tests pass
- [ ] All integration tests pass (4 tests)
- [ ] All E2E tests pass (2 tests)
- [ ] Coverage meets 70% threshold
- [ ] All Design Doc acceptance criteria verified

## Final Verification Commands

```bash
# Complete quality check
npm run check:all

# Verify test counts
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|Tests:)"

# Coverage report
npm run test:coverage -- --reporter=text
```

## Rollback Information (if needed)

1. **Immediate Rollback**: Revert all 4 files to restore original state
2. **Partial Rollback**: Remove BroadcastUpdate from module, restore handlers to MasterbotUpdate
3. **Session State**: No changes to session types - fully backward compatible

## Notes

- This task completes Phase 4 (Quality Assurance)
- All changes should be committed after this verification
- No code changes expected in this task (verification only)
- Estimated time: 15 minutes
