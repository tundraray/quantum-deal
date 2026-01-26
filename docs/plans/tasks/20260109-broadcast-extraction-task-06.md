# Task: Update Subscription Menu and Help Text

Metadata:
- Phase: 3 (Cleanup & Integration)
- Dependencies: Task 05 (broadcast handlers removed from MasterbotUpdate)
- Provides: Clean subscription menu without broadcast option, updated help text
- Size: Small (1 file)
- Verification Level: L1 (Functional Operation)

## Implementation Content

Update the `/subscription` menu to remove the "Send message" broadcast button and update the `/help` text to mention the new `/broadcast` command.

## Target Files

- [x] `libs/masterbot/src/masterbot.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [ ] Integration test placeholders exist:
  - `it.todo('AC2: BroadcastUpdate handles complete filter selection flow')`
  - `it.todo('AC4: Broadcast confirm triggers sendBroadcast with all filter parameters from session')`
  - `it.todo('AC: /subscription menu shows only Create and Close buttons')`

### 2. Green Phase

**Update Menu:**

- [x] Modify `onSubscriptionMenu` handler:
  - Remove "Send message" / broadcast button
  - Keep only: "Create subscription", "Close subscription"
  - Update menu text to reflect subscription management only

```typescript
// BEFORE
@Command('subscription')
async onSubscriptionMenu(@Ctx() ctx: UserContext): Promise<void> {
  await ctx.reply('Manage subscriptions:', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('Create subscription', 'subscription_create')],
      [Markup.button.callback('Close subscription', 'subscription_close')],
      [Markup.button.callback('Send message', 'subscription_broadcast')],  // REMOVE
    ]),
  });
}

// AFTER
@Command('subscription')
async onSubscriptionMenu(@Ctx() ctx: UserContext): Promise<void> {
  await ctx.reply('Manage subscriptions:', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('Create subscription', 'subscription_create')],
      [Markup.button.callback('Close subscription', 'subscription_close')],
    ]),
  });
}
```

**Update Help:**

- [x] Modify `onHelp` handler:
  - Add `/broadcast - Send message to subscribers` to help text
  - Ensure /subscription description reflects management-only

```typescript
// Help text update example
@Command('help')
async onHelp(@Ctx() ctx: UserContext): Promise<void> {
  const helpText = `
Available commands:
/start - Start the bot
/stats - View statistics
/code - Generate subscription code
/subscription - Manage subscriptions (create/close)
/broadcast - Send message to subscribers  // NEW
/help - Show this help message
`;
  await ctx.reply(helpText);
}
```

### 3. Refactor Phase

- [x] Verify help text formatting is consistent
- [x] Ensure no references to removed broadcast functionality in menu texts

## Integration Tests (Phase 3 Completion)

After this task, run integration tests to verify AC2 and AC4:

```bash
npm test -- libs/masterbot/src/__tests__/broadcast.integration.spec.ts --testNamePattern="AC2|AC4"
```

Expected: Resolve:
- `it.todo('AC2: BroadcastUpdate handles complete filter selection flow')`
- `it.todo('AC4: Broadcast confirm triggers sendBroadcast with all filter parameters from session')`
- `it.todo('AC: /subscription menu shows only Create and Close buttons')`

## Phase 3 Operational Verification

1. Send `/subscription` command
2. Verify menu shows only "Create subscription" and "Close subscription"
3. Verify no "Send message" button present
4. Send `/help` command
5. Verify `/broadcast` mentioned in help
6. Create a test subscription (verify create flow works)
7. Complete a broadcast via `/broadcast` (verify full flow)

## Completion Criteria

- [x] `/subscription` menu shows only Create and Close buttons
- [x] "Send message" button removed
- [x] `/help` text includes `/broadcast` command
- [x] Build succeeds: `npm run build`
- [ ] Type check passes: `npm run check`
- [ ] MasterbotUpdate tests pass

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/__tests__/masterbot.update.spec.ts
npm test -- libs/masterbot/src/__tests__/broadcast.integration.spec.ts --testNamePattern="AC2|AC4"
```

## Notes

- Impact scope: MasterbotUpdate file only (menu and help handlers)
- Constraints: Do not modify subscription create/close logic
- UX impact: Users must use `/broadcast` instead of `/subscription` for messaging
- Estimated time: 10 minutes
