# Overall Design Document: Partner Bot Flow Implementation

Generation Date: 2025-12-02
Target Plan Document: 20251202-feature-partner-bot-flow.md

## Project Overview

### Purpose and Goals

Implement a specialized partner bot flow that gates trial activation behind channel subscription verification, enabling partner-driven user acquisition through Telegram channels. This feature creates a new `libs/partner-bot` library integrating with existing multi-bot infrastructure while maintaining zero breaking changes to the core system.

**Key Business Value:**
- Enable partner-driven lead generation through channel subscriptions
- Improve trial conversion quality by filtering uncommitted users
- Provide measurable user acquisition metrics to partners
- Support referral mechanisms for trial extension

### Background and Context

The Quantum Deal platform operates a multi-bot architecture serving different broker partners. While the main bot offers direct trial activation, partner bots need a different user journey that drives users to subscribe to partner channels before accessing premium features.

**Implementation includes:**
1. Channel Verification Flow using Telegram `getChatMember` API
2. Trial Activation Integration via wrapper pattern reusing existing `TrialService`
3. Multi-Language Support: 6 message types × 8 languages (48 SQL inserts)
4. Trial UI with Action Buttons: Extend Free Period and Buy Subscription
5. Daily Reminder System: Indefinite reminders for expired trials until user action

## Task Division Design

### Division Policy

**Implementation Approach:** Vertical Slice (Feature-Driven Development)

**Reasoning:**
1. **Complete User Value Per Phase:** Each phase delivers working end-to-end functionality users can interact with
2. **Low Inter-Feature Dependencies:** Partner bot flow isolated from standard bot flow
3. **Early Validation:** Can test verification → activation → reminder flow as phases complete
4. **Parallel Development Possibility:** Different components can be developed in parallel after foundation

**Verifiability Level Distribution:**
- Phase 1-3: L1 (Functional) - Users can interact with features
- Phase 4: L2 (Tests Pass) - Comprehensive quality assurance

### Inter-task Relationship Map

```
Phase 1: Foundation + Core Verification
├── Task 1.1: Partner Types Definition → Deliverable: types/partner-settings.ts
├── Task 1.2: SQL Messages Generation → Deliverable: migrations/partner_bot_messages.sql
├── Task 1.3: ChannelVerifierService (depends on Task 1.1)
├── Task 1.4: PartnerFlowService (depends on Tasks 1.1, 1.3)
├── Task 1.5: StartCommandUpdate (depends on Tasks 1.2, 1.4)
├── Task 1.6: ChannelVerificationAction (depends on Tasks 1.3, 1.4)
├── Task 1.7: Module Registration (depends on Tasks 1.3-1.6)
├── Task 1.8: ChannelVerifierService Unit Tests (depends on Task 1.3)
├── Task 1.9: PartnerFlowService Unit Tests (depends on Task 1.4)
├── Task 1.10: Integration Test - Onboarding Flow (depends on Tasks 1.5, 1.6)
└── Task 1.11: Phase 1 Completion Verification

Phase 2: Trial UI with Buttons
├── Task 2.1: TrialUIAction - Extend Button (depends on Phase 1 completion)
├── Task 2.2: TrialUIAction - Buy Button (depends on Phase 1 completion)
├── Task 2.3: TrialUIAction Unit Tests (depends on Tasks 2.1, 2.2)
├── Task 2.4: Integration Test - Button Interactions (depends on Tasks 2.1, 2.2)
└── Task 2.5: Phase 2 Completion Verification

Phase 3: Expiration Reminders
├── Task 3.1: ReminderSchedulerService (depends on Phase 1 completion)
├── Task 3.2: UserSubscriptionsRepository Methods (depends on Phase 1 completion)
├── Task 3.3: ReminderSchedulerService Unit Tests (depends on Tasks 3.1, 3.2)
├── Task 3.4: Integration Test - Reminder Flow (depends on Tasks 3.1, 3.2)
└── Task 3.5: Phase 3 Completion Verification

Phase 4: Quality Assurance
├── Task 4.1: E2E Tests Execution
├── Task 4.2: Acceptance Criteria Verification
├── Task 4.3: Quality Checks (typecheck, lint, format, build)
├── Task 4.4: Documentation Creation
└── Task 4.5: Breaking Changes Verification
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| TrialService.activate() | PartnerFlowService.handleVerificationRequest() | Yes (wrapper) | Task 1.4 |
| BotMessagesRepository.resolveMessage() | + variable interpolation | Yes (inline) | Task 1.4 |
| BotUsersRepository.updateState() | + VerificationState values | No | Task 1.1 (types) |
| bot_settings JSONB | + partner field | No | Task 1.1 (types) |
| /start command | Partner-specific handler | Yes (module) | Task 1.5 |

### Common Processing Points

**Type Definitions (Task 1.1):**
- `PartnerBotSettings`, `VerificationState`, `PartnerBotUserState`, `VerificationResult`, `ReminderStats`
- Shared across all services and actions
- Prevents duplicate type definitions

**Message Resolution Pattern:**
- All services use `BotMessagesRepository.resolveMessage()` + `string.replace()` for interpolation
- No separate interpolation service (YAGNI principle)
- Prevents inconsistent message handling

**State Management Pattern:**
- All state transitions go through `BotUsersRepository.updateState()`
- Atomic state transitions wrapped in database transactions
- Prevents state desync

**Error Handling Pattern:**
- Exponential backoff for Telegram API errors (3 retries: 1s, 2s, 4s)
- Graceful degradation for message resolution (fallback chain)
- Error isolation in batch jobs (continue with next user)

## Implementation Considerations

### Principles to Maintain Throughout

1. **Zero Breaking Changes:** Standard bot flow remains completely unchanged
2. **Type Safety:** Use proper TypeScript types, avoid `any` type
3. **Testability:** All services use dependency injection, mock external dependencies
4. **Idempotency:** Operations can be retried safely (verification, trial activation, reminders)
5. **Graceful Degradation:** Missing messages fall back to hardcoded, API errors don't crash
6. **Transaction Safety:** State transitions are atomic via database transactions

### Risks and Countermeasures

**Risk: Telegram API `getChatMember` unreliable**
- Impact: High - Users cannot verify, trial activation blocked
- Countermeasure: Exponential backoff retry (Task 1.3), manual verification admin command (future)

**Risk: State desync between verification and activation**
- Impact: High - Users verified but trial not activated
- Countermeasure: Database transactions (Task 1.4), reconciliation admin command (future)

**Risk: TrialService interface changes break wrapper**
- Impact: Medium - Partner flow stops working after `libs/bot` updates
- Countermeasure: Unit tests with mocked TrialService (Task 1.9), minimal wrapper (Task 1.4)

**Risk: Message SQL inserts missing for some languages**
- Impact: Medium - Users receive fallback English messages
- Countermeasure: Automated generation script (Task 1.2), validation test (Task 4.2)

**Risk: Reminder job resource exhaustion**
- Impact: Medium - Job takes >5 minutes or crashes
- Countermeasure: Batch processing (Task 3.1), monitoring, horizontal scaling support

### Impact Scope Management

**Allowed Change Scope:**
- New `libs/partner-bot/*` files (12-15 files)
- New migration: `libs/db/migrations/YYYYMMDD_partner_bot_messages.sql`
- JSONB field extensions: `bot_settings.settings.partner`, `bot_users.state.verification`

**No-Change Areas (Must Not Touch):**
- `libs/bot/src/services/trial.service.ts` - No modifications, only wrapper usage
- `libs/db/src/*` TypeScript interfaces - Generic JSONB remains untyped
- Database schema - No ALTER TABLE, only INSERT for bot_messages
- Existing bot commands/actions - Standard bot flow unaffected
- Multi-bot infrastructure - Parallel operation maintained

## Task-Specific Design Notes

### Phase 1: Foundation + Core Verification

**Task 1.1 - Partner Types Definition:**
- Creates foundation for all subsequent tasks
- Types must be imported from `@libs/partner-bot` in all services
- No circular dependencies allowed

**Task 1.2 - SQL Messages Generation:**
- 48 INSERT statements: 6 types × 8 languages
- Message types: `partner_welcome`, `partner_channel_prompt`, `partner_verification_failed`, `partner_trial_activated`, `partner_trial_expired`, `partner_coming_soon`
- Variables: `{channelUrl}`, `{channelName}`, `{expiryDate}`, `{daysRemaining}`, `{referralUrl}`

**Task 1.3 - ChannelVerifierService:**
- Owns all rate limiting logic (no separate rate limiter service)
- Exponential backoff: 3 retries at 1s, 2s, 4s intervals
- Valid membership statuses: `member`, `administrator`, `creator`

**Task 1.4 - PartnerFlowService:**
- Orchestrates entire flow, wraps TrialService
- Variable interpolation inline using `string.replace()`
- State transitions atomic via database transactions

**Task 1.10 - Integration Test:**
- Covers AC-PB001, AC-PB002, AC-PB011
- End-to-end: /start → verification → trial activation
- Validates TrialService wrapper pattern

### Phase 2: Trial UI with Buttons

**Task 2.1 - Extend Button:**
- Opens referral URL from `bot_settings.partner.referralUrl`
- URL validation: Must be HTTPS
- No backend logic, Telegram handles URL opening

**Task 2.2 - Buy Button:**
- Shows `partner_coming_soon` message
- Placeholder for future payment integration
- Must not crash or error

### Phase 3: Expiration Reminders

**Task 3.1 - ReminderSchedulerService:**
- Cron: Daily at 12:00 UTC
- Batch processing: 100 users per batch
- Duplicate prevention: Check `last_reminder_sent` timestamp

**Task 3.2 - Repository Methods:**
- `findExpiredTrials(botId)`: Query expired trial subscriptions
- `updateReminderSent(userId, timestamp)`: Update last reminder timestamp

### Phase 4: Quality Assurance

**Task 4.1 - E2E Tests:**
- 4 critical user journeys
- Full onboarding, error recovery, rate limiting, reminders

**Task 4.2 - Acceptance Criteria:**
- Verify all 12 AC items (AC-PB001 through AC-PB012)
- Document verification results

**Task 4.5 - Breaking Changes:**
- Run existing bot tests from `libs/bot/__tests__`
- Verify TrialService code unchanged
- Verify db interfaces unchanged

## Quality Standards

### Test Coverage Requirements
- Unit tests: >70% line coverage (strict requirement)
- Integration tests: All 7 integration points covered
- E2E tests: 4 critical user journeys verified

### Code Quality Standards
- Zero TypeScript errors (`npm run typecheck`)
- Zero lint errors (`npm run lint`)
- All code formatted (`npm run format`)
- Build succeeds (`npm run build`)

### Verification Levels
- **L1 (Functional):** Feature works for end-users (Phases 1-3)
- **L2 (Tests Pass):** All tests pass, coverage met (Phase 4)
- **L3 (Build Success):** No compile errors (not used, L1/L2 sufficient)

## Integration Points Reference

1. **Welcome to Channel Prompt:** StartCommandUpdate → BotMessagesRepository → PartnerFlowService
2. **Channel Verification → Trial Activation:** ChannelVerificationAction → ChannelVerifierService → Telegram API → PartnerFlowService → TrialService → BotUsersRepository
3. **Trial UI Buttons:** TrialUIAction → BotSettingsRepository → BotMessagesRepository
4. **Daily Reminder Cron Job:** ReminderSchedulerService → UserSubscriptionsRepository → PartnerFlowService → Telegram Bot

## Deliverables Summary

**Phase 1 Deliverables:**
- Type definitions (partner-settings.ts)
- SQL migration (48 INSERT statements)
- 3 services (ChannelVerifier, PartnerFlow, Unit Tests)
- 2 actions (ChannelVerification, Unit Tests)
- 1 command (StartCommand)
- Module registration (partner-bot.module.ts)
- Integration test (onboarding flow)

**Phase 2 Deliverables:**
- TrialUIAction (Extend + Buy handlers)
- Unit tests (TrialUIAction)
- Integration test (button interactions)

**Phase 3 Deliverables:**
- ReminderSchedulerService
- Repository methods (findExpiredTrials, updateReminderSent)
- Unit tests (ReminderScheduler)
- Integration test (reminder flow)

**Phase 4 Deliverables:**
- E2E tests (4 scenarios)
- Acceptance criteria verification document
- README.md for libs/partner-bot
- Quality check results

## Success Criteria

**Phase 1 Success:**
- User can execute `/start` → receive prompt → verify → activate trial (L1)
- All 48 SQL messages retrievable from database
- Channel verification works with mocked Telegram API
- Rate limiting enforced (10 attempts/hour)
- TrialService wrapper works without modifying `libs/bot`
- Integration test passes (AC-PB001 + AC-PB002 + AC-PB011)

**Phase 2 Success:**
- "Extend" button opens referral URL (L1)
- "Buy" button shows coming soon message (L1)
- No errors or crashes
- Integration test passes (AC-PB006 + AC-PB007)

**Phase 3 Success:**
- Cron job executes daily at 12:00 UTC (L1)
- Reminders sent to expired users, duplicates prevented (L1)
- Reminders continue indefinitely until user action (L1)
- Integration test passes (AC-PB005)

**Phase 4 Success:**
- All E2E tests pass (L2)
- All 12 acceptance criteria verified (L2)
- Quality checks pass: typecheck, lint, format, build, test (L2)
- Test coverage >70% (L2)
- Documentation complete (L2)
- Zero breaking changes verified (L2)

## Next Steps

1. Execute task-executor with tasks in order: 1.1 → 1.2 → 1.3 → ... → 4.5
2. After each phase completion task, execute operational verification procedures from Work Plan
3. Track progress in Work Plan "Progress Tracking" section
4. Report blockers or issues immediately, do not proceed if unclear

---

**Document Status:** Ready for Task Execution
**Total Tasks:** 26 tasks (11 Phase 1 + 5 Phase 2 + 5 Phase 3 + 5 Phase 4)
**Estimated Duration:** 8-10 days
**Implementation Mode:** Vertical Slice (Feature-Driven)
