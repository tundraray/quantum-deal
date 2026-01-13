# Task: Add "Without subscription" Handler and Callback Constant

Metadata:
- Dependencies: Task 0003 (Service methods), Task 0004 (Keyboard button)
- Provides: Complete "Without subscription" flow functionality
- Size: Small (2 files)
- Phase: 4 - Handler Layer (Task 4.3 + 4.4 + 4.5)
- Verification Level: L1 (Functional Operation Verification)
- Acceptance Criteria: AC3 (Without subscription option), AC6 (Broadcast executes correctly)

## Implementation Content

Complete the "Without subscription" targeting feature by:
1. Adding callback action constant
2. Adding handler for "Without subscription" button
3. Updating broadcast confirmation to handle 'no_subscription' status

## Target Files

- [ ] `libs/masterbot/src/constants.ts`
- [ ] `libs/masterbot/src/broadcast.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [ ] Review existing callback action constants structure
- [ ] Review existing filter handlers (onBroadcastFilterActive, onBroadcastFilterExpired)
- [ ] Review onBroadcastConfirm handler for status handling
- [ ] No unit tests for L1 verification (manual operation test)

### 2. Green Phase

#### Step 1: Add callback constant (constants.ts)

- [ ] Add to CALLBACK_ACTIONS:
  ```typescript
  BROADCAST_FILTER_NO_SUBSCRIPTION: 'broadcast_filter_no_subscription',
  ```

#### Step 2: Add handler (broadcast.update.ts)

- [ ] Add new handler method:
  ```typescript
  @Action(MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_NO_SUBSCRIPTION)
  async onBroadcastFilterNoSubscription(@Ctx() ctx: UserContext): Promise<void> {
    // Set session state for "without subscription" targeting
    ctx.session.broadcastFilterStatus = 'no_subscription';
    ctx.session.broadcastSubscriptionIds = []; // Explicitly clear
    ctx.session.flowState = 'awaiting_broadcast_message';

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      'Send me the message you want to broadcast to users without subscription:',
    );
  }
  ```

#### Step 3: Update session type (if needed)

- [ ] Extend broadcastFilterStatus type to include 'no_subscription':
  ```typescript
  // In user-context.interface.ts
  broadcastFilterStatus?: 'active' | 'expired' | 'no_subscription' | null;
  ```

#### Step 4: Update broadcast confirmation handler

- [ ] Modify `onBroadcastConfirm()` to handle 'no_subscription':
  ```typescript
  async onBroadcastConfirm(@Ctx() ctx: UserContext): Promise<void> {
    // ... existing code ...

    let result: BroadcastResultDto;

    if (ctx.session.broadcastFilterStatus === 'no_subscription') {
      // Broadcast to users without any subscription
      result = await this.broadcastService.sendBroadcastToNonSubscribers(
        ctx.session.broadcastFilterBotId!,
        ctx.session.broadcastMessage!,
        ctx.session.broadcastMessageEntities,
        ctx.from!.id,
      );
    } else {
      // Existing broadcast logic for active/expired subscribers
      result = await this.broadcastService.sendBroadcastMulti(
        ctx.session.broadcastSubscriptionIds!,
        ctx.session.broadcastFilterStatus!,
        ctx.session.broadcastFilterBotId,
        ctx.session.broadcastMessage!,
        ctx.session.broadcastMessageEntities,
        ctx.from!.id,
      );
    }

    // ... rest of confirmation handling ...
  }
  ```

### 3. Refactor Phase

- [ ] Ensure handler follows existing filter handler patterns
- [ ] Verify session state is properly cleared after broadcast
- [ ] Verify error handling is consistent
- [ ] Run quality checks

## Expected Flow

```
User clicks "Without subscription" button in subscription selection
  -> onBroadcastFilterNoSubscription handler
  -> Sets broadcastFilterStatus = 'no_subscription'
  -> Clears broadcastSubscriptionIds = []
  -> Sets flowState = 'awaiting_broadcast_message'
  -> SKIPS status filter step (no active/expired for non-subscribers)
  -> User enters message
  -> Preview shown
  -> User confirms
  -> onBroadcastConfirm checks for 'no_subscription'
  -> Calls sendBroadcastToNonSubscribers
  -> Messages queued
```

## Completion Criteria

- [ ] `BROADCAST_FILTER_NO_SUBSCRIPTION` constant added
- [ ] `onBroadcastFilterNoSubscription` handler added
- [ ] Session type extended with 'no_subscription' status
- [ ] `onBroadcastConfirm` handles 'no_subscription' status
- [ ] Flow skips status filter step when "Without subscription" selected
- [ ] Broadcast sent only to users with NO subscription records
- [ ] Build succeeds without errors (`pnpm build`)
- [ ] Type check passes (`pnpm typecheck`)

## Operational Verification Procedures

1. Start bot in development mode
2. Run `/broadcast` command
3. Select a bot
4. Click "Without subscription" button
5. Verify:
   - Status filter step is SKIPPED
   - Message input prompt appears
6. Enter test message
7. Confirm preview
8. Verify broadcast sent to non-subscribers only
9. Run quality checks:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

## Quality Check Commands

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Notes

- **Impact scope**: constants.ts, broadcast.update.ts, user-context.interface.ts
- **Constraints**: "Without subscription" is mutually exclusive with subscription selection
- **Flow clarification**: Selecting "Without subscription" skips status filter entirely
- **Session state**: broadcastSubscriptionIds is explicitly cleared, not just ignored
