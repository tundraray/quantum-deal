# Task: Write and Execute Integration Test for Trial UI Button Interactions

Metadata:
- Dependencies: Tasks 2.1, 2.2 (TrialUIAction implementation)
- Provides: Verified trial UI button integration
- Size: Small (1 file, extend existing)

## Implementation Content

Write integration test for trial UI button interactions: user clicks "Extend Free Period" and "Buy Subscription" buttons, verifies correct responses. Tests AC-PB006 and AC-PB007.

**Reference dependency deliverables:**
- Task 2.1: actions/trial-ui.action.ts (Extend handler)
- Task 2.2: actions/trial-ui.action.ts (Buy handler)

## Target Files

- [x] `libs/partner-bot/src/__tests__/integration/partner-flow.int.spec.ts` (extend from Task 1.10)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Review Task 2.1 deliverable: handleExtend() implementation
- [x] Review Task 2.2 deliverable: handleBuy() implementation
- [x] Review existing integration test from Task 1.10
- [x] Plan test scenario extension

### 2. Green Phase
- [x] Extend `libs/partner-bot/src/__tests__/integration/partner-flow.int.spec.ts`
- [x] Add integration test scenario:
  ```
  Test: Trial UI Button Interactions (Integration Point 3: AC-PB006 + AC-PB007)

  Setup:
  - User with active trial (from Phase 1 onboarding)
  - Trial UI message with buttons already sent
  - Bot settings with partner.referralUrl configured

  Steps:
  1. Click "Extend Free Period" button
     - Verify BotSettingsRepository.findByBotId() called
     - Verify referralUrl retrieved from bot_settings.partner.referralUrl
     - Verify URL validation (HTTPS check)
     - Verify URL button sent to user (Telegram Bot API called)
     - Verify user action logged

  2. Click "Buy Subscription" button
     - Verify BotMessagesRepository.resolveMessage() called with type='partner_coming_soon', lang=user.lang
     - Verify coming soon message retrieved from database
     - Verify message sent to user via Telegraf
     - Verify user action logged

  3. Verify no errors or crashes
     - No exceptions thrown
     - User remains in bot chat
     - Both buttons work without side effects

  Assertions:
  - URL opens in browser (Telegram API called with URL button)
  - Coming soon message sent to user
  - No errors logged during button clicks
  - Analytics logs show both button clicks
  ```

- [x] Run integration test and confirm it passes

### 3. Refactor Phase
- [x] Extract button interaction helpers
- [x] Add descriptive test names
- [x] Add comments for verification steps
- [x] Confirm test still passes

## Completion Criteria

- [x] Integration test passes
- [x] Operation verified (L2: All assertions succeed)
- [x] AC-PB006 (Extend Free Period Button) covered
- [x] AC-PB007 (Buy Subscription Coming Soon) covered
- [x] Both buttons work without errors
- [x] User remains in chat after clicks

## Notes

**Impact Scope:**
- Integration Point 3: Trial UI Buttons
- Required for Phase 2 completion

**Verification Points:**
- BotSettingsRepository query for referral URL
- URL validation and opening
- BotMessagesRepository query for coming soon message
- Message sending via Telegraf
- No errors during button interactions
- Analytics logging

**AC Coverage:**
- AC-PB006: "Extend Free Period" Button Functionality
- AC-PB007: "Buy Subscription" Coming Soon Message
