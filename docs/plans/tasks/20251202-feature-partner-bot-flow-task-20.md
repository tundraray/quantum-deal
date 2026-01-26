# Task: Write and Execute Integration Test for Daily Reminder Flow

Metadata:
- Dependencies: Tasks 3.1, 3.2 (ReminderSchedulerService and repository methods)
- Provides: Verified reminder flow integration
- Size: Small (1 file, extend existing)

## Implementation Content

Write integration test for daily reminder flow: create expired trial user, trigger cron job, verify reminder sent, timestamp updated, duplicate prevention works. Tests AC-PB005.

**Reference dependency deliverables:**
- Task 3.1: services/reminder-scheduler.service.ts
- Task 3.2: UserSubscriptionsRepository methods

## Target Files

- [ ] `libs/partner-bot/src/__tests__/integration/partner-flow.int.test.ts` (extend from Task 1.10)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review Task 3.1 deliverable: services/reminder-scheduler.service.ts
- [ ] Review Task 3.2 deliverable: UserSubscriptionsRepository methods
- [ ] Review existing integration tests
- [ ] Plan test scenario extension

### 2. Green Phase
- [ ] Extend `libs/partner-bot/src/__tests__/integration/partner-flow.int.test.ts`
- [ ] Add integration test scenario:
  ```
  Test: Daily Reminder Flow (Integration Point 4: AC-PB005)

  Setup:
  - Test bot with partner settings
  - Test user with expired trial:
    - user_subscriptions.status = 'expired'
    - user_subscriptions.subscription_type = 'trial'
    - user_subscriptions.expires_at = (yesterday)
    - user_subscriptions.last_reminder_sent = null

  Steps:
  1. Trigger cron job (call processExpiredTrials(botId))
     - Verify UserSubscriptionsRepository.findExpiredTrials() called
     - Verify expired users queried from database

  2. First reminder sent
     - Verify BotMessagesRepository.resolveMessage() called with type='partner_trial_expired', lang=user.lang
     - Verify reminder message retrieved from database
     - Verify message includes Extend/Buy buttons
     - Verify Telegraf.sendMessage() called with correct userId and message
     - Verify last_reminder_sent timestamp updated in database to today

  3. Duplicate prevention (same day)
     - Trigger cron job again immediately
     - Verify user skipped (skipped count = 1, sent count = 0)
     - Verify no new message sent (Telegraf.sendMessage not called again)
     - Verify timestamp unchanged

  4. Next day reminder
     - Fast-forward time 24 hours (update test clock or modify timestamp)
     - Trigger cron job again
     - Verify user receives reminder (sent count = 1)
     - Verify timestamp updated to new date

  Assertions:
  - Reminder sent to expired users without today's reminder
  - last_reminder_sent timestamp updated after send
  - Duplicate prevention works (max 1 reminder per day)
  - Reminders continue indefinitely (sent again next day)
  - Statistics accurate (sent + skipped + failed = total)
  ```

- [ ] Run integration test and confirm it passes

### 3. Refactor Phase
- [ ] Extract reminder test helpers
- [ ] Add time manipulation utilities (for "next day" simulation)
- [ ] Add descriptive test names
- [ ] Confirm test still passes

## Completion Criteria

- [x] Integration test passes end-to-end
- [x] Operation verified (L2: All assertions succeed)
- [x] AC-PB005 (Trial Expiration Daily Reminders) covered
- [x] Duplicate prevention verified
- [x] Indefinite reminder continuation verified
- [x] Statistics calculation verified

## Notes

**Impact Scope:**
- Integration Point 4: Daily Reminder Cron Job
- Required for Phase 3 completion

**Verification Points:**
- UserSubscriptionsRepository.findExpiredTrials() query
- BotMessagesRepository.resolveMessage() for partner_trial_expired
- Reminder message includes buttons
- last_reminder_sent timestamp updated
- Duplicate prevention on same day
- Reminder sent again on next day
- Statistics accurate

**AC Coverage:**
- AC-PB005: Trial Expiration Daily Reminders

**Time Simulation:**
For "next day" test, update last_reminder_sent to yesterday, then run job again
