# Task: Quality Assurance and Final Verification

Metadata:
- Dependencies: Tasks 0001-0006 (All implementation tasks)
- Provides: Complete verification of all acceptance criteria
- Size: N/A (Verification only)
- Phase: 5 - Quality Assurance
- Verification Level: L1 (Functional Operation Verification)
- Acceptance Criteria: All (AC1-AC6)

## Implementation Content

This task verifies all acceptance criteria are met and performs final quality checks. No new code is written; this is purely verification and cleanup.

## Verification Steps

### 1. Acceptance Criteria Verification

#### AC1: "All bots" button is not displayed in bot selection keyboard
- [ ] Run `/broadcast` command
- [ ] Verify bot selection keyboard shows only specific bot buttons and cancel
- [ ] Verify no "All bots" button is present
- [ ] Document: Screenshot or text confirmation

#### AC2: `onBroadcastBotAll` handler is removed
- [ ] Search codebase: `grep -r "onBroadcastBotAll" libs/`
- [ ] Verify zero handler implementations found
- [ ] Verify build passes (compile-time verification)

#### AC3: "Without subscription" status filter option is available
- [ ] Select a bot in broadcast flow
- [ ] Verify "Without subscription (N users)" button appears
- [ ] Verify button triggers correct callback action
- [ ] Document: Screenshot or text confirmation

#### AC4: Status filter buttons display subscriber counts
- [ ] Select subscriptions and click "Done"
- [ ] Verify buttons show: "Active (N)" / "Expired (M)"
- [ ] Verify counts match expected database values
- [ ] Document: Screenshot or text confirmation

#### AC5: Subscription toggle keyboard shows total user counts
- [ ] Select a bot in broadcast flow
- [ ] Verify subscription buttons show format: "Name (N users)"
- [ ] Verify count includes all users (active + expired)
- [ ] Compare with database query result

#### AC6: "Without subscription" broadcast executes correctly
- [ ] Select "Without subscription" option
- [ ] Verify flow skips status filter step
- [ ] Enter test message and confirm
- [ ] Verify broadcast queued for non-subscribers only
- [ ] Verify users with any subscription are excluded

### 2. Quality Checks

#### Code Quality
- [ ] `pnpm typecheck` - zero errors
- [ ] `pnpm lint` - zero errors
- [ ] `pnpm format:check` - passes

#### Tests
- [ ] `pnpm test` - all pass

#### Build
- [ ] `pnpm build` - success

### 3. Code Review Checklist

- [ ] No console.log statements left in production code
- [ ] No TODO comments remaining in modified files
- [ ] Error handling consistent with existing patterns
- [ ] Logging appropriate for production
- [ ] JSDoc comments accurate and complete
- [ ] No commented-out code

### 4. E2E Verification Flow

Execute complete broadcast flows to verify integration:

#### Flow 1: Broadcast to active subscribers
1. `/broadcast` command
2. Select specific bot
3. Select subscription(s), click "Done"
4. Click "Active (N)"
5. Enter message
6. Confirm broadcast
7. Verify messages queued

#### Flow 2: Broadcast to expired subscribers
1. `/broadcast` command
2. Select specific bot
3. Select subscription(s), click "Done"
4. Click "Expired (M)"
5. Enter message
6. Confirm broadcast
7. Verify messages queued

#### Flow 3: Broadcast to users without subscription
1. `/broadcast` command
2. Select specific bot
3. Click "Without subscription"
4. Verify status filter step is SKIPPED
5. Enter message
6. Confirm broadcast
7. Verify messages queued only for non-subscribers

## Completion Criteria

- [ ] All AC1-AC6 verified with documentation
- [ ] All quality checks pass (zero errors)
- [ ] All tests pass
- [ ] E2E flows verified
- [ ] Code review checklist complete

## Quality Check Commands

```bash
# Full quality check sequence
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

## Verification Documentation Template

```markdown
## Verification Results - [Date]

### AC1: "All bots" button removed
- Status: PASS/FAIL
- Evidence: [Screenshot/Description]

### AC2: onBroadcastBotAll handler removed
- Status: PASS/FAIL
- Evidence: [Search result]

### AC3: "Without subscription" option available
- Status: PASS/FAIL
- Evidence: [Screenshot/Description]

### AC4: Status filter buttons with counts
- Status: PASS/FAIL
- Evidence: [Screenshot/Description]

### AC5: Total user counts in subscription toggle
- Status: PASS/FAIL
- Evidence: [Screenshot/Description]

### AC6: "Without subscription" broadcast works
- Status: PASS/FAIL
- Evidence: [Flow test result]

### Quality Checks
- typecheck: PASS/FAIL
- lint: PASS/FAIL
- format: PASS/FAIL
- tests: PASS/FAIL
- build: PASS/FAIL

### Reviewer: [Name]
### Date: [Date]
```

## Notes

- This task should be executed after all implementation tasks complete
- Any failures should trigger return to relevant implementation task
- Documentation of verification is important for project records
- Consider adding automated E2E tests for regression prevention
