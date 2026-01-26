# Task: Write Unit Tests for PartnerFlowService

Metadata:
- Dependencies: Task 1.4 (PartnerFlowService implementation)
- Provides: Verified PartnerFlowService test coverage
- Size: Small (1 file)

## Implementation Content

Write comprehensive unit tests for PartnerFlowService covering message sending, variable interpolation, trial activation coordination, and error handling. Achieve >70% line coverage.

**Reference dependency deliverable:** Task 1.4 services/partner-flow.service.ts

## Target Files

- [x] `libs/partner-bot/src/services/__tests__/partner-flow.service.spec.ts` (extend existing from Task 1.4)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Review Task 1.4 deliverable: services/partner-flow.service.ts
- [x] Identify all code paths not covered by existing tests
- [x] Write additional failing tests to cover gaps

### 2. Green Phase
- [x] Extend test suite with comprehensive scenarios:

  **sendChannelPrompt() tests:**
  - [x] Retrieves partner_channel_prompt message via BotMessagesRepository
  - [x] Gets channelId from bot_settings.partner
  - [x] Gets channelUsername from bot_settings.partner (optional)
  - [x] Interpolates {channelUrl} variable correctly
  - [x] Interpolates {channelName} variable correctly
  - [x] Sends message with inline keyboard button "I subscribed"
  - [x] Button has callback data 'partner_verify_subscription'
  - [x] Updates bot_users.state.verification to 'awaiting_channel_subscription'
  - [x] Throws error if partner.channelId missing
  - [x] Falls back to global message if bot-specific not found

  **handleVerificationRequest() tests:**
  - [x] Calls ChannelVerifierService.isRateLimited()
  - [x] Returns error if rate limited
  - [x] Calls ChannelVerifierService.verifyMembership() with correct parameters
  - [x] Updates state to 'channel_verified' after successful verification
  - [x] Calls TrialService.activate(userId) after verification
  - [x] Updates state to 'trial_activated' after successful activation
  - [x] Returns VerificationResult with success=true on success
  - [x] Sends partner_verification_failed message if not verified
  - [x] Keeps state as 'awaiting_channel_subscription' if not verified
  - [x] Reverts state to 'channel_verified' if trial activation fails
  - [x] Returns VerificationResult with error on failure

  **sendTrialUI() tests:**
  - [x] Retrieves partner_trial_activated message
  - [x] Interpolates {expiryDate} variable with formatted date
  - [x] Interpolates {daysRemaining} variable with calculated days
  - [x] Builds inline keyboard with "Extend Free Period" button (URL)
  - [x] Builds inline keyboard with "Buy Subscription" button (callback)
  - [x] "Extend" button URL from bot_settings.partner.referralUrl
  - [x] "Buy" button callback data 'partner_buy_subscription'
  - [x] Calls BotCommandsService.setUserCommands() with correct features
  - [x] Sends message via Telegraf

- [x] Mock all dependencies: BotMessagesRepository, BotSettingsRepository, BotUsersRepository, TrialService, BotCommandsService, Telegraf
- [x] Run tests and confirm they pass

### 3. Refactor Phase
- [x] Organize tests by method
- [x] Use describe blocks for grouping scenarios
- [x] Extract common mock setup to beforeEach
- [x] Confirm test coverage >70%

## Completion Criteria

- [x] All unit tests pass
- [x] Operation verified (L2: >70% line coverage achieved - 92.4%)
- [x] Message retrieval tested with fallback chain
- [x] Variable interpolation tested for all message types
- [x] TrialService correctly mocked and called
- [x] State transitions tested for all paths
- [x] Error handling tested (missing config, activation failure)

## Notes

**Impact Scope:**
- Verifies AC-PB001, AC-PB002, AC-PB005
- Required for Phase 1 completion

**Coverage Target:**
>70% line coverage (strict requirement)

**Mock TrialService Response:**
```typescript
{ success: true, expiresAt: new Date('2025-12-09T12:00:00Z') }
```

**Mock Bot Settings:**
```typescript
{
  partner: {
    channelId: '@test_channel',
    channelUsername: 'Test Channel',
    referralUrl: 'https://partner.example.com/referral'
  }
}
```
