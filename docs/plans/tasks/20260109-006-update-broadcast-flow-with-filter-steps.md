# Task: Update Broadcast Flow with Filter Steps

Metadata:
- Dependencies:
  - Task 002 -> Deliverable: Extended `countSubscribers` method
  - Task 003 -> Deliverable: Extended `sendBroadcast` method
  - Task 004 -> Deliverable: Constants and session state types
  - Task 005 -> Deliverable: Filter selection handlers
- Provides: Complete broadcast flow with filter integration
- Size: Small (1-2 files)
- Phase: 3 - Handler Layer
- Verification Level: L1 (Functional Operation)
- Acceptance Criteria: AC1, AC2, AC3, AC4, AC5

## Implementation Content

Update the existing broadcast flow to integrate filter selection steps. After subscription selection, the flow should prompt for status filter, then bot filter, before proceeding to message input. The preview and confirmation steps must pass filter parameters to the service layer.

## Target Files

- [x] `libs/masterbot/src/masterbot.update.ts` (implementation)
- [x] `libs/masterbot/src/__tests__/masterbot.update.spec.ts` (unit tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review all dependency deliverables:
  - Task 002: Extended `countSubscribers`
  - Task 003: Extended `sendBroadcast`
  - Task 004: Constants and session types
  - Task 005: Filter selection handlers
- [x] Write failing unit tests:
  1. After subscription selection, shows status filter keyboard
  2. Message input handler passes filters to `countSubscribers`
  3. Preview message shows filter selections and correct count
  4. Broadcast confirmation passes filters to `sendBroadcast`
  5. Filter state resets on cancel or completion
  6. Default flow (skipping filters) still works (AC5)
- [x] Run tests and confirm they fail

### 2. Green Phase

**Modify Subscription Selection Handler:**
- [x] Update `onBroadcastSubscriptionSelected` handler:
  ```typescript
  // After storing subscriptionId
  session.flowState = 'selecting_status_filter';
  await this.showStatusFilterKeyboard(ctx);
  ```

**Update Message Input Handler:**
- [x] Modify message input handler to use filters:
  ```typescript
  const count = await this.broadcastService.countSubscribers(
    session.broadcastSubscriptionId,
    session.broadcastFilterStatus,
    session.broadcastFilterBotId,
  );
  ```

**Update Preview Message:**
- [x] Include filter descriptions in preview:
  ```typescript
  // Target: Active/Expired subscribers
  // Bot: All bots / [Bot Name]
  // Recipients: N users
  ```
- [x] Fetch bot name if `broadcastFilterBotId` is set

**Update Broadcast Confirmation:**
- [x] Pass filters to `sendBroadcast`:
  ```typescript
  await this.broadcastService.sendBroadcast(
    session.broadcastSubscriptionId,
    message,
    entities,
    managerId,
    session.broadcastFilterStatus,
    session.broadcastFilterBotId,
  );
  ```

**Session State Management:**
- [x] Initialize filter defaults in session:
  ```typescript
  session.broadcastFilterStatus = null;
  session.broadcastFilterBotId = null;
  ```
- [x] Reset filter state on cancel:
  ```typescript
  session.broadcastFilterStatus = null;
  session.broadcastFilterBotId = null;
  session.flowState = null;
  ```
- [x] Reset filter state on completion:
  ```typescript
  // After successful broadcast
  session.broadcastFilterStatus = null;
  session.broadcastFilterBotId = null;
  ```

- [x] Run only added tests and confirm they pass

### 3. Refactor Phase

- [x] Extract preview message building logic
- [x] Ensure consistent session reset in all exit paths
- [x] Confirm added tests still pass

## Flow Diagram

```
Current Flow:
Select Subscription -> Enter Message -> Preview -> Confirm

New Flow:
Select Subscription -> Select Status Filter -> Select Bot Filter -> Enter Message -> Preview -> Confirm
                       |                        |
                       v                        v
                   [Cancel]                 [Cancel]
                       |                        |
                       +------------------------+
                                  |
                                  v
                            Reset & Exit
```

## Preview Message Format

```typescript
const filterStatusLabel = session.broadcastFilterStatus === 'expired'
  ? 'Expired subscribers'
  : 'Active subscribers';

const botLabel = session.broadcastFilterBotId
  ? (await this.botsRepository.findById(session.broadcastFilterBotId))?.name || 'Unknown bot'
  : 'All bots';

const preview = `
Broadcast preview

Subscription: ${subscriptionName}
Target: ${filterStatusLabel}
Bot: ${botLabel}
Recipients: ${count} users

Message:
${message}

Send this message?
`;
```

## Completion Criteria

- [x] All added unit tests pass
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`)
- [x] Filter selection steps integrated into flow
- [x] Preview shows filter selections and accurate count
- [x] Confirmation uses correct filter parameters
- [x] Session state properly initialized and reset
- [x] Backward compatibility maintained (AC5)

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/__tests__/masterbot.update.spec.ts
```

## Notes

- **Impact scope**: This completes the handler layer implementation
- **Constraints**: Must maintain backward compatibility for existing flows
- **Integration**: Full integration with service layer filter support
- **Session Hygiene**: All filter state must be reset on cancel/completion to prevent stale state

## Test Specification

```typescript
describe('broadcast flow with filters', () => {
  it('should show status filter keyboard after subscription selection', async () => {
    // Arrange: Select a subscription
    // Act: Trigger subscription selection callback
    // Assert: Status filter keyboard displayed, flowState = 'selecting_status_filter'
  });

  it('should pass filters to countSubscribers when counting recipients', async () => {
    // Arrange: Set filter session state
    // Act: Enter broadcast message
    // Assert: countSubscribers called with filter parameters
  });

  it('should show filter selections in preview message', async () => {
    // Arrange: Set filters, enter message
    // Act: View preview
    // Assert: Preview shows "Target: Expired subscribers" and "Bot: QuantumDealBot"
  });

  it('should pass filters to sendBroadcast on confirmation', async () => {
    // Arrange: Complete flow to confirmation
    // Act: Confirm broadcast
    // Assert: sendBroadcast called with filter parameters
  });

  it('should reset filter state on cancel', async () => {
    // Arrange: Set filter session state
    // Act: Cancel broadcast
    // Assert: broadcastFilterStatus = null, broadcastFilterBotId = null
  });

  describe('backward compatibility (AC5)', () => {
    it('should work without explicit filter selection', async () => {
      // Verify default behavior paths still work
    });
  });
});
```
