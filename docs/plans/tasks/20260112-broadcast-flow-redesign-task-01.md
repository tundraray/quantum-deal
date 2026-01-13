# Task: Update Session Interface with broadcastSubscriptionIds

Metadata:
- Dependencies: None (Foundation task)
- Provides: `libs/masterbot/src/interfaces/user-context.interface.ts` - updated session state
- Size: Small (1 file)
- Phase: 1 - Foundation
- Verification Level: L3 (Build Success)
- Acceptance Criteria: Supports AC3 (Multiple Subscription Selection)

## Implementation Content

Update the session state interface to support multiple subscription selection for the redesigned broadcast flow. This involves:
1. Adding `broadcastSubscriptionIds?: number[] | null` array field
2. Adding `'selecting_subscriptions'` to the flowState union type
3. Keeping deprecated `broadcastSubscriptionId` for transition compatibility

## Target Files

- [x] `libs/masterbot/src/interfaces/user-context.interface.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review existing session state interface structure
- [x] Identify all flowState values currently defined
- [x] Identify existing `broadcastSubscriptionId` field location
- [x] No tests needed for L3 verification (type definitions only)

### 2. Green Phase

- [x] Add `broadcastSubscriptionIds?: number[] | null` field to session state interface
- [x] Add `'selecting_subscriptions'` to flowState union type (alongside existing values):
  ```typescript
  flowState?:
    | 'awaiting_subscription_name'
    | 'awaiting_broadcast_message'
    | 'confirming_broadcast'
    | 'selecting_status_filter'
    | 'selecting_bot_filter'
    | 'selecting_subscriptions'  // NEW
    | null;
  ```
- [x] Add deprecation JSDoc comment to existing `broadcastSubscriptionId` field:
  ```typescript
  /** @deprecated Use broadcastSubscriptionIds instead. Kept for transition compatibility. */
  broadcastSubscriptionId?: number | null;
  ```
- [x] Run type check to verify build succeeds

### 3. Refactor Phase

- [x] Ensure consistent naming with other broadcast-related fields
- [x] Verify JSDoc comments are accurate
- [x] Confirm type check passes

## Expected Interface Changes

```typescript
// Before (existing fields)
interface SessionState {
  broadcastSubscriptionId?: number | null;
  broadcastFilterStatus?: 'active' | 'expired' | null;
  broadcastFilterBotId?: number | null;
  // ...
}

// After (added fields)
interface SessionState {
  /** @deprecated Use broadcastSubscriptionIds instead. Kept for transition compatibility. */
  broadcastSubscriptionId?: number | null;
  broadcastSubscriptionIds?: number[] | null;  // NEW
  broadcastFilterStatus?: 'active' | 'expired' | null;
  broadcastFilterBotId?: number | null;
  flowState?:
    | 'awaiting_subscription_name'
    | 'awaiting_broadcast_message'
    | 'confirming_broadcast'
    | 'selecting_status_filter'
    | 'selecting_bot_filter'
    | 'selecting_subscriptions'  // NEW
    | null;
  // ...
}
```

## Completion Criteria

- [x] `broadcastSubscriptionIds?: number[] | null` field added
- [x] `'selecting_subscriptions'` added to flowState union
- [x] Deprecation comment added to `broadcastSubscriptionId`
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`) - Note: project uses `npm run build` for type verification

## Quality Check Commands

```bash
npm run check
npm run build
```

## Notes

- **Impact scope**: All broadcast handlers will access this new field
- **Constraints**: Do not remove existing `broadcastSubscriptionId` - it's used by existing code
- **Pattern Reference**: Follow existing session field patterns like `broadcastFilterBotId`
