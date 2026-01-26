# Task: Write Unit Tests for TrialUIAction

Metadata:
- Dependencies: Tasks 2.1, 2.2 (TrialUIAction implementation)
- Provides: Verified TrialUIAction test coverage
- Size: Small (1 file)

## Implementation Content

Write comprehensive unit tests for TrialUIAction covering both button handlers (Extend and Buy). Achieve >70% line coverage.

**Reference dependency deliverables:**
- Task 2.1: actions/trial-ui.action.ts (Extend handler)
- Task 2.2: actions/trial-ui.action.ts (Buy handler)

## Target Files

- [x] `libs/partner-bot/src/actions/__tests__/trial-ui.action.spec.ts` (extend existing)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Review Task 2.1 deliverable: handleExtend() implementation
- [x] Review Task 2.2 deliverable: handleBuy() implementation
- [x] Identify all code paths not covered by existing tests
- [x] Write additional failing tests to cover gaps

### 2. Green Phase
- [x] Extend test suite with comprehensive scenarios:

  **handleExtend() tests:**
  - [x] Retrieves bot settings via BotSettingsRepository.findByBotId()
  - [x] Extracts referralUrl from settings.partner.referralUrl
  - [x] Validates referralUrl is HTTPS format
  - [x] Sends URL button to user (Telegram handles opening)
  - [x] Logs user action with masked URL
  - [x] Logs error if referralUrl missing from settings
  - [x] Logs error if referralUrl is HTTP (not HTTPS)
  - [x] Sends error message to user if URL invalid
  - [x] Falls back gracefully if bot_settings not found

  **handleBuy() tests:**
  - [x] Retrieves partner_coming_soon message via BotMessagesRepository.resolveMessage()
  - [x] Sends message to user via context.reply()
  - [x] Logs user action
  - [x] Falls back to hardcoded message if not found in database
  - [x] Never crashes or throws unhandled error
  - [x] Handles missing bot_messages gracefully

- [x] Mock dependencies: BotSettingsRepository, BotMessagesRepository, Telegraf context
- [x] Run tests and confirm they pass

### 3. Refactor Phase
- [x] Organize tests by method (describe blocks)
- [x] Extract common mock setup to beforeEach
- [x] Add descriptive test names
- [x] Confirm test coverage >70%

## Completion Criteria

- [x] All unit tests pass
- [x] Operation verified (L2: >70% line coverage achieved - 93.65%)
- [x] URL validation tested (HTTPS only)
- [x] Error handling tested (missing URL, missing message)
- [x] Fallback chain tested
- [x] Logging verified via mock assertions

## Notes

**Impact Scope:**
- Verifies AC-PB006 (Extend button)
- Verifies AC-PB007 (Buy button)
- Required for Phase 2 completion

**Coverage Target:**
>70% line coverage (strict requirement)

**Mock Data Examples:**
```typescript
// Valid settings
{ partner: { referralUrl: 'https://partner.example.com/ref' } }

// Invalid settings
{ partner: { referralUrl: 'http://insecure.example.com' } }

// Coming soon message
'This feature is coming soon!'
```
