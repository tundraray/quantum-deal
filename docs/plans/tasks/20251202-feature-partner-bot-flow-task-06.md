# Task: Implement ChannelVerificationAction for "I subscribed" Button

Metadata:
- Dependencies: Task 1.3 (ChannelVerifierService), Task 1.4 (PartnerFlowService)
- Provides: libs/partner-bot/src/actions/channel-verification.action.ts
- Size: Small (1-2 files)

## Implementation Content

Implement NestJS Update handler for "I subscribed" button callback. Handles rate limiting check, channel membership verification, and trial activation coordination.

**Reference dependency deliverables:**
- Task 1.3: services/channel-verifier.service.ts
- Task 1.4: services/partner-flow.service.ts

## Target Files

- [x] `libs/partner-bot/src/actions/channel-verification.action.ts`
- [x] `libs/partner-bot/src/actions/__tests__/channel-verification.action.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Review Task 1.3 deliverable: services/channel-verifier.service.ts
- [x] Review Task 1.4 deliverable: services/partner-flow.service.ts
- [x] Create `libs/partner-bot/src/actions/__tests__/channel-verification.action.spec.ts`
- [x] Write failing tests:
  - User clicks "I subscribed" button
  - ChannelVerifierService.isRateLimited() called
  - If rate limited: Rate limit error message shown
  - If not rate limited: bot_users.state.verificationAttempts incremented
  - ChannelVerifierService.verifyMembership() called
  - If verified: PartnerFlowService.handleVerificationRequest() called, trial UI sent
  - If not verified: partner_verification_failed message sent, retry button shown
- [x] Run tests and confirm failure

### 2. Green Phase
- [x] Create `libs/partner-bot/src/actions/channel-verification.action.ts`
- [x] Implement NestJS Update handler class with @Update() decorator
- [x] Add @Injectable() decorator for dependency injection
- [x] Inject dependencies: ChannelVerifierService, PartnerFlowService, BotMessagesRepository, BotUsersRepository, BotSettingsRepository
- [x] Implement @Action('partner_verify_subscription') decorated method handleVerify(@Ctx() ctx: UserContext):
  - Get userId, botId, lang from context
  - Check rate limit via ChannelVerifierService.isRateLimited()
  - If rate limited: Send rate limit error, return
  - Increment bot_users.state.verificationAttempts counter
  - Update lastVerificationAttempt timestamp
  - Get channelId from bot_settings.partner
  - Call ChannelVerifierService.verifyMembership(channelId, userId)
  - If verified: Call PartnerFlowService.handleVerificationRequest(), send trial UI via PartnerFlowService.sendTrialUI()
  - If not verified: Send partner_verification_failed message with retry button
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase
- [x] Extract error message sending to helper method
- [x] Add structured logging for verification attempts
- [x] Add error handling for missing partner configuration
- [x] Confirm added tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L1: User clicks button, verification executes, appropriate message sent)
- [x] Rate limiting enforced
- [x] State transitions correct
- [x] Retry button works after verification failure

## Notes

**Impact Scope:**
- Handles "I subscribed" button callback
- Coordinates ChannelVerifierService and PartnerFlowService
- Integration tested in Task 1.10

**Constraints:**
- Must use NestJS Telegraf decorators (@Update, @Action, @Ctx)
- Must inject dependencies via constructor
- Follow existing action handler patterns in libs/bot

**Callback Data:**
Button callback data: 'partner_verify_subscription'

**Error Messages:**
- Rate limit: Show attempts count and reset time
- Verification failed: Show channel name, include retry button
