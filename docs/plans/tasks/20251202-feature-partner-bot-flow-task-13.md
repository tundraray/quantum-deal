# Task: Implement TrialUIAction for "Buy Subscription" Button

Metadata:
- Dependencies: Phase 1 completion (Task 1.11)
- Provides: libs/partner-bot/src/actions/trial-ui.action.ts (Buy handler)
- Size: Small (1 file, extend existing)

## Implementation Content

Implement "Buy Subscription" button handler in TrialUIAction. Shows coming soon placeholder message from bot_messages. No payment integration (out of scope).

**Reference dependency deliverables:** Phase 1 completion ensures trial UI buttons exist

## Target Files

- [x] `libs/partner-bot/src/actions/trial-ui.action.ts` (extended from Task 2.1)
- [x] `libs/partner-bot/src/actions/__tests__/trial-ui.action.spec.ts` (extended from Task 2.1)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Verify Phase 1 completion and Task 2.1 completion
- [x] Extend `libs/partner-bot/src/actions/__tests__/trial-ui.action.spec.ts`
- [x] Write failing tests for handleBuy():
  - User clicks "Buy Subscription" button
  - BotMessagesRepository.resolveMessage() called with type='partner_coming_soon'
  - Coming soon message retrieved from database
  - Message sent to user
  - User action logged for analytics
  - Falls back to hardcoded message if not found in database
  - No errors or crashes occur
- [x] Run tests and confirm failure

### 2. Green Phase
- [x] Extend `libs/partner-bot/src/actions/trial-ui.action.ts`
- [x] Add BotMessagesRepository to constructor injection (already injected)
- [x] Implement @Action('partner_buy_subscription') decorated method handleBuy(@Ctx() ctx: UserContext):
  - Get userId, botId, lang from context
  - Retrieve partner_coming_soon message via BotMessagesRepository.resolveMessage(botId, 'partner_coming_soon', lang)
  - Send message to user via ctx.reply()
  - Log user action: { userId, botId, action: 'buy_subscription_clicked' }
  - If message not found: Fall back to hardcoded English message "This feature is coming soon!"
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase
- [x] Extract fallback message to constant (FALLBACK_COMING_SOON)
- [x] Add structured logging for button clicks
- [x] Ensure graceful fallback (never crashes)
- [x] Confirm added tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L1: Unit tests verify coming soon message behavior)
- [x] Message retrieved from bot_messages
- [x] Fallback to hardcoded message works
- [x] No crashes or errors
- [x] User action logged

## Notes

**Impact Scope:**
- Integration Point 3: Trial UI Buttons
- Covers AC-PB007 (Buy Subscription Coming Soon Message)

**Constraints:**
- No payment integration (out of scope for MVP)
- Placeholder only
- Must not crash or error

**Fallback Message:**
```typescript
const FALLBACK_COMING_SOON = 'This feature is coming soon!';
```

**Future Extension:**
Payment integration will replace this placeholder in future implementation
