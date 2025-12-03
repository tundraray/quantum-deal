# Task: Generate SQL Migration with 48 Partner Bot Messages

Metadata:
- Dependencies: None
- Provides: libs/db/migrations/YYYYMMDD_partner_bot_messages.sql
- Size: Small (1 file)

## Implementation Content

Create SQL migration file with 48 INSERT statements for partner bot messages: 6 message types × 8 languages. This provides the message infrastructure for all user-facing communications in the partner bot flow.

## Target Files

- [x] `libs/db/migrations/20251202153614_partner_bot_messages.sql`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Create `libs/db/src/repositories/__tests__/bot-messages.repository.spec.ts` (if not exists)
- [x] Add test for partner message retrieval:
  - Test resolveMessage() returns partner_welcome for all 8 languages
  - Test resolveMessage() returns partner_channel_prompt with variable placeholders
  - Test resolveMessage() returns all 6 partner message types
- [x] Run tests and confirm failure (messages not in database)

### 2. Green Phase
- [x] Create migration file: `libs/db/migrations/20251202153614_partner_bot_messages.sql`
- [x] Add 48 INSERT statements to messages table:
  - Message types: partner_welcome, partner_channel_prompt, partner_verification_failed, partner_trial_activated, partner_trial_expired, partner_coming_soon
  - Languages: ru, en, uk, hi, fr, kk, uz, tg
  - Include variable placeholders: {channelUrl}, {channelName}, {expiryDate}, {daysRemaining}
- [x] Structure: `INSERT INTO messages (type, lang, message) VALUES (...);`
- [x] Use messages table for global messages (fallback for all bots)
- [x] Run migration and verify 48 rows inserted
- [x] Run added tests and confirm they pass

### 3. Refactor Phase
- [x] Add SQL comments for each message type section
- [x] Organize by message type, then by language
- [x] Verify all variable placeholders use consistent format {variableName}
- [x] Confirm tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L1: SQL executes without errors, SELECT COUNT returns 48)
- [x] All 6 message types exist in all 8 languages
- [x] Variable placeholders use consistent {variableName} format
- [x] Messages retrievable via BotMessagesRepository.resolveMessage()

## Notes

**Impact Scope:**
- Adds 48 rows to bot_messages table
- Required by: Tasks 1.5, 1.6, 2.1, 2.2, 3.1

**Constraints:**
- Do not modify existing messages
- Use NULL for bot_id (global messages)
- Follow existing message resolution hierarchy: bot-specific → global → English fallback

**Message Types and Variables:**
- partner_welcome: No variables
- partner_channel_prompt: {channelUrl}, {channelName}
- partner_verification_failed: {channelName}
- partner_trial_activated: {expiryDate}, {daysRemaining}
- partner_trial_expired: {expiryDate}
- partner_coming_soon: No variables

**Languages:**
ru (Russian), en (English), uk (Ukrainian), hi (Hindi), fr (French), kk (Kazakh), uz (Uzbek), tg (Tajik)
