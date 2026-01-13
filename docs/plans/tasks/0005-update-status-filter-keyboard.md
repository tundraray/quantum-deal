# Task: Update Status Filter Keyboard with Counts

Metadata:
- Dependencies: Task 0003 (Service methods) -> Deliverable: countSubscribers method (existing)
- Provides: Updated status filter UI with subscriber counts
- Size: Small (1 file)
- Phase: 4 - Handler Layer (Task 4.2)
- Verification Level: L1 (Functional Operation Verification)
- Acceptance Criteria: AC4 (Status filter buttons display counts)

## Implementation Content

Update `showStatusFilterKeyboard()` to display subscriber counts in status filter buttons. This gives managers visibility into audience size before making a selection.

Changes:
1. Add count queries for active and expired subscribers
2. Update button text format from "Active" to "Active (N)"

## Target Files

- [x] `libs/masterbot/src/broadcast.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review existing `showStatusFilterKeyboard()` implementation
- [x] Identify current button creation code
- [x] Understand session state access for subscriptionIds and botId
- [x] No unit tests for L1 verification (manual operation test)

### 2. Green Phase

- [x] Get subscription IDs and bot ID from session:
  ```typescript
  const subscriptionIds = ctx.session.broadcastSubscriptionIds ?? [];
  const botId = ctx.session.broadcastFilterBotId;
  ```

- [x] Add count queries:
  ```typescript
  const [activeCount, expiredCount] = await Promise.all([
    this.broadcastService.countSubscribers(subscriptionIds, 'active', botId),
    this.broadcastService.countSubscribers(subscriptionIds, 'expired', botId),
  ]);
  ```

- [x] Update button text to include counts:
  ```typescript
  const buttons = [
    [
      Markup.button.callback(
        `Active (${activeCount})`,
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_ACTIVE,
      ),
    ],
    [
      Markup.button.callback(
        `Expired (${expiredCount})`,
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_EXPIRED,
      ),
    ],
    [
      Markup.button.callback(
        'Cancel',
        MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_CANCEL,
      ),
    ],
  ];
  ```

### 3. Refactor Phase

- [x] Ensure parallel query execution with `Promise.all`
- [x] Handle edge cases (empty subscriptionIds, null botId)
- [x] Verify consistent button text formatting
- [x] Run quality checks

## Expected UI Changes

### Before
```
[Active]
[Expired]
[Cancel]
```

### After
```
[Active (45)]
[Expired (12)]
[Cancel]
```

## Completion Criteria

- [x] Count queries added for active and expired
- [x] Button text updated to include counts: "Active (N)" / "Expired (M)"
- [x] Parallel query execution for performance
- [x] Build succeeds without errors (`pnpm build`)
- [x] Type check passes (`pnpm typecheck`) - No separate typecheck script, build includes type checking

## Operational Verification Procedures

1. Start bot in development mode
2. Run `/broadcast` command
3. Select a bot
4. Select one or more subscriptions, click "Done"
5. Observe status filter keyboard:
   - Verify "Active (N)" button shows count
   - Verify "Expired (M)" button shows count
6. Run quality checks:
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

- **Impact scope**: showStatusFilterKeyboard in broadcast.update.ts
- **Constraints**: Must handle case where subscriptionIds is empty or null
- **Dependencies**: Uses existing countSubscribers method with status filter
- **Performance**: Use Promise.all for parallel queries
