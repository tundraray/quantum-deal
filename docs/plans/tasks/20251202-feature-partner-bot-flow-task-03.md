# Task: Implement ChannelVerifierService with Rate Limiting

Metadata:
- Dependencies: Task 1.1 (partner types)
- Provides: libs/partner-bot/src/services/channel-verifier.service.ts
- Size: Small (1-2 files)

## Implementation Content

Implement service to verify user membership in partner Telegram channel using Bot API. Includes rate limiting logic (10 attempts per hour per user) and exponential backoff retry for API errors.

**Reference dependency deliverables:** Task 1.1 provides PartnerBotUserState type for rate limit tracking

## Target Files

- [x] `libs/partner-bot/src/services/channel-verifier.service.ts`
- [x] `libs/partner-bot/src/services/__tests__/channel-verifier.service.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Review Task 1.1 deliverable: types/partner-settings.ts (PartnerBotUserState)
- [x] Create `libs/partner-bot/src/services/__tests__/channel-verifier.service.spec.ts`
- [x] Write failing tests for verifyMembership():
  - Returns true for status 'member', 'administrator', 'creator'
  - Returns false for status 'left', 'kicked', 'restricted'
  - Returns false for USER_ID_INVALID error (400)
  - Retries on network errors (500, 503, 429)
  - Throws after 3 failed retries
- [x] Write failing tests for isRateLimited():
  - Returns false if attempts < 10
  - Returns true if attempts >= 10 within 1 hour
  - Returns false after 1 hour (reset)
- [x] Write failing tests for getRateLimitStatus():
  - Returns correct attempts count
  - Returns correct reset timestamp
- [x] Run tests and confirm failure

### 2. Green Phase
- [x] Create `libs/partner-bot/src/services/channel-verifier.service.ts`
- [x] Implement NestJS Injectable service with constructor injection:
  - Inject Telegraf bot instance
  - Inject BotUsersRepository
- [x] Implement verifyMembership(channelId, userId):
  - Call bot.telegram.getChatMember(channelId, userId)
  - Check status in ['member', 'administrator', 'creator']
  - Handle USER_ID_INVALID (400): return false
  - Retry with exponential backoff for 500, 503, 429 (3 attempts: 1s, 2s, 4s)
- [x] Implement isRateLimited(userId, botId):
  - Query bot_users.state.verificationAttempts and lastVerificationAttempt
  - Return true if attempts >= 10 and within 1 hour
  - Reset counter if lastVerificationAttempt > 1 hour ago
- [x] Implement getRateLimitStatus(userId, botId):
  - Return { attempts, resetAt } from bot_users.state
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase
- [x] Extract retry logic to separate helper function
- [x] Add structured logging for verification attempts
- [x] Mask sensitive data (userId, channelId) in logs
- [x] Confirm added tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L2: Unit tests pass with >70% coverage)
- [x] verifyMembership() returns correct boolean for all status types
- [x] Rate limiting enforced at 10 attempts per hour
- [x] Exponential backoff retry works (3 attempts)
- [x] Error handling graceful (no crashes on API errors)

## Notes

**Impact Scope:**
- Used by ChannelVerificationAction (Task 1.6)
- Used by PartnerFlowService (Task 1.4)

**Constraints:**
- Do not modify BotUsersRepository
- Use dependency injection for testability
- No separate rate limiter service (all logic in ChannelVerifierService per Design Doc)

**Valid Membership Statuses:**
- Valid: member, administrator, creator
- Invalid: left, kicked, restricted

**Retry Logic:**
- Retryable errors: 500 (Internal Server Error), 503 (Service Unavailable), 429 (Too Many Requests)
- Non-retryable: 400 (Bad Request), 403 (Forbidden)
- Backoff intervals: 1s, 2s, 4s
