# Task: Remove Broadcast Handlers from MasterbotUpdate

Metadata:
- Phase: 3 (Cleanup & Integration)
- Dependencies: Task 04 (BroadcastUpdate registered and working)
- Provides: Clean MasterbotUpdate without broadcast code (~400 lines removed)
- Size: Medium (1 file)
- Verification Level: L1 (Functional Operation)

## Implementation Content

Remove all broadcast-related handlers and helper methods from `MasterbotUpdate`. After this task, broadcast functionality will be handled exclusively by `BroadcastUpdate`.

## Target Files

- [ ] `libs/masterbot/src/masterbot.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [ ] Verify existing subscription create/close tests pass before changes
- [ ] Run: `npm test -- libs/masterbot/src/__tests__/masterbot.update.spec.ts`

### 2. Green Phase

**Handlers to Remove (~400 lines):**

- [ ] Remove `onBroadcast` handler (lines 648-718)
- [ ] Remove `onBroadcastSubscriptionSelected` handler (lines 720-789)
- [ ] Remove `onBroadcastConfirm` handler (lines 791-875)
- [ ] Remove `onBroadcastCancel` handler (lines 877-892)
- [ ] Remove `onBroadcastFilterActive` handler (lines 900-923)
- [ ] Remove `onBroadcastFilterExpired` handler (lines 929-952)
- [ ] Remove `onBroadcastBotAll` handler (lines 958-985)
- [ ] Remove `onBroadcastBotSelected` handler (lines 991-1062)
- [ ] Remove `showStatusFilterKeyboard` helper (lines 1067-1093)
- [ ] Remove `showBotFilterKeyboard` helper (lines 1099-1133)
- [ ] Remove `handleBroadcastMessageInput` handler (lines 1217-1361)

**Update Text Handler:**

- [ ] Modify `onText` to remove `awaiting_broadcast_message` handling:
  ```typescript
  // BEFORE
  @On('text')
  async onText(@Ctx() ctx: UserContext): Promise<void> {
    this.ensureSession(ctx);
    const flowState = ctx.session.flowState;

    if (flowState === 'awaiting_subscription_name') {
      await this.handleSubscriptionNameInput(ctx);
    } else if (flowState === 'awaiting_broadcast_message') {
      await this.handleBroadcastMessageInput(ctx);  // REMOVE THIS
    }
  }

  // AFTER
  @On('text')
  async onText(@Ctx() ctx: UserContext): Promise<void> {
    this.ensureSession(ctx);
    const flowState = ctx.session.flowState;

    if (flowState === 'awaiting_subscription_name') {
      await this.handleSubscriptionNameInput(ctx);
    }
  }
  ```

**Remove Unused Imports (if any):**

- [ ] Check for and remove any imports that become unused after handler removal

### 3. Refactor Phase

- [ ] Verify no dead code remains
- [ ] Ensure consistent formatting
- [ ] Run subscription create/close tests to verify no regression

## Verification: Create/Close Flows Work

After removal, verify subscription flows still work:

```bash
# Run subscription-related tests
npm test -- libs/masterbot/src/__tests__/masterbot.update.spec.ts --testNamePattern="subscription"
```

Expected: All subscription create and close tests pass unchanged.

## Completion Criteria

- [ ] All broadcast handlers removed from MasterbotUpdate (~400 lines)
- [ ] Text handler only handles `awaiting_subscription_name`
- [ ] No unused imports remain
- [ ] Build succeeds: `npm run build`
- [ ] Type check passes: `npm run check`
- [ ] Subscription create/close tests pass
- [ ] No dead code (check:unused passes)

## Quality Check Commands

```bash
npm run check
npm run check:unused
npm run build
npm test -- libs/masterbot/src/__tests__/masterbot.update.spec.ts
```

## Notes

- Impact scope: MasterbotUpdate file only
- Post-task file size: ~960 lines (down from ~1362 lines)
- Constraints: Do not modify subscription create/close handlers
- Text Handler Coexistence: After this task, only BroadcastUpdate handles `awaiting_broadcast_message`
- Estimated time: 15 minutes
