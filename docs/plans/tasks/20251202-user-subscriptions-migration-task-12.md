# Task: Quality Assurance - All Checks Pass

Metadata:
- Phase: 6 (Quality Assurance)
- Dependencies: All previous tasks (01-11)
- Provides: Final verification that migration is complete and quality standards met
- Size: Small (verification only)

## Implementation Content
Execute all quality checks to verify the migration is complete and meets project quality standards. This includes running all tests, build verification, lint checks, and coverage measurement.

## Target Files
- All test files
- Any documentation needing updates

## Implementation Steps

### 1. Verify All Tests Pass
- [ ] Run full test suite: `npm test`
- [ ] Verify no test failures
- [ ] Check for any skipped tests that should be enabled

### 2. Verify Build Success
- [ ] Run TypeScript build: `npm run build`
- [ ] Verify no compilation errors
- [ ] Verify no type errors

### 3. Verify Lint and Format
- [ ] Run Biome lint: `npm run check`
- [ ] Fix any lint errors
- [ ] Run format check

### 4. Verify Unused Exports
- [ ] Run unused export check: `npm run check:unused`
- [ ] Address any unused exports (remove or mark as intentional)

### 5. Verify Test Coverage
- [ ] Run coverage measurement: `npm run test:coverage:fresh`
- [ ] Verify coverage >= 70%
- [ ] Identify any areas needing additional tests

### 6. Verify Design Doc Acceptance Criteria

#### Phase 1: Schema Changes
- [ ] **AC-1.1**: `user_subscriptions.botUserId` column exists in database
- [ ] **AC-1.2**: Foreign key constraint references `bot_users.id` with CASCADE delete
- [ ] **AC-1.3**: Index `idx_user_subscriptions_bot_user` exists on `botUserId`
- [ ] **AC-1.4**: TypeScript types reflect new `botUserId` column

#### Phase 2: Migration Execution
- [ ] **AC-2.1**: All existing subscriptions have non-null `botUserId` values
- [ ] **AC-2.2**: Orphaned subscriptions have corresponding `bot_users` records created
- [ ] **AC-2.3**: `botUserId` values correctly map to existing `bot_users(userId, botId)` pairs
- [ ] **AC-2.4**: Migration is idempotent (can be re-run safely)
- [ ] **AC-2.5**: Seed migration `20251126200000_seed_default_bot.sql` verified as prerequisite

#### Phase 3: Repository Updates
- [ ] **AC-3.1**: `findByBotUserId(botUserId)` returns subscriptions for specific bot-user
- [ ] **AC-3.2**: `findActiveByBotUserId(botUserId)` returns only active, non-expired subscriptions
- [ ] **AC-3.3**: `activateForBotUser(botUserId, subscriptionId, expiresAt)` creates subscription with `botUserId`
- [ ] **AC-3.4**: `isEligible(botUserId)` checks subscription history per bot-user, not globally
- [ ] **AC-3.5**: Existing methods with `userId` parameter are deprecated with warnings

#### Phase 4: Service Updates
- [ ] **AC-4.1**: `TrialService.isEligible()` accepts `botUserId` parameter
- [ ] **AC-4.2**: `TrialService.activate()` creates subscription with `botUserId`
- [ ] **AC-4.3**: `SubscriptionExpirationService` queries by `botUserId` when available
- [ ] **AC-4.4**: `ReminderSchedulerService.findExpiredTrials()` uses `botUserId` for filtering

#### Phase 5: Middleware Updates
- [ ] **AC-5.1**: Both bot and partner-bot middleware pass `botUser.id` to subscription operations
- [ ] **AC-5.2**: Context includes `botUser` with valid `id` for all subscription operations

#### Phase 6: Quality Assurance
- [ ] **AC-6.1**: All unit tests pass with new `botUserId` parameter
- [ ] **AC-6.2**: All integration tests pass with actual database
- [ ] **AC-6.3**: TypeScript build succeeds with no type errors
- [ ] **AC-6.4**: Biome lint/format checks pass

### 7. Update Documentation (If Needed)
- [ ] Check if any README files need updates
- [ ] Verify Design Doc reflects final implementation
- [ ] Verify Work Plan progress tracking updated

## Verification Commands

```bash
# Full quality check sequence
npm run check:all

# Individual checks:

# 1. All tests
npm test

# 2. Build
npm run build

# 3. Lint and format
npm run check

# 4. Unused exports
npm run check:unused

# 5. Coverage
npm run test:coverage:fresh

# 6. Type check
npx tsc --noEmit
```

## Database Verification (Post-Migration)
After user has run migration, verify:
```sql
-- Verify column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_subscriptions' AND column_name = 'bot_user_id';

-- Verify FK constraint
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'user_subscriptions' AND constraint_type = 'FOREIGN KEY';

-- Verify index
SELECT indexname FROM pg_indexes
WHERE tablename = 'user_subscriptions' AND indexname = 'idx_user_subscriptions_bot_user';

-- Verify data populated
SELECT COUNT(*) FROM user_subscriptions WHERE bot_user_id IS NULL AND bot_id IS NOT NULL;
-- Expected: 0
```

## Completion Criteria
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Lint/format passes: `npm run check`
- [ ] No unused exports (or justified)
- [ ] Coverage >= 70%
- [ ] All 22 acceptance criteria verified (AC-1.x through AC-6.x)
- [ ] **AC-6.1**: All unit tests pass with new `botUserId` parameter
- [ ] **AC-6.2**: All integration tests pass with actual database
- [ ] **AC-6.3**: TypeScript build succeeds with no type errors
- [ ] **AC-6.4**: Biome lint/format checks pass

## Notes
- This is the final verification task before migration is considered complete
- All acceptance criteria from Design Doc must be verified
- Any failures should be addressed before marking migration complete
- Coverage threshold is 70% per project standards
