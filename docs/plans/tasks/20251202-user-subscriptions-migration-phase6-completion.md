# Phase 6 Completion Verification: Quality Assurance

Metadata:
- Phase: 6 (Quality Assurance)
- Dependencies: All phases (1-5), Task 12
- Verification Level: L1 (Functional Operation)

## Purpose
Verify Phase 6 (Quality Assurance) is complete and the entire migration is ready for deployment.

## Completion Checklist

### Task Completion
- [ ] Task 12: Quality Assurance - All Checks Pass

### All Acceptance Criteria Summary

#### Schema (AC-1.x)
- [ ] AC-1.1: `user_subscriptions.botUserId` column exists
- [ ] AC-1.2: FK constraint references `bot_users.id` with CASCADE
- [ ] AC-1.3: Index `idx_user_subscriptions_bot_user` exists
- [ ] AC-1.4: TypeScript types reflect new column

#### Migration (AC-2.x)
- [ ] AC-2.1: All subscriptions have non-null `botUserId`
- [ ] AC-2.2: Orphaned subscriptions have `bot_users` created
- [ ] AC-2.3: `botUserId` values correctly mapped
- [ ] AC-2.4: Migration is idempotent
- [ ] AC-2.5: Seed migration prerequisite verified

#### Repository (AC-3.x)
- [ ] AC-3.1: `findByBotUserId` returns correct subscriptions
- [ ] AC-3.2: `findActiveByBotUserId` filters correctly
- [ ] AC-3.3: `activateForBotUser` creates with botUserId
- [ ] AC-3.4: Eligibility checked per bot-user
- [ ] AC-3.5: Old methods deprecated with warnings

#### Services (AC-4.x)
- [ ] AC-4.1: `TrialService.isEligible()` uses botUserId
- [ ] AC-4.2: `TrialService.activate()` uses botUserId
- [ ] AC-4.3: `SubscriptionExpirationService` works correctly
- [ ] AC-4.4: `ReminderSchedulerService` works correctly

#### Middleware (AC-5.x)
- [ ] AC-5.1: Middleware passes `botUser.id` to operations
- [ ] AC-5.2: Context includes `botUser` with valid id

#### Quality (AC-6.x)
- [ ] AC-6.1: All unit tests pass
- [ ] AC-6.2: All integration tests pass
- [ ] AC-6.3: Build succeeds
- [ ] AC-6.4: Lint/format passes

### Quality Metrics
- [ ] Test pass rate: 100%
- [ ] Coverage: >= 70%
- [ ] Build: Success
- [ ] Lint: Pass
- [ ] Type errors: 0

## Final Verification Commands
```bash
# Complete quality check
npm run check:all
npm test
npm run build
npm run test:coverage:fresh
```

## Migration Completion Checklist

### Pre-Deployment
- [ ] All tasks completed (01-12)
- [ ] All acceptance criteria verified
- [ ] All quality checks pass
- [ ] Migration SQL ready
- [ ] Documentation updated

### Deployment (User Actions)
- [ ] Database backup created
- [ ] Migration executed: `pnpm drizzle-kit migrate`
- [ ] Post-migration verification queries run
- [ ] Application deployed
- [ ] E2E flow verified

### Post-Deployment Monitoring
- [ ] Monitor error logs for subscription-related issues
- [ ] Verify trial eligibility working per-bot
- [ ] Verify subscription queries returning correct data
- [ ] Monitor for any FK constraint violations

## Rollback Plan
If critical issues discovered post-deployment:
1. Redeploy previous application version (uses `userId` column)
2. All data remains intact (both columns populated)
3. Investigate and fix issues
4. Re-deploy with fixes

## Future Cleanup (After Validation Period)
After 1-2 weeks of successful operation:
- Drop `userId` column
- Drop `idx_user_subscriptions_user_bot` index
- Remove deprecated repository methods
- Update TypeScript types

## Migration Complete Criteria
- [ ] All 12 tasks completed
- [ ] All 22 acceptance criteria verified
- [ ] All quality checks pass
- [ ] User has run migration successfully
- [ ] E2E verification completed
- [ ] No critical errors in production
