# Task: Update Confirmation to Use sendBroadcastMulti

Metadata:
- Dependencies: Task 4 (sendBroadcastMulti), Task 8 (preview)
- Provides: Updated confirmation handler in `broadcast.update.ts`
- Size: Small (1 file)
- Phase: 3 - Handler Layer
- Verification Level: L1 (Functional Operation)
- Acceptance Criteria: AC6 (Broadcast Execution)

## Implementation Content

Update the broadcast confirmation handler to:
1. Call `sendBroadcastMulti` instead of `sendBroadcast`
2. Pass all selected subscription IDs as array
3. Display delivery report with deduplicated count
4. Clear session state after completion

## Target Files

- [x] `libs/masterbot/src/broadcast.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Locate existing `onBroadcastConfirm` handler
- [x] Understand current implementation (single subscription)
- [x] Review `sendBroadcastMulti` signature from Task 4

### 2. Green Phase

- [x] Modify `onBroadcastConfirm` handler:
  ```typescript
  @Action(CALLBACK_ACTIONS.BROADCAST_CONFIRM)
  async onBroadcastConfirm(@Ctx() ctx: UserContext): Promise<void> {
    const subscriptionIds = ctx.session.broadcastSubscriptionIds || [];
    const message = ctx.session.broadcastMessage;
    const entities = ctx.session.broadcastMessageEntities;
    const filterStatus = ctx.session.broadcastFilterStatus || 'active';
    const filterBotId = ctx.session.broadcastFilterBotId;
    const managerId = ctx.from?.id;

    if (!message || subscriptionIds.length === 0 || !managerId) {
      await ctx.answerCbQuery('Invalid broadcast data');
      return;
    }

    try {
      // Send broadcast to multiple subscriptions with deduplication
      const result = await this.broadcastService.sendBroadcastMulti(
        subscriptionIds,
        message,
        entities,
        managerId,
        filterStatus,
        filterBotId,
      );

      // Display delivery report
      const reportText = this.buildDeliveryReport(result, subscriptionIds.length);
      await ctx.editMessageText(reportText);

      // Log completion
      this.logger.log(`Broadcast multi: ${subscriptionIds.length} subs, ${result.queued} unique users queued`);

    } catch (error) {
      this.logger.error('Broadcast failed', error);
      await ctx.editMessageText('Broadcast failed. Please try again.');
    } finally {
      // Clear session state
      this.clearBroadcastSession(ctx);
    }
  }
  ```

- [x] Add delivery report builder:
  ```typescript
  private buildDeliveryReport(result: BroadcastResultDto, subCount: number): string {
    let report = `Broadcast Complete!\n\n`;
    report += `Subscriptions: ${subCount}\n`;
    report += `Messages queued: ${result.queued}\n`;
    if (result.failed > 0) {
      report += `Failed: ${result.failed}\n`;
    }
    report += `\n(Users in multiple subscriptions received message once)`;
    return report;
  }
  ```

- [x] Add session cleanup helper:
  ```typescript
  private clearBroadcastSession(ctx: UserContext): void {
    ctx.session.broadcastSubscriptionIds = null;
    ctx.session.broadcastSubscriptionId = null;
    ctx.session.broadcastFilterBotId = null;
    ctx.session.broadcastFilterStatus = null;
    ctx.session.broadcastMessage = null;
    ctx.session.broadcastMessageEntities = null;
    ctx.session.flowState = null;
    ctx.session.commandContext = null;
  }
  ```

- [x] Manual test: Confirm button sends broadcast correctly

### 3. Refactor Phase

- [x] Ensure error handling covers all edge cases
- [x] Add proper logging for audit trail
- [x] Verify session is fully cleared

## Expected Flow

```
User clicks [Send] button
  |
  v
Handler retrieves session data:
  - subscriptionIds: [1, 2, 3]
  - message: "..."
  - filterStatus: 'active'
  - filterBotId: 5
  |
  v
Calls sendBroadcastMulti(subscriptionIds, message, ...)
  |
  v
Shows delivery report:
  "Broadcast Complete!
   Subscriptions: 3
   Messages queued: 312
   (Users in multiple subscriptions received message once)"
  |
  v
Clears session state
```

## Completion Criteria

- [x] `sendBroadcastMulti` called with subscriptionIds array
- [x] Delivery report shows deduplicated queued count
- [x] Report mentions deduplication
- [x] Session state fully cleared after completion
- [x] Error handling for invalid data
- [x] Logging for broadcast completion
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`)

## Quality Check Commands

```bash
npm run check
npm run build
```

## Notes

- **Impact scope**: Final step of broadcast flow
- **Constraints**: Must handle errors gracefully without breaking session
- **Pattern Reference**: Follow existing confirmation handler pattern
- **Session Cleanup**: Critical to clear ALL broadcast-related fields
