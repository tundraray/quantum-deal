# Task: Implement TrialUIAction for "Extend Free Period" Button

Metadata:
- Dependencies: Phase 1 completion (Task 1.11)
- Provides: libs/partner-bot/src/actions/trial-ui.action.ts (Extend handler)
- Size: Small (1 file, partial implementation)

## Implementation Content

Implement "Extend Free Period" button handler in TrialUIAction. Button opens referral URL from bot_settings in user's browser. No backend logic, Telegram handles URL opening.

**Reference dependency deliverables:** Phase 1 completion ensures PartnerFlowService sends trial UI with buttons

## Target Files

- [x] `libs/partner-bot/src/actions/trial-ui.action.ts`
- [x] `libs/partner-bot/src/actions/__tests__/trial-ui.action.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Verify Phase 1 completion (Task 1.11 passed)
- [x] Create `libs/partner-bot/src/actions/__tests__/trial-ui.action.spec.ts`
- [x] Write failing tests for handleExtend():
  - User clicks "Extend Free Period" button
  - BotSettingsRepository.findByBotId() called to retrieve partner settings
  - Referral URL retrieved from bot_settings.referralUrl
  - URL validated as HTTPS format
  - URL sent as inline keyboard button (Telegram handles opening)
  - User action logged for analytics
  - Error logged if referral URL missing from config
- [x] Run tests and confirm failure

### 2. Green Phase
- [x] Create `libs/partner-bot/src/actions/trial-ui.action.ts`
- [x] Implement NestJS Update handler class with @Update() decorator
- [x] Add @Injectable() decorator for dependency injection
- [x] Inject dependencies: BotSettingsRepository, BotUsersRepository, BotMessagesRepository
- [x] Implement @Action('partner_extend_trial') decorated method handleExtend(@Ctx() ctx: UserContext):
  - Get userId, botId from context
  - Retrieve bot_settings via BotSettingsRepository.findByBotId(botId)
  - Get referralUrl from settings.referralUrl
  - Validate referralUrl is HTTPS format (starts with 'https://')
  - If missing or invalid: Log error, send error message to user, return
  - Send URL button to user (Telegram Bot API handles opening in browser)
  - Log user action: { userId, botId, action: 'extend_trial_clicked', referralUrl: maskUrl(referralUrl) }
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase
- [x] Extract URL validation to helper function
- [x] Add structured logging with masked URLs
- [x] Add error handling for missing settings
- [x] Confirm added tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L1: Unit tests verify button handler behavior)
- [x] Referral URL retrieved from bot_settings.referralUrl
- [x] URL validation works (HTTPS only)
- [x] Error handling for missing URL
- [x] User action logged

## Notes

**Impact Scope:**
- Integration Point 3: Trial UI Buttons
- Covers AC-PB006 (Extend Free Period Button Functionality)

**Constraints:**
- No backend trial extension logic (out of scope)
- Button only opens URL
- URL opening handled by Telegram, not bot code

**NestJS Framework Requirement:**
Class-based handler required for @Update and @Action decorators

**URL Validation:**
Must start with 'https://' (reject http:// or other protocols)
