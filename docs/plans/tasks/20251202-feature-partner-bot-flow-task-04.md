# Task: Implement PartnerFlowService Orchestrating Verification and Trial Activation

Metadata:
- Dependencies: Task 1.1 (types), Task 1.3 (ChannelVerifierService)
- Provides: libs/partner-bot/src/services/partner-flow.service.ts
- Size: Medium (1-2 files)

## Implementation Content

Implement service that orchestrates the entire partner bot flow: message sending, variable interpolation, channel verification coordination, and trial activation via TrialService wrapper pattern.

**Reference dependency deliverables:**
- Task 1.1: types/partner-settings.ts (VerificationResult, PartnerBotSettings)
- Task 1.3: services/channel-verifier.service.ts

## Target Files

- [x] `libs/partner-bot/src/services/partner-flow.service.ts`
- [x] `libs/partner-bot/src/services/__tests__/partner-flow.service.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Review Task 1.1 deliverable: types/partner-settings.ts
- [x] Review Task 1.3 deliverable: services/channel-verifier.service.ts
- [x] Create `libs/partner-bot/src/services/__tests__/partner-flow.service.spec.ts`
- [x] Write failing tests for sendChannelPrompt():
  - Retrieves partner_channel_prompt message via BotMessagesRepository
  - Gets channelId and channelUsername from bot_settings.partner
  - Interpolates {channelUrl} and {channelName} variables using string.replace()
  - Sends message with inline keyboard button "I subscribed"
  - Updates bot_users.state.verification to 'awaiting_channel_subscription'
- [x] Write failing tests for handleVerificationRequest():
  - Calls ChannelVerifierService.isRateLimited(), returns error if rate limited
  - Calls ChannelVerifierService.verifyMembership() with channel ID and user ID
  - If verified: Updates state to 'channel_verified', calls TrialService.activate(), updates state to 'trial_activated'
  - If not verified: Sends partner_verification_failed message, keeps state as 'awaiting_channel_subscription'
  - If trial activation fails: Reverts state to 'channel_verified', returns error
- [x] Write failing tests for sendTrialUI():
  - Retrieves partner_trial_activated message
  - Interpolates {expiryDate} and {daysRemaining} variables
  - Builds inline keyboard with 2 buttons: "Extend Free Period" (URL), "Buy Subscription" (callback)
  - Calls BotCommandsService.setUserCommands()
- [x] Run tests and confirm failure

### 2. Green Phase
- [x] Create `libs/partner-bot/src/services/partner-flow.service.ts`
- [x] Implement NestJS Injectable service with constructor injection:
  - BotMessagesRepository, BotSettingsRepository, BotUsersRepository, TrialService, BotCommandsService, Telegraf
- [x] Implement sendChannelPrompt(userId, botId, lang):
  - Retrieve partner_channel_prompt message
  - Get partner settings from bot_settings
  - Interpolate variables: message.replace('{channelUrl}', url).replace('{channelName}', name)
  - Send with inline keyboard button callback data: 'partner_verify_subscription'
  - Update state to 'awaiting_channel_subscription'
- [x] Implement handleVerificationRequest(userId, botId):
  - Check rate limit via ChannelVerifierService.isRateLimited()
  - Call ChannelVerifierService.verifyMembership()
  - If verified: Wrap state update + TrialService.activate() in transaction
  - If activation fails: Revert state to 'channel_verified'
  - Return VerificationResult
- [x] Implement sendTrialUI(userId, botId, lang, expiresAt):
  - Retrieve partner_trial_activated message
  - Interpolate {expiryDate}, {daysRemaining}
  - Build keyboard: Extend (URL from settings.partner.referralUrl), Buy (callback 'partner_buy_subscription')
  - Send message
  - Call BotCommandsService.setUserCommands()
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase
- [x] Extract variable interpolation to helper method
- [x] Add error handling for missing partner configuration
- [x] Add structured logging for state transitions
- [x] Confirm added tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L2: Unit tests pass with >70% coverage)
- [x] TrialService correctly mocked and called in tests
- [x] State transitions atomic via database transaction
- [x] Variable interpolation works for all message types
- [x] Error handling graceful (missing config, API failures)

## Notes

**Impact Scope:**
- Used by StartCommandUpdate (Task 1.5)
- Used by ChannelVerificationAction (Task 1.6)
- Wraps TrialService from libs/bot (no modifications to TrialService)

**Constraints:**
- Do not modify TrialService code
- Use simple string.replace() for interpolation (no template engine)
- Wrap state transitions in database transactions

**Variable Interpolation Pattern:**
```typescript
message
  .replace('{channelUrl}', channelUrl)
  .replace('{channelName}', channelName);
```

**State Transition Sequence:**
undefined → awaiting_channel_subscription → channel_verified → trial_activated
