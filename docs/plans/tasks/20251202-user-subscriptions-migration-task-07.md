# Task: Update TrialService to Use botUserId

Metadata:
- Phase: 4 (Service Updates)
- Dependencies: Task 06 (Repository Tests Complete)
- Provides: Updated TrialService using botUserId for eligibility and activation
- Size: Small (1-2 files)

## Implementation Content
Update `TrialService` to accept `botUserId` parameter instead of `userId`. This enables per-bot trial eligibility checking - a user can now be eligible for trial on Bot B even if they've used trial on Bot A.

**Key Behavior Change**: Trial eligibility is now per-bot, not global across all bots.

## Target Files
- [x] `libs/bot/src/services/trial.service.ts`
- [x] `libs/bot/src/services/__tests__/trial.service.spec.ts` (if exists, or create)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase - Write/Update Tests First
- [x] Create or update `trial.service.spec.ts`
- [x] Add test: `isEligible` should check subscription history per botUserId
- [x] Add test: `isEligible` should return true for new bot even if user has subscription on other bot
- [x] Add test: `activate` should create subscription with botUserId
- [x] Run tests and confirm they fail

### 2. Green Phase - Update TrialService

#### Update `isEligible` Method
- [x] Change parameter from `userId: number` to `botUserId: number`
- [x] Change repository call from `findByUserId(userId)` to `findByBotUserId(botUserId)`
- [x] Update logging to use `botUserId`

```typescript
/**
 * Check if user is eligible for trial
 * Eligibility: No subscription history for this specific bot-user
 * @param botUserId - The bot_users.id (NOT telegramId)
 */
async isEligible(botUserId: number): Promise<boolean> {
  // Check if TRIAL_ENABLED is true
  const trialEnabled = this.configService.get<boolean>('TRIAL_ENABLED', true);
  if (!trialEnabled) {
    this.logger.debug('Trial system is disabled');
    return false;
  }

  // Simple: no subscription history for this bot-user = eligible
  const existing = await this.userSubscriptionsRepository.findByBotUserId(botUserId);
  const eligible = existing.length === 0;

  this.logger.debug(`BotUser ${botUserId} trial eligibility: ${eligible}`);
  return eligible;
}
```

#### Update `activate` Method
- [x] Change parameter from `userId: number` to `botUserId: number`
- [x] Change repository call from `activate(userId, ...)` to `activateForBotUser(botUserId, ...)`
- [x] Update logging to use `botUserId`

```typescript
/**
 * Activate trial subscription for user
 * Creates user_subscription record with configurable expiration (TRIAL_DURATION_DAYS)
 * @param botUserId - The bot_users.id (NOT telegramId)
 */
async activate(botUserId: number): Promise<{
  success: boolean;
  expiresAt?: Date;
  error?: string;
}> {
  try {
    // Double-check eligibility
    const eligible = await this.isEligible(botUserId);
    if (!eligible) {
      return { success: false, error: 'Trial already used or not enabled' };
    }

    // Get trial subscription from DB using feature flag
    const trialSubscription =
      await this.subscriptionsRepository.findTrialSubscription();
    if (!trialSubscription) {
      this.logger.error(
        'Trial subscription not found in database (missing is_trial feature flag)',
      );
      return { success: false, error: 'Trial not available' };
    }

    // Get trial duration from config
    const durationDays = this.configService.get<number>(
      'TRIAL_DURATION_DAYS',
      7,
    );

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(durationDays));

    // Create user_subscription record with botUserId
    await this.userSubscriptionsRepository.activateForBotUser(
      botUserId,
      trialSubscription.id,
      expiresAt,
    );

    this.logger.log(
      `Trial activated for botUser ${botUserId}, expires: ${expiresAt.toISOString()}`,
    );

    return { success: true, expiresAt };
  } catch (error) {
    this.logger.error(`Failed to activate trial for botUser ${botUserId}`, error);
    return { success: false, error: 'Failed to activate trial' };
  }
}
```

- [x] Run tests and confirm they pass

### 3. Refactor Phase
- [x] Ensure JSDoc comments are updated
- [x] Verify error messages use `botUserId` terminology
- [x] Run lint and format checks

## Test Cases

```typescript
describe('TrialService', () => {
  describe('isEligible', () => {
    it('should check eligibility per bot user (not global)', async () => {
      const botUserId = 1;
      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([]);

      const result = await trialService.isEligible(botUserId);

      expect(result).toBe(true);
      expect(mockUserSubscriptionsRepository.findByBotUserId).toHaveBeenCalledWith(botUserId);
    });

    it('should return false when bot user has subscription history', async () => {
      const botUserId = 1;
      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([
        { id: 1, botUserId: 1, subscriptionId: 1 },
      ]);

      const result = await trialService.isEligible(botUserId);

      expect(result).toBe(false);
    });

    it('should return false when trial is disabled', async () => {
      mockConfigService.get.mockReturnValue(false); // TRIAL_ENABLED = false

      const result = await trialService.isEligible(1);

      expect(result).toBe(false);
    });
  });

  describe('activate', () => {
    it('should create subscription with botUserId', async () => {
      const botUserId = 1;
      mockUserSubscriptionsRepository.findByBotUserId.mockResolvedValue([]);
      mockSubscriptionsRepository.findTrialSubscription.mockResolvedValue({ id: 1 });
      mockUserSubscriptionsRepository.activateForBotUser.mockResolvedValue({
        id: 1,
        botUserId: 1,
        subscriptionId: 1,
      });

      const result = await trialService.activate(botUserId);

      expect(result.success).toBe(true);
      expect(mockUserSubscriptionsRepository.activateForBotUser).toHaveBeenCalledWith(
        botUserId,
        1,
        expect.any(Date),
      );
    });
  });
});
```

## Completion Criteria
- [x] `isEligible` accepts `botUserId` parameter
- [x] `isEligible` calls `findByBotUserId(botUserId)`
- [x] `activate` accepts `botUserId` parameter
- [x] `activate` calls `activateForBotUser(botUserId, ...)`
- [x] All tests pass
- [x] Build passes: `npm run build`
- [x] **AC-4.1**: `TrialService.isEligible()` accepts `botUserId` parameter
- [x] **AC-4.2**: `TrialService.activate()` creates subscription with `botUserId`

## Verification Commands
```bash
# Run service tests
npm test -- --testPathPattern=trial.service

# Build check
npm run build

# Lint check
npm run check
```

## Notes
- Impact scope: TrialService only
- Constraints: Callers of TrialService must now pass `botUserId` (from `botUser.id`) instead of `userId` (telegramId)
- This is a breaking change for callers - middleware updates in Phase 5 will fix this
- **Behavior Change**: Trial eligibility is now per-bot-user, not per-global-user
