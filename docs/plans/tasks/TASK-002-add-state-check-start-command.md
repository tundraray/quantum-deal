# Task: Add State Check in StartCommandUpdate

## Metadata

- **Task ID:** TASK-002
- **Phase:** 2 (State Check Implementation)
- **Priority:** High
- **Verification Level:** L1 (Functional Operation)
- **Acceptance Criteria:** AC-1, AC-3, AC-6
- **Dependencies:** TASK-001 (correct trial activation required for status check)
- **Size:** Small (1 file + tests)

## Implementation Content

Add state checking at the start of `handleStart()` method in `StartCommandUpdate` to route users to appropriate flows based on their current verification state.

**State Routing Logic:**
- `trial_activated` + active subscription -> Show trial status (implemented in TASK-003)
- `awaiting_channel_subscription` -> Re-send channel prompt (no welcome message)
- `undefined` / `trial_expired` -> Show welcome message and initialize state

## Target Files

- [x] `libs/partner-bot/src/commands/start/start.update.ts`
- [x] `libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Open existing test file `start.update.spec.ts`
- [x] Add failing test: "should show trial status message when user has trial_activated state with active subscription"
  ```typescript
  describe('handleStart - state check', () => {
    it('should show trial status message when user has trial_activated state with active subscription', async () => {
      // Arrange
      const mockBotUser = {
        id: 42,
        userId: 123456789,
        state: { verificationState: 'trial_activated' }
      };
      mockCtx.botUser = mockBotUser;
      mockUserSubscriptionsRepository.findActiveByBotUserId.mockResolvedValue([
        { id: 1, expiresAt: new Date(Date.now() + 86400000) } // 1 day from now
      ]);

      // Act
      await update.handleStart(mockCtx);

      // Assert
      // Should call sendTrialStatus (we'll verify the message sent)
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Trial'),
        expect.any(Object)
      );
      // Should NOT send welcome message
      expect(mockPartnerFlowService.sendChannelPrompt).not.toHaveBeenCalled();
    });
  });
  ```
- [x] Add failing test: "should re-send channel prompt without welcome when user has awaiting_channel_subscription state"
  ```typescript
  it('should re-send channel prompt without welcome when user has awaiting_channel_subscription state', async () => {
    // Arrange
    const mockBotUser = {
      id: 42,
      userId: 123456789,
      state: { verificationState: 'awaiting_channel_subscription', verificationAttempts: 2 }
    };
    mockCtx.botUser = mockBotUser;

    // Act
    await update.handleStart(mockCtx);

    // Assert
    expect(mockPartnerFlowService.sendChannelPrompt).toHaveBeenCalled();
    // Welcome message should NOT be sent
    expect(mockBotMessagesRepository.findByBotAndType).not.toHaveBeenCalledWith(
      expect.anything(),
      'partner_welcome'
    );
    // State should NOT be reset (verificationAttempts preserved)
    expect(mockBotUsersRepository.updateState).not.toHaveBeenCalled();
  });
  ```
- [x] Add failing test: "should show welcome message and channel prompt when user has no state or trial_expired"
  ```typescript
  it('should show welcome message and channel prompt when user has no state or trial_expired', async () => {
    // Arrange
    const mockBotUser = {
      id: 42,
      userId: 123456789,
      state: undefined // No state
    };
    mockCtx.botUser = mockBotUser;

    // Act
    await update.handleStart(mockCtx);

    // Assert
    // Should send welcome message
    expect(mockBotMessagesRepository.findByBotAndType).toHaveBeenCalledWith(
      expect.anything(),
      'partner_welcome'
    );
    // Should initialize state
    expect(mockBotUsersRepository.updateState).toHaveBeenCalled();
    // Should send channel prompt
    expect(mockPartnerFlowService.sendChannelPrompt).toHaveBeenCalled();
  });
  ```
- [x] Add failing test: "should use ctx.botUser.state from context without extra DB query"
  ```typescript
  it('should use ctx.botUser.state from context without extra DB query', async () => {
    // Arrange
    const mockBotUser = {
      id: 42,
      userId: 123456789,
      state: { verificationState: 'awaiting_channel_subscription' }
    };
    mockCtx.botUser = mockBotUser;

    // Act
    await update.handleStart(mockCtx);

    // Assert
    // Should NOT query for botUser state separately
    expect(mockBotUsersRepository.findByUserAndBot).not.toHaveBeenCalled();
  });
  ```
- [x] Run tests and confirm they fail:
  ```bash
  npm test -- libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts
  ```

### 2. Green Phase

- [x] Open `start.update.ts`
- [x] Add `UserSubscriptionsRepository` dependency injection if not present
- [x] Add state check at the start of `handleStart()` method:
  ```typescript
  async handleStart(@Ctx() ctx: PartnerBotContext): Promise<void> {
    const userId = ctx.from?.id;
    const botId = ctx.botId;
    const lang = ctx.from?.language_code ?? 'en';

    if (!userId || !botId) {
      await ctx.reply('Error: Missing user or bot context');
      return;
    }

    // Use botUser from middleware context (no extra DB query)
    const botUser = ctx.botUser;
    const verificationState = botUser?.state?.verificationState;

    // State-aware routing
    if (verificationState === 'trial_activated') {
      // Check if trial is still active
      const subscriptions = await this.userSubscriptionsRepository.findActiveByBotUserId(botUser.id);
      if (subscriptions.length > 0) {
        // Show trial status (implemented in TASK-003)
        await this.sendTrialStatus(ctx, botUser, lang);
        return;
      }
      // Trial expired, continue to welcome flow
    }

    if (verificationState === 'awaiting_channel_subscription') {
      // Re-show channel prompt without welcome message
      // Preserve existing verification attempt counter (no state reset)
      await this.partnerFlowService.sendChannelPrompt(userId, botId, lang);
      return;
    }

    // Default flow: No state or trial_expired
    // Send welcome message and initialize state
    // ... existing welcome flow code ...
  }
  ```
- [x] Add placeholder for `sendTrialStatus()` method (actual implementation in TASK-003):
  ```typescript
  private async sendTrialStatus(
    ctx: PartnerBotContext,
    botUser: BotUser,
    lang: string,
  ): Promise<void> {
    // Placeholder - will be implemented in TASK-003
    await ctx.reply('Trial status - implementation pending');
  }
  ```
- [x] Run tests and confirm they pass:
  ```bash
  npm test -- libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts
  ```

### 3. Refactor Phase

- [x] Extract state checking logic into a private helper if it improves readability
- [x] Ensure logging follows project patterns:
  ```typescript
  this.logger.debug({
    message: 'State check on /start',
    userId,
    botId,
    verificationState,
  });
  ```
- [x] Verify no unnecessary changes were made
- [x] Run tests again to confirm they still pass

## Completion Criteria

- [x] All added tests pass (4 tests)
- [x] State check uses `ctx.botUser.state` from middleware context
- [x] `trial_activated` state with active subscription routes to status display
- [x] `awaiting_channel_subscription` state routes directly to channel prompt (no welcome)
- [x] Default/undefined state routes to welcome + initialize + channel prompt
- [x] No extra database queries for state check
- [x] Operation verified (L1): Different states produce different outputs

## Quality Check

```bash
# Run focused tests
npm test -- libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts

# Run type check
npm run check

# Run build
npm run build
```

## Notes

### Impact Scope
- **Direct:** `/start` command behavior changes based on user state
- **Indirect:** UX improvement for returning users
- **No Ripple Effect:** Only affects `/start` command in partner bot

### Constraints
- Do NOT change `handleStart()` method signature
- Do NOT add extra DB queries for state check
- Preserve `verificationAttempts` counter for awaiting users

### State Values Reference
```typescript
type VerificationState =
  | 'awaiting_channel_subscription'
  | 'channel_verified'
  | 'trial_activated'
  | 'trial_expired';
```

### Dependency on TASK-003
The `sendTrialStatus()` method is a placeholder in this task. Full implementation is in TASK-003.
