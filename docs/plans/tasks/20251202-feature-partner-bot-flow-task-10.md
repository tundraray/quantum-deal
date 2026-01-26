# Task: Write and Execute Integration Test for Complete Onboarding Flow

Metadata:
- Dependencies: Task 1.5 (StartCommandUpdate), Task 1.6 (ChannelVerificationAction)
- Provides: Verified end-to-end onboarding flow integration
- Size: Medium (1 file)

## Implementation Content

Write integration test covering complete partner bot onboarding flow: /start → welcome + channel prompt → verification → trial activation → success message. Tests AC-PB001, AC-PB002, AC-PB011.

**Reference dependency deliverables:**
- Task 1.5: commands/start/start.update.ts
- Task 1.6: actions/channel-verification.action.ts

## Target Files

- [x] `libs/partner-bot/src/__tests__/integration/partner-flow.int.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Review Task 1.5 deliverable: commands/start/start.update.ts
- [x] Review Task 1.6 deliverable: actions/channel-verification.action.ts
- [x] Verify database schema supports test data
- [x] Create test file structure

### 2. Green Phase
- [x] Create `libs/partner-bot/src/__tests__/integration/partner-flow.int.spec.ts`
- [x] Set up integration test environment:
  - In-memory or test database
  - Mock Telegram Bot API
  - Insert test bot with partner settings
  - Insert test user
  - Insert all required bot_messages (48 rows)

- [x] Write integration test scenario:
  ```
  Test: Complete Partner Bot Onboarding Flow (AC-PB001 + AC-PB002 + AC-PB011)

  Setup:
  - Test bot with partner settings (channelId, referralUrl)
  - Test user with language 'en'
  - All partner messages in database

  Steps:
  1. User sends /start command
     - Verify BotMessagesRepository.resolveMessage() called with type='partner_welcome', lang='en'
     - Verify welcome message sent to user
     - Verify state updated to 'awaiting_channel_subscription'

  2. Bot sends channel prompt
     - Verify BotMessagesRepository.resolveMessage() called with type='partner_channel_prompt'
     - Verify message contains interpolated channel URL (not placeholder {channelUrl})
     - Verify message includes inline keyboard button "I subscribed"

  3. User clicks "I subscribed" button
     - Mock Telegram API getChatMember to return { status: 'member' }
     - Verify ChannelVerifierService.verifyMembership() called
     - Verify state transitions: 'awaiting_channel_subscription' → 'channel_verified' → 'trial_activated'

  4. Trial activation
     - Verify TrialService.activate() called exactly once with correct userId
     - Verify user_subscriptions record created:
       - status = 'active'
       - subscription_type = 'trial'
       - expires_at = (now + TRIAL_DURATION_DAYS)

  5. Success message sent
     - Verify BotMessagesRepository.resolveMessage() called with type='partner_trial_activated'
     - Verify message includes interpolated {expiryDate} and {daysRemaining}
     - Verify message includes 2 buttons: "Extend Free Period" (URL), "Buy Subscription" (callback)
     - Verify BotCommandsService.setUserCommands() called

  Assertions:
  - All database state transitions persisted
  - No errors thrown during flow
  - User ends in 'trial_activated' state
  - Trial subscription record exists and valid
  ```

- [x] Run integration test and confirm it passes

### 3. Refactor Phase
- [x] Extract common test setup to helper functions
- [x] Add descriptive test names
- [x] Add comments for each verification step
- [x] Confirm test still passes

## Completion Criteria

- [x] Integration test passes end-to-end
- [x] Operation verified (L2: All assertions succeed)
- [x] AC-PB001 (Welcome and Channel Prompt) covered
- [x] AC-PB002 (Successful Verification and Trial Activation) covered
- [x] AC-PB011 (TrialService Integration) covered
- [x] Database state transitions verified
- [x] Message interpolation verified

## Notes

**Impact Scope:**
- Integration Point 1: Welcome to Channel Prompt
- Integration Point 2: Channel Verification → Trial Activation
- Required for Phase 1 completion

**Verification Points:**
- Message resolution with correct parameters
- Variable interpolation removes placeholders
- Telegram API mock returns expected response
- State transitions atomic and correct
- TrialService called once with correct parameters
- user_subscriptions record created correctly
- Success message includes all expected elements

**AC Coverage:**
- AC-PB001: Welcome Message and Channel Prompt Flow
- AC-PB002: Successful Channel Verification and Trial Activation
- AC-PB011: Integration with Existing Trial System
