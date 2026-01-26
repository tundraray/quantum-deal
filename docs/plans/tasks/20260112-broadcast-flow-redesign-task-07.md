# Task: Implement Toggle/Select-All/Done Handlers

Metadata:
- Dependencies: Task 6 (keyboard), Task 1 (session state), Task 2 (constants)
- Provides: Toggle handlers in `broadcast.update.ts`
- Size: Small (1-2 files)
- Phase: 3 - Handler Layer
- Verification Level: L1 (Functional Operation)
- Acceptance Criteria: AC3 (Multiple Subscription Selection)

## Implementation Content

Implement three handlers for the subscription toggle keyboard:
1. `onBroadcastSubscriptionToggle` - toggle individual subscription selection
2. `onBroadcastSelectAll` - select all displayed subscriptions
3. `onBroadcastSubscriptionsDone` - validate and proceed to status filter

## Target Files

- [x] `libs/masterbot/src/broadcast.update.ts`
- [ ] `libs/masterbot/src/__tests__/broadcast.update.spec.ts` (unit tests optional)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review constants from Task 2
- [x] Understand how session state array manipulation works
- [x] Review existing callback handler patterns
- [ ] Write unit tests for handlers (optional but recommended):
  1. Toggle handler adds subscription ID to array
  2. Toggle handler removes existing subscription ID from array
  3. Select all sets all subscription IDs
  4. Done handler validates at least one selection
  5. Done handler shows warning when no selection

### 2. Green Phase

- [x] Implement `onBroadcastSubscriptionToggle` handler:
  ```typescript
  @Action(/^broadcast_sub_toggle_(\d+)$/)
  async onBroadcastSubscriptionToggle(@Ctx() ctx: UserContext): Promise<void> {
    const match = ctx.match;
    const subId = parseInt(match[1], 10);

    const selectedIds = ctx.session.broadcastSubscriptionIds || [];
    const index = selectedIds.indexOf(subId);

    if (index > -1) {
      // Remove if already selected
      selectedIds.splice(index, 1);
    } else {
      // Add if not selected
      selectedIds.push(subId);
    }

    ctx.session.broadcastSubscriptionIds = selectedIds;

    // Refresh keyboard to show updated checkmarks
    await this.showSubscriptionToggleKeyboard(ctx);
  }
  ```

- [x] Implement `onBroadcastSelectAll` handler:
  ```typescript
  @Action(CALLBACK_ACTIONS.BROADCAST_SUB_SELECT_ALL)
  async onBroadcastSelectAll(@Ctx() ctx: UserContext): Promise<void> {
    const botId = ctx.session.broadcastFilterBotId;
    const subscriptions = await this.subscriptionsRepository.findActiveSubscriptions();

    // Get same filtered list as keyboard shows
    const subsWithCounts = await Promise.all(
      subscriptions.map(async (sub) => ({
        id: sub.id,
        count: await this.broadcastService.countSubscribers(sub.id, 'active', botId),
      }))
    );

    const nonEmpty = subsWithCounts.filter(s => s.count > 0);
    const displaySubs = nonEmpty.length > 0 ? nonEmpty : subsWithCounts;

    // Select all displayed subscriptions
    ctx.session.broadcastSubscriptionIds = displaySubs.map(s => s.id);

    // Refresh keyboard with all checkmarks
    await this.showSubscriptionToggleKeyboard(ctx);
  }
  ```

- [x] Implement `onBroadcastSubscriptionsDone` handler:
  ```typescript
  @Action(CALLBACK_ACTIONS.BROADCAST_SUB_DONE)
  async onBroadcastSubscriptionsDone(@Ctx() ctx: UserContext): Promise<void> {
    const selectedIds = ctx.session.broadcastSubscriptionIds || [];

    if (selectedIds.length === 0) {
      // Show warning - no selection
      await ctx.answerCbQuery('Please select at least one subscription');
      return;
    }

    // Proceed to status filter
    ctx.session.flowState = 'selecting_status_filter';
    await this.showStatusFilterKeyboard(ctx);
  }
  ```

- [x] Run tests and verify handlers work correctly

### 3. Refactor Phase

- [x] Add logging for toggle actions
- [x] Ensure consistent error handling
- [ ] Verify tests still pass

## Handler Specifications

### Toggle Handler
- **Action Pattern**: `/^broadcast_sub_toggle_(\d+)$/`
- **Behavior**: Toggle subscription in/out of selection array
- **Result**: Refresh keyboard with updated checkmarks

### Select All Handler
- **Action**: `BROADCAST_SUB_SELECT_ALL`
- **Behavior**: Add all displayed subscription IDs to array
- **Result**: Refresh keyboard with all checked

### Done Handler
- **Action**: `BROADCAST_SUB_DONE`
- **Behavior**: Validate at least 1 selection, proceed to status filter
- **Validation**: Show toast warning if empty selection
- **Result**: Show status filter keyboard

## Test Specification

```typescript
describe('Subscription Toggle Handlers', () => {
  it('should add subscription ID to array when toggled on', async () => {
    // Arrange: session.broadcastSubscriptionIds = []
    // Act: trigger broadcast_sub_toggle_1
    // Assert: session.broadcastSubscriptionIds = [1]
  });

  it('should remove subscription ID from array when toggled off', async () => {
    // Arrange: session.broadcastSubscriptionIds = [1, 2]
    // Act: trigger broadcast_sub_toggle_1
    // Assert: session.broadcastSubscriptionIds = [2]
  });

  it('should select all displayed subscriptions', async () => {
    // Arrange: 3 subscriptions with counts > 0
    // Act: trigger broadcast_sub_select_all
    // Assert: session.broadcastSubscriptionIds = [1, 2, 3]
  });

  it('should show warning when done with empty selection', async () => {
    // Arrange: session.broadcastSubscriptionIds = []
    // Act: trigger broadcast_sub_done
    // Assert: answerCbQuery called with warning message
  });

  it('should proceed to status filter when done with valid selection', async () => {
    // Arrange: session.broadcastSubscriptionIds = [1]
    // Act: trigger broadcast_sub_done
    // Assert: flowState = 'selecting_status_filter'
  });
});
```

## Completion Criteria

- [x] Toggle handler adds/removes subscription from array correctly
- [x] Select all handler sets all displayed subscription IDs
- [x] Done handler validates at least one selection
- [x] Warning shown when no selection made
- [x] Status filter shown after valid selection
- [x] Build succeeds without errors (`npm run build`)
- [ ] Type check passes (`npm run check`) - pre-existing errors in other files

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/__tests__/broadcast.update.spec.ts
```

## Notes

- **Impact scope**: Core toggle functionality for multi-selection
- **Constraints**: Must maintain session state correctly across keyboard refreshes
- **Pattern Reference**: Follow existing callback handler patterns
- **Array Manipulation**: Use splice for removal, push for addition
