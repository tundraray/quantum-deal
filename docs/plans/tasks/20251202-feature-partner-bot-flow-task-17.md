# Task: Implement ReminderSchedulerService with Daily Cron Job

Metadata:
- Dependencies: Phase 1 completion (message infrastructure, PartnerFlowService)
- Provides: libs/partner-bot/src/services/reminder-scheduler.service.ts
- Size: Small (1-2 files)

## Implementation Content

Implement service with daily cron job (12:00 UTC) to send trial expiration reminders to users with expired trials. Includes batch processing, duplicate prevention, and error isolation.

**Reference dependency deliverables:** Phase 1 provides message infrastructure and PartnerFlowService for message sending

## Target Files

- [x] `libs/partner-bot/src/services/reminder-scheduler.service.ts`
- [x] `libs/partner-bot/src/services/__tests__/reminder-scheduler.service.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Verify Phase 1 completion (Task 1.11 passed)
- [x] Create `libs/partner-bot/src/services/__tests__/reminder-scheduler.service.spec.ts`
- [x] Write failing tests for processExpiredTrials():
  - Queries expired trials via UserSubscriptionsRepository.findExpiredTrials()
  - Retrieves partner_trial_expired message via BotMessagesRepository
  - Gets referral URL from bot_settings
  - Sends reminder message with Extend/Buy buttons via Telegraf
  - Handles bot blocked errors gracefully (logs info, continues)
  - Returns statistics: { sent: number, failed: number }
- [x] Run tests and confirm failure

### 2. Green Phase
- [x] Create `libs/partner-bot/src/services/reminder-scheduler.service.ts`
- [x] Implement NestJS Injectable service with constructor injection:
  - UserSubscriptionsRepository, BotMessagesRepository, BotSettingsRepository, Telegraf
- [x] Add @Cron('0 12 * * *') decorator for daily execution at 12:00 UTC
- [x] Implement processExpiredTrials(botId: number):
  - Query expired trials: UserSubscriptionsRepository.findExpiredTrials(botId)
  - Initialize stats: { sent: 0, failed: 0 }
  - For each expired user:
    - Retrieve partner_trial_expired message
    - Get referral URL from bot_settings
    - Build message with Extend/Buy buttons
    - Try to send via Telegraf
      - If success: Increment sent counter
      - If bot blocked: Log info, increment failed counter, continue
      - If other error: Log error, increment failed counter, continue
  - Return stats
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase
- [x] Add structured logging for job execution
- [x] Confirm added tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L1: Cron job scheduled, reminders sent to expired users)
- [x] No duplicate checking needed (cron runs once daily at 12:00 UTC)
- [x] Bot blocked errors handled gracefully (no crash, other users processed)
- [x] Statistics accurate (sent + failed = total expired users)
- [x] Simplified implementation per user decision (no timestamp tracking)

## Notes

**Impact Scope:**
- Integration Point 4: Daily Reminder Cron Job
- Covers AC-PB005 (Trial Expiration Daily Reminders)

**Constraints:**
- Job must be idempotent (running multiple times per day sends max 1 reminder per user per day)
- Failed users must not block processing of other users
- Batch processing required for scalability

**Cron Schedule:**
'0 12 * * *' = Daily at 12:00 UTC

**Error Isolation:**
Individual user send failures must not stop entire job execution
