# Task: Implement BroadcastUpdate Handlers

Metadata:
- Phase: 2 (Core Implementation)
- Dependencies: Task 02 (BroadcastUpdate class structure)
- Provides: Fully functional broadcast handlers
- Size: Medium (1 file + tests)
- Verification Level: L1 (Functional Operation)

## Implementation Content

Implement all handler methods in BroadcastUpdate by extracting logic from MasterbotUpdate. The key change is using `findActiveSubscriptions()` instead of `getActiveBroadcastSubscriptions()` to show ALL subscription types.

## Target Files

- [ ] `libs/masterbot/src/broadcast.update.ts`
- [ ] `libs/masterbot/src/__tests__/broadcast.update.spec.ts` (NEW)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [ ] Create test file `libs/masterbot/src/__tests__/broadcast.update.spec.ts`
- [ ] Write failing tests for:
  - `onBroadcastCommand` returns ALL subscription types (signals + broadcast)
  - `onBroadcastCommand` excludes subscriptions with 0 subscribers
  - Filter selection handlers update session correctly
  - `onBroadcastConfirm` calls sendBroadcast with filter parameters
- [ ] Run tests and confirm failure: `npm test -- libs/masterbot/src/__tests__/broadcast.update.spec.ts`

### 2. Green Phase

**Command Handler:**
- [ ] Implement `@Command('broadcast') onBroadcastCommand()`:
  - Check manager authentication
  - Call `subscriptionsRepository.findActiveSubscriptions()` (NOT getActiveBroadcastSubscriptions)
  - For each subscription, get subscriber count via `broadcastService.countSubscribers()`
  - Filter out subscriptions with 0 subscribers
  - Show inline keyboard with subscription buttons: `{name} ({count})`

**Subscription Selection:**
- [ ] Implement `@Action(/^broadcast_sub_(\d+)$/) onBroadcastSubscriptionSelected()`:
  - Parse subscription ID from callback data
  - Store subscriptionId in session
  - Show status filter keyboard via `showStatusFilterKeyboard()`

**Status Filter Handlers:**
- [ ] Implement `@Action('broadcast_filter_active') onBroadcastFilterActive()`:
  - Store `broadcastFilterStatus = 'active'` in session
  - Show bot filter keyboard via `showBotFilterKeyboard()`
- [ ] Implement `@Action('broadcast_filter_expired') onBroadcastFilterExpired()`:
  - Store `broadcastFilterStatus = 'expired'` in session
  - Show bot filter keyboard via `showBotFilterKeyboard()`

**Bot Filter Handlers:**
- [ ] Implement `@Action('broadcast_bot_all') onBroadcastBotAll()`:
  - Store `broadcastFilterBotId = null` in session
  - Set flowState to `awaiting_broadcast_message`
  - Send message input prompt
- [ ] Implement `@Action(/^broadcast_bot_(\d+)$/) onBroadcastBotSelected()`:
  - Parse bot ID from callback
  - Validate bot exists
  - Store `broadcastFilterBotId` in session
  - Set flowState to `awaiting_broadcast_message`
  - Send message input prompt

**Confirm/Cancel Handlers:**
- [ ] Implement `@Action('broadcast_confirm') onBroadcastConfirm()`:
  - Extract all parameters from session
  - Call `broadcastService.sendBroadcast()` with filter parameters
  - Log via `masterbotService.logManagerAction()`
  - Clear session state
  - Show success message with delivery stats
- [ ] Implement `@Action('broadcast_cancel') onBroadcastCancel()`:
  - Clear session state
  - Reply with cancellation message

**Text Handler:**
- [ ] Implement `@On('text') onText()`:
  - Check flowState is `awaiting_broadcast_message`
  - If not matching flowState, return early (don't handle)
  - Call `handleBroadcastMessageInput(ctx)`
- [ ] Implement `handleBroadcastMessageInput()`:
  - Validate message exists
  - Store message and entities in session
  - Get subscriber count with filters via `broadcastService.countSubscribers()`
  - Show preview with subscription name, target status, target bot, recipient count
  - Show confirm/cancel buttons
  - Set flowState to `confirming_broadcast`

**Helper Methods:**
- [ ] Implement `showStatusFilterKeyboard()`:
  - Show "Active subscribers" / "Expired subscribers" buttons
- [ ] Implement `showBotFilterKeyboard()`:
  - Get active bots from `botsRepository.findAllActive()`
  - Show "All bots" button
  - Show individual bot buttons

### 3. Refactor Phase

- [ ] Improve code organization and readability
- [ ] Ensure error handling is consistent
- [ ] Verify all added tests still pass

## Key Implementation Difference

**Current** (`onBroadcast` in MasterbotUpdate):
```typescript
// Uses getActiveBroadcastSubscriptions() - ONLY broadcast type
const subscriptions = await this.subscriptionManagementService.getActiveBroadcastSubscriptions();
```

**New** (`onBroadcastCommand` in BroadcastUpdate):
```typescript
// Uses findActiveSubscriptions() - ALL subscription types
const subscriptions = await this.subscriptionsRepository.findActiveSubscriptions();
```

## Unit Tests to Create

```typescript
// libs/masterbot/src/__tests__/broadcast.update.spec.ts
describe('BroadcastUpdate', () => {
  describe('onBroadcastCommand', () => {
    it('should return ALL subscription types including signals', async () => {
      // Arrange: Mock findActiveSubscriptions to return signals + broadcast types
      // Act: Call onBroadcastCommand
      // Assert: Both signals and broadcast subscriptions appear in response
    });

    it('should exclude subscriptions with 0 subscribers', async () => {
      // Arrange: Mock countSubscribers to return 0 for one subscription
      // Act: Call onBroadcastCommand
      // Assert: Subscription with 0 count not in response
    });
  });

  describe('filter selection handlers', () => {
    it('should store broadcastFilterStatus in session when status selected', async () => {
      // Arrange: Setup context with session
      // Act: Call onBroadcastFilterActive
      // Assert: session.broadcastFilterStatus === 'active'
    });
  });

  describe('onBroadcastConfirm', () => {
    it('should call sendBroadcast with all filter parameters from session', async () => {
      // Arrange: Setup session with subscriptionId, message, filterStatus, filterBotId
      // Act: Call onBroadcastConfirm
      // Assert: broadcastService.sendBroadcast called with correct params
    });
  });
});
```

## Completion Criteria

- [ ] All handler methods fully implemented
- [ ] Unit tests created and passing
- [ ] `onBroadcastCommand` queries ALL subscription types
- [ ] Filter flow updates session state correctly
- [ ] Confirm handler passes filter parameters to service
- [ ] Build succeeds: `npm run build`
- [ ] Type check passes: `npm run check`
- [ ] Unit tests pass: `npm test -- libs/masterbot/src/__tests__/broadcast.update.spec.ts`

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/__tests__/broadcast.update.spec.ts
```

## Notes

- Pattern Reference: Copy implementation logic from MasterbotUpdate handlers
- Key Change: Use `findActiveSubscriptions()` instead of `getActiveBroadcastSubscriptions()`
- Impact scope: BroadcastUpdate file and new test file only
- Constraints: Do not modify MasterbotUpdate yet (Task 5)
- Estimated time: 30 minutes
