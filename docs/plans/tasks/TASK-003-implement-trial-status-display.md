# Task: Implement Trial Status Display

## Metadata

- **Task ID:** TASK-003
- **Phase:** 3 (Trial Status Display)
- **Priority:** Medium
- **Verification Level:** L1 (Functional Operation)
- **Acceptance Criteria:** AC-2
- **Dependencies:** TASK-002 (state check calls sendTrialStatus)
- **Size:** Small (2 files + tests)

## Implementation Content

Implement the `sendTrialStatus()` private method in `StartCommandUpdate` that displays trial status with remaining time. Also add the `@Action('partner_trial_status')` handler in `TrialUIAction`.

**Display Format:**
- >= 1 day remaining: "Trial: X days remaining"
- < 1 day remaining: "Trial: Y hours remaining"

## Target Files

- [x] `libs/partner-bot/src/commands/start/start.update.ts`
- [x] `libs/partner-bot/src/actions/trial-ui.action.ts`
- [x] `libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts`
- [x] `libs/partner-bot/src/actions/__tests__/trial-ui.action.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Open existing test file `start.update.spec.ts`
- [x] Add failing test: "should show trial button with days remaining when >= 1 day left"
  ```typescript
  describe('sendTrialStatus', () => {
    it('should show trial button with days remaining when >= 1 day left', async () => {
      // Arrange
      const mockBotUser = {
        id: 42,
        userId: 123456789,
        state: { verificationState: 'trial_activated' }
      };
      mockCtx.botUser = mockBotUser;

      // Subscription expires in 3 days
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      mockUserSubscriptionsRepository.findActiveByBotUserId.mockResolvedValue([
        { id: 1, expiresAt }
      ]);

      mockBotMessagesRepository.findByBotAndType.mockResolvedValue({
        content: 'Your trial status'
      });

      // Act
      await update.handleStart(mockCtx);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Your trial status'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringMatching(/3 days? remaining/i),
                  callback_data: 'partner_trial_status'
                })
              ])
            ])
          })
        })
      );
    });
  });
  ```
- [x] Add failing test: "should show trial button with hours remaining when < 1 day left"
  ```typescript
  it('should show trial button with hours remaining when < 1 day left', async () => {
    // Arrange
    const mockBotUser = {
      id: 42,
      userId: 123456789,
      state: { verificationState: 'trial_activated' }
    };
    mockCtx.botUser = mockBotUser;

    // Subscription expires in 12 hours
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    mockUserSubscriptionsRepository.findActiveByBotUserId.mockResolvedValue([
      { id: 1, expiresAt }
    ]);

    mockBotMessagesRepository.findByBotAndType.mockResolvedValue({
      content: 'Your trial status'
    });

    // Act
    await update.handleStart(mockCtx);

    // Assert
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Your trial status'),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringMatching(/12 hours? remaining/i),
                callback_data: 'partner_trial_status'
              })
            ])
          ])
        })
      })
    );
  });
  ```
- [x] Run tests and confirm they fail:
  ```bash
  npm test -- libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts
  ```

### 2. Green Phase

- [x] Open `start.update.ts`
- [x] Replace placeholder `sendTrialStatus()` with full implementation:
  ```typescript
  private async sendTrialStatus(
    ctx: PartnerBotContext,
    botUser: BotUser,
    lang: string,
  ): Promise<void> {
    const userId = ctx.from?.id;
    const botId = ctx.botId;

    // Get active subscription to calculate remaining time
    const subscriptions = await this.userSubscriptionsRepository.findActiveByBotUserId(botUser.id);

    if (subscriptions.length === 0) {
      // No active subscription, fall back to welcome flow
      this.logger.warn({
        message: 'No active subscription found in sendTrialStatus',
        userId,
        botId,
        botUserId: botUser.id,
      });
      return;
    }

    const subscription = subscriptions[0];
    const expiresAt = new Date(subscription.expiresAt);
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();

    // Calculate display text
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingDays = Math.floor(remainingHours / 24);

    let displayText: string;
    if (remainingDays >= 1) {
      displayText = `Trial: ${remainingDays} day${remainingDays > 1 ? 's' : ''} remaining`;
    } else {
      displayText = `Trial: ${remainingHours} hour${remainingHours > 1 ? 's' : ''} remaining`;
    }

    // Get trial status message from bot_messages
    const message = await this.botMessagesRepository.findByBotAndType(
      botId,
      'partner_trial_status',
    );
    const messageContent = message?.content ?? 'Your trial is active';

    this.logger.log({
      message: 'Showing trial status',
      userId,
      botId,
      remainingDays,
      remainingHours,
    });

    // Send message with inline keyboard button
    await ctx.reply(messageContent, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: displayText,
              callback_data: 'partner_trial_status',
            },
          ],
        ],
      },
    });
  }
  ```
- [x] Open `trial-ui.action.ts`
- [x] Add `@Action('partner_trial_status')` handler:
  ```typescript
  @Action('partner_trial_status')
  async handleTrialStatus(@Ctx() ctx: PartnerBotContext): Promise<void> {
    // Acknowledge callback query (removes loading indicator)
    await ctx.answerCbQuery();

    // Informational button - no additional action needed
    // The status is already displayed on the button
    this.logger.debug({
      message: 'Trial status button clicked',
      userId: ctx.from?.id,
    });
  }
  ```
- [x] Run tests and confirm they pass:
  ```bash
  npm test -- libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts
  ```

### 3. Refactor Phase

- [x] Extract remaining time calculation into a helper function if needed:
  ```typescript
  private calculateRemainingTimeDisplay(expiresAt: Date): string {
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingDays = Math.floor(remainingHours / 24);

    if (remainingDays >= 1) {
      return `Trial: ${remainingDays} day${remainingDays > 1 ? 's' : ''} remaining`;
    }
    return `Trial: ${remainingHours} hour${remainingHours > 1 ? 's' : ''} remaining`;
  }
  ```
- [x] Ensure error handling for edge cases (negative remaining time)
- [x] Add test for `trial-ui.action.ts` if needed:
  ```typescript
  describe('handleTrialStatus', () => {
    it('should acknowledge callback query', async () => {
      // Arrange
      mockCtx.answerCbQuery = vi.fn();

      // Act
      await action.handleTrialStatus(mockCtx);

      // Assert
      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
    });
  });
  ```
- [x] Run all tests to confirm they still pass

## Completion Criteria

- [x] All added tests pass (2 tests for start.update, optional test for trial-ui.action)
- [x] `sendTrialStatus()` method implemented with correct remaining time calculation
- [x] Days displayed when >= 1 day remaining
- [x] Hours displayed when < 1 day remaining
- [x] Button callback data is `partner_trial_status`
- [x] Message retrieved from `bot_messages` with type `partner_trial_status`
- [x] `@Action('partner_trial_status')` handler acknowledges callback
- [x] Operation verified (L1): Button displays correct remaining time

## Quality Check

```bash
# Run focused tests
npm test -- libs/partner-bot/src/commands/start/__tests__/start.update.spec.ts
npm test -- libs/partner-bot/src/actions/__tests__/trial-ui.action.spec.ts

# Run type check
npm run check

# Run build
npm run build
```

## Notes

### Impact Scope
- **Direct:** Trial status display for active trial users
- **Indirect:** Better UX for returning users with active trials
- **No Ripple Effect:** Only affects partner bot start flow

### Constraints
- Button callback is informational only (no action on click)
- Use existing `bot_messages` resolution pattern
- Follow existing inline keyboard patterns in codebase

### Message Type Note
The `partner_trial_status` message type should already exist or will use fallback. No SQL INSERT required per Design Doc clarification.

### Edge Cases
- Handle zero or negative remaining time gracefully
- Handle missing subscription (should not reach this code path, but be defensive)
