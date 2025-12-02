# Task: Write Unit Tests for ReminderSchedulerService

Metadata:
- Dependencies: Tasks 3.1, 3.2 (ReminderSchedulerService and repository methods)
- Provides: Verified ReminderSchedulerService test coverage
- Size: Small (1 file)

## Implementation Content

Write comprehensive unit tests for ReminderSchedulerService covering reminder dispatch, duplicate prevention, error handling, and statistics calculation. Achieve >70% line coverage.

**Reference dependency deliverables:**
- Task 3.1: services/reminder-scheduler.service.ts
- Task 3.2: Extended UserSubscriptionsRepository

## Target Files

- [ ] `libs/partner-bot/src/services/__tests__/reminder-scheduler.service.spec.ts` (extend from Task 3.1)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review Task 3.1 deliverable: services/reminder-scheduler.service.ts
- [ ] Review Task 3.2 deliverable: UserSubscriptionsRepository methods
- [ ] Identify all code paths not covered by existing tests
- [ ] Write additional failing tests to cover gaps

### 2. Green Phase
- [ ] Extend test suite with comprehensive scenarios:

  **processExpiredTrials() tests:**
  - [ ] Queries UserSubscriptionsRepository.findExpiredTrials(botId)
  - [ ] Returns empty stats if no expired users
  - [ ] Skips users who received reminder today (last_reminder_sent = today)
  - [ ] Sends reminders to users without today's reminder
  - [ ] Retrieves partner_trial_expired message via BotMessagesRepository
  - [ ] Gets referral URL from bot_settings.partner via BotSettingsRepository
  - [ ] Sends message with Extend/Buy buttons via Telegraf
  - [ ] Updates last_reminder_sent timestamp via updateReminderSent()
  - [ ] Returns accurate statistics: sent count, skipped count, failed count
  - [ ] Handles bot blocked errors: logs info, increments failed counter, continues
  - [ ] Handles message send errors: logs error, increments failed counter, continues
  - [ ] Processes all users even if some fail (error isolation)
  - [ ] Batch processing works correctly (100 users per batch)

  **Edge cases:**
  - [ ] No expired users: Returns { sent: 0, skipped: 0, failed: 0 }
  - [ ] All users already reminded today: skipped = total, sent = 0
  - [ ] Bot blocked by all users: failed = total, sent = 0
  - [ ] Missing partner.referralUrl: Logs error, sends without URL button
  - [ ] Message not found: Falls back to hardcoded message

- [ ] Mock all dependencies: UserSubscriptionsRepository, BotMessagesRepository, BotSettingsRepository, Telegraf
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Organize tests by scenario (describe blocks)
- [ ] Extract common mock setup to beforeEach
- [ ] Add descriptive test names
- [ ] Confirm test coverage >70%

## Completion Criteria

- [x] All unit tests pass
- [x] Operation verified (L2: >70% line coverage achieved)
- [x] Duplicate prevention tested
- [x] Error handling tested (bot blocked, send failures)
- [x] Statistics calculation tested
- [x] Batch processing tested
- [x] Error isolation tested (failed users don't block others)

## Notes

**Impact Scope:**
- Verifies AC-PB005 (Trial Expiration Daily Reminders)
- Required for Phase 3 completion

**Coverage Target:**
>70% line coverage (strict requirement)

**Mock Data Examples:**
```typescript
// Expired users
[
  { userId: 1, botId: 1, lang: 'en', last_reminder_sent: null },
  { userId: 2, botId: 1, lang: 'ru', last_reminder_sent: '2025-12-01' },
  { userId: 3, botId: 1, lang: 'en', last_reminder_sent: '2025-12-02' }, // Today
]

// Expected stats
{ sent: 1, skipped: 1, failed: 0 } // User 1 sent, User 2 sent, User 3 skipped
```
