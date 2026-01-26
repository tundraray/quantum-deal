# Task: Update Subscription Toggle Keyboard with Total Counts and "Without subscription" Button

Metadata:
- Dependencies: Task 0003 (Service methods) -> Deliverable: countAllSubscribers, countUsersWithoutSubscription
- Provides: Updated subscription selection UI with total counts and new option
- Size: Small (1 file)
- Phase: 4 - Handler Layer (Task 4.1)
- Verification Level: L1 (Functional Operation Verification)
- Acceptance Criteria: AC5 (Total user counts), AC3 (Without subscription option)

## Implementation Content

Update `showSubscriptionToggleKeyboard()` to:
1. Display total user counts (active + expired) instead of only active counts
2. Add "Without subscription" button at the end with count

This gives managers visibility into total reach and new targeting option.

## Target Files

- [x] `libs/masterbot/src/broadcast.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review existing `showSubscriptionToggleKeyboard()` implementation
- [x] Identify where `countSubscribers(sub.id, 'active', botId)` is called
- [x] Understand current button text format
- [x] No unit tests for L1 verification (manual operation test)

### 2. Green Phase

- [x] Change count method call from active-only to total:
  ```typescript
  // Before
  const count = await this.broadcastService.countSubscribers(sub.id, 'active', botId);

  // After
  const count = await this.broadcastService.countAllSubscribers(sub.id, botId);
  ```

- [x] Add "Without subscription" button after subscription list:
  ```typescript
  // After subscription toggle buttons, before "Done" button
  const noSubCount = await this.broadcastService.countUsersWithoutSubscription(botId);
  buttons.push([
    Markup.button.callback(
      `[ ] Без подписки (${noSubCount} users)`,
      MASTERBOT_CONSTANTS.CALLBACK_ACTIONS.BROADCAST_FILTER_NO_SUBSCRIPTION,
    ),
  ]);
  ```

- [x] Verify button text format matches existing pattern: "Name (N users)"

### 3. Refactor Phase

- [x] Ensure parallel query execution for performance:
  ```typescript
  const [subscriptionCounts, noSubCount] = await Promise.all([
    Promise.all(subscriptions.map(sub => this.broadcastService.countAllSubscribers(sub.id, botId))),
    this.broadcastService.countUsersWithoutSubscription(botId),
  ]);
  ```
- [x] Verify consistent button text formatting
- [x] Run quality checks

## Expected UI Changes

### Before
```
[ ] Premium (45 users)      <- only active count
[x] Basic (120 users)       <- only active count
[Done]
```

### After
```
[ ] Premium (150 users)     <- total count (active + expired)
[x] Basic (200 users)       <- total count (active + expired)
[ ] Без подписки (25 users) <- NEW: users without any subscription
[Done]
```

## Completion Criteria

- [x] `countAllSubscribers()` used instead of `countSubscribers(sub.id, 'active', botId)`
- [x] "Without subscription" button added with count
- [x] Button text shows total counts (active + expired)
- [x] Build succeeds without errors (`pnpm build`)
- [x] Type check passes (`pnpm typecheck`)

## Operational Verification Procedures

1. Start bot in development mode
2. Run `/broadcast` command
3. Select a bot
4. Observe subscription selection keyboard:
   - Verify subscription buttons show total counts
   - Verify "Without subscription" button appears with count
5. Run quality checks:
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

- **Impact scope**: showSubscriptionToggleKeyboard in broadcast.update.ts
- **Constraints**: Button text must fit Telegram limits
- **Dependencies**: Requires Phase 3 service methods
- **UX consideration**: "Without subscription" is mutually exclusive with other subscriptions
