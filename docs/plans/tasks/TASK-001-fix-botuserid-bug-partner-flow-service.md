# Task: Fix botUserId Bug in PartnerFlowService

## Metadata

- **Task ID:** TASK-001
- **Phase:** 1 (Critical Bug Fix)
- **Priority:** CRITICAL
- **Verification Level:** L1 (Functional Operation)
- **Acceptance Criteria:** AC-4
- **Dependencies:** None (First task)
- **Size:** Small (1 file + tests)

## Implementation Content

Fix the critical bug in `PartnerFlowService.handleVerificationRequest()` where `userId` (telegramId) is incorrectly passed to `TrialService.activate()` instead of `botUserId` (bot_users.id).

**Current Bug Location:** Line ~324 in `partner-flow.service.ts`
```typescript
// CURRENT (BUG):
const activationResult = await this.trialService.activate(userId);
// userId here is telegramId (large number like 123456789)
// But TrialService.activate() expects botUserId (small integer like 1, 2, 3)
```

**Impact of Bug:**
- Subscription records created with wrong `bot_user_id`
- Trial eligibility checks fail (looks up wrong ID)
- All trial activations in partner flow are broken

## Target Files

- [x] `libs/partner-bot/src/services/partner-flow.service.ts`
- [x] `libs/partner-bot/src/services/__tests__/partner-flow.service.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Open existing test file `partner-flow.service.spec.ts`
- [x] Add failing test: "should call TrialService.activate with botUser.id (NOT userId)"
  ```typescript
  describe('handleVerificationRequest', () => {
    it('should call TrialService.activate with botUser.id (NOT userId)', async () => {
      // Arrange
      const userId = 123456789; // telegramId (large number)
      const botId = 1;
      const mockBotUser = { id: 42, userId: 123456789 }; // botUser.id is small number
      mockBotUsersRepository.findByUserAndBot.mockResolvedValue(mockBotUser);
      // ... setup other mocks for successful verification ...

      // Act
      await service.handleVerificationRequest(userId, botId);

      // Assert
      expect(mockTrialService.activate).toHaveBeenCalledWith(42); // NOT 123456789
    });
  });
  ```
- [x] Add failing test: "should return error when botUser cannot be resolved for trial activation"
  ```typescript
  it('should return error when botUser cannot be resolved for trial activation', async () => {
    // Arrange
    const userId = 123456789;
    const botId = 1;
    mockBotUsersRepository.findByUserAndBot.mockResolvedValue(null);

    // Act
    const result = await service.handleVerificationRequest(userId, botId);

    // Assert
    expect(result.verified).toBe(false);
    expect(result.error).toBeDefined();
    expect(mockTrialService.activate).not.toHaveBeenCalled();
  });
  ```
- [x] Run tests and confirm they fail:
  ```bash
  npm test -- libs/partner-bot/src/services/__tests__/partner-flow.service.spec.ts
  ```

### 2. Green Phase

- [x] Open `partner-flow.service.ts`
- [x] Verify `BotUsersRepository` is already injected (should be present)
- [x] Locate `handleVerificationRequest()` method
- [x] Before the `trialService.activate()` call, add botUser resolution:
  ```typescript
  // Resolve botUser to get botUserId for subscription operations
  const botUser = await this.botUsersRepository.findByUserAndBot(userId, botId);
  if (!botUser) {
    this.logger.warn({
      message: 'Failed to resolve botUser for trial activation',
      userId,
      botId,
    });
    return { verified: false, error: 'User context not found' };
  }
  ```
- [x] Change the activate call to use `botUser.id`:
  ```typescript
  // FIXED: Use botUser.id (bot_users.id) instead of userId (telegramId)
  const activationResult = await this.trialService.activate(botUser.id);
  ```
- [x] Add debug logging to verify correct value:
  ```typescript
  this.logger.debug({
    message: 'Trial activated with botUserId',
    userId,  // telegramId for reference
    botId,
    botUserId: botUser.id,  // Should be small integer
  });
  ```
- [x] Run tests and confirm they pass:
  ```bash
  npm test -- libs/partner-bot/src/services/__tests__/partner-flow.service.spec.ts
  ```

### 3. Refactor Phase

- [x] Review the code for clarity and consistency
- [x] Ensure logging follows project patterns
- [x] Verify no unnecessary changes were made
- [x] Run tests again to confirm they still pass:
  ```bash
  npm test -- libs/partner-bot/src/services/__tests__/partner-flow.service.spec.ts
  ```

## Completion Criteria

- [x] All added tests pass (2 tests)
- [x] `handleVerificationRequest()` resolves `botUser` via `botUsersRepository.findByUserAndBot()`
- [x] `trialService.activate()` receives `botUser.id` (NOT `userId`)
- [x] Error handling for null `botUser` case
- [x] Debug logging added to verify correct value
- [x] Operation verified (L1): New test passes verifying parameter value

## Quality Check

```bash
# Run focused tests
npm test -- libs/partner-bot/src/services/__tests__/partner-flow.service.spec.ts

# Run type check
npm run check

# Run build
npm run build
```

## Notes

### Impact Scope
- **Direct:** Trial activation now creates correct subscription records
- **Indirect:** Trial eligibility checks will work correctly
- **No Ripple Effect:** Method signature unchanged (backward compatible)

### Constraints
- Do NOT change `handleVerificationRequest()` method signature
- Do NOT modify `TrialService` (already expects `botUserId`)

### Verification Log Pattern
After implementation, the debug log should show:
```json
{
  "message": "Trial activated with botUserId",
  "userId": 123456789,    // Large telegramId
  "botId": 1,
  "botUserId": 42         // Small bot_users.id
}
```
