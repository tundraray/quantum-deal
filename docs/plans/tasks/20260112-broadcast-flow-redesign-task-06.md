# Task: Implement Subscription Toggle Keyboard

Metadata:
- Dependencies: Task 1 (session state), Task 2 (constants), Task 5 (bot selection)
- Provides: `showSubscriptionToggleKeyboard()` helper in `broadcast.update.ts`
- Size: Small (1 file)
- Phase: 3 - Handler Layer
- Verification Level: L1 (Functional Operation)
- Acceptance Criteria: AC2 (Subscription Filtering by Bot), AC3 (Multiple Selection)

## Implementation Content

Implement a subscription toggle keyboard that:
1. Shows after bot selection
2. Displays subscriptions with subscriber counts filtered by selected bot
3. Uses toggle buttons with checkmarks for selection state
4. Filters out subscriptions with 0 subscribers (unless ALL are 0)
5. Includes "Select All", "Done", and "Cancel" buttons

## Target Files

- [x] `libs/masterbot/src/broadcast.update.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Locate existing bot selection handler (`onBroadcastBotSelected` or similar)
- [x] Study existing keyboard helper patterns (e.g., `showBotFilterKeyboard`)
- [x] Understand how `countSubscribers` is called with bot filter
- [x] Review constants added in Task 2

### 2. Green Phase

- [x] Modify bot selection handler to trigger subscription toggle keyboard:
  ```typescript
  @Action(/^broadcast_bot_(\d+)$/)
  async onBroadcastBotSelected(@Ctx() ctx: UserContext): Promise<void> {
    const match = ctx.match;
    const botId = parseInt(match[1], 10);
    ctx.session.broadcastFilterBotId = botId;
    ctx.session.broadcastSubscriptionIds = [];
    ctx.session.flowState = 'selecting_subscriptions';

    await this.showSubscriptionToggleKeyboard(ctx);
  }
  ```

- [x] Implement `showSubscriptionToggleKeyboard(ctx)` helper:
  ```typescript
  private async showSubscriptionToggleKeyboard(ctx: UserContext): Promise<void> {
    const botId = ctx.session.broadcastFilterBotId;
    const subscriptions = await this.subscriptionsRepository.findActiveSubscriptions();

    // Get counts for each subscription filtered by bot
    const subsWithCounts = await Promise.all(
      subscriptions.map(async (sub) => ({
        ...sub,
        count: await this.broadcastService.countSubscribers(sub.id, 'active', botId),
      }))
    );

    // Filter out zero-count, unless ALL are zero (fallback)
    const nonEmpty = subsWithCounts.filter(s => s.count > 0);
    const displaySubs = nonEmpty.length > 0 ? nonEmpty : subsWithCounts;

    const selectedIds = ctx.session.broadcastSubscriptionIds || [];

    // Build toggle buttons
    const buttons = displaySubs.map((sub) => {
      const isSelected = selectedIds.includes(sub.id);
      const checkmark = isSelected ? '[v]' : '[ ]';
      return [
        Markup.button.callback(
          `${checkmark} ${sub.name} (${sub.count} users)`,
          `${CALLBACK_ACTIONS.BROADCAST_SUB_TOGGLE_PREFIX}${sub.id}`,
        ),
      ];
    });

    // Add Select All and Done buttons
    buttons.push([
      Markup.button.callback('Select All', CALLBACK_ACTIONS.BROADCAST_SUB_SELECT_ALL),
    ]);
    buttons.push([
      Markup.button.callback('Done', CALLBACK_ACTIONS.BROADCAST_SUB_DONE),
      Markup.button.callback('Cancel', CALLBACK_ACTIONS.BROADCAST_CANCEL),
    ]);

    await ctx.editMessageText('Select subscriptions for broadcast:', {
      ...Markup.inlineKeyboard(buttons),
    });
  }
  ```

- [x] Manual test: Bot selection triggers subscription toggle keyboard

### 3. Refactor Phase

- [x] Extract button building logic if too complex
- [x] Ensure consistent error handling
- [x] Add logging: `logger.log('Subscription toggle: showing ${displaySubs.length} subscriptions')`

## UI Specification

```
Select subscriptions for broadcast:
Bot: QuantumDealBot

[ ] Premium Signals (45 users)
[v] Basic Signals (120 users)
[v] Free Tier (230 users)

[Select All]
[Done]  [Cancel]
```

## Completion Criteria

- [x] Bot selection handler triggers subscription toggle keyboard
- [x] `flowState = 'selecting_subscriptions'` is set
- [x] `broadcastSubscriptionIds` initialized as empty array
- [x] Toggle buttons show with checkmark indicators
- [x] Counts shown per selected bot filter
- [x] Subscriptions with 0 count filtered out (unless all 0)
- [x] "Select All", "Done", "Cancel" buttons present
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`)

## Quality Check Commands

```bash
npm run check
npm run build
```

## Notes

- **Impact scope**: This is the core UI for multiple subscription selection
- **Constraints**: Must reuse existing `countSubscribers` method
- **Pattern Reference**: Follow existing keyboard helper patterns
- **Fallback Behavior**: If ALL subscriptions have 0 subscribers for this bot, show ALL
