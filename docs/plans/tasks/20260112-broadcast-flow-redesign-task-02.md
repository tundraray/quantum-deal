# Task: Add New Callback Action Constants

Metadata:
- Dependencies: None (Foundation task)
- Provides: `libs/masterbot/src/constants.ts` - new callback action constants
- Size: Small (1 file)
- Phase: 1 - Foundation
- Verification Level: L3 (Build Success)
- Acceptance Criteria: Supports AC3 (Multiple Subscription Selection UI)

## Implementation Content

Add new callback action constants required for the multiple subscription selection UI:
1. `BROADCAST_SUB_TOGGLE_PREFIX` - prefix for individual subscription toggle callbacks
2. `BROADCAST_SUB_SELECT_ALL` - select all subscriptions action
3. `BROADCAST_SUB_DONE` - complete subscription selection action

These constants will be used by the subscription toggle keyboard handlers in Task 6 and 7.

## Target Files

- [x] `libs/masterbot/src/constants.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Review existing CALLBACK_ACTIONS structure in constants.ts
- [x] Identify naming conventions used (e.g., `BROADCAST_` prefix pattern)
- [x] No tests needed for L3 verification (constants only)

### 2. Green Phase

- [x] Add constants to CALLBACK_ACTIONS object:
  ```typescript
  export const CALLBACK_ACTIONS = {
    // ... existing actions ...

    // Subscription toggle actions for multi-select
    BROADCAST_SUB_TOGGLE_PREFIX: 'broadcast_sub_toggle_',  // broadcast_sub_toggle_{id}
    BROADCAST_SUB_SELECT_ALL: 'broadcast_sub_select_all',
    BROADCAST_SUB_DONE: 'broadcast_sub_done',
  } as const;
  ```
- [x] Run type check to verify build succeeds

### 3. Refactor Phase

- [x] Ensure constants are grouped logically with other broadcast-related constants
- [x] Add JSDoc comments explaining usage if needed
- [x] Confirm type check passes

## Expected Constants

```typescript
// New constants to add
BROADCAST_SUB_TOGGLE_PREFIX: 'broadcast_sub_toggle_'  // Used as: broadcast_sub_toggle_123
BROADCAST_SUB_SELECT_ALL: 'broadcast_sub_select_all'  // Select all subscriptions
BROADCAST_SUB_DONE: 'broadcast_sub_done'              // Complete selection
```

## Usage Preview (for context)

```typescript
// Handler registration (Task 7)
@Action(/^broadcast_sub_toggle_(\d+)$/)
async onBroadcastSubscriptionToggle(@Ctx() ctx: UserContext) { ... }

@Action(CALLBACK_ACTIONS.BROADCAST_SUB_SELECT_ALL)
async onBroadcastSelectAll(@Ctx() ctx: UserContext) { ... }

@Action(CALLBACK_ACTIONS.BROADCAST_SUB_DONE)
async onBroadcastSubscriptionsDone(@Ctx() ctx: UserContext) { ... }

// Button creation (Task 6)
Markup.button.callback(`[v] Sub Name`, `${CALLBACK_ACTIONS.BROADCAST_SUB_TOGGLE_PREFIX}${sub.id}`)
Markup.button.callback('Select All', CALLBACK_ACTIONS.BROADCAST_SUB_SELECT_ALL)
Markup.button.callback('Done', CALLBACK_ACTIONS.BROADCAST_SUB_DONE)
```

## Completion Criteria

- [x] `BROADCAST_SUB_TOGGLE_PREFIX: 'broadcast_sub_toggle_'` constant added
- [x] `BROADCAST_SUB_SELECT_ALL: 'broadcast_sub_select_all'` constant added
- [x] `BROADCAST_SUB_DONE: 'broadcast_sub_done'` constant added
- [x] Constants follow existing naming convention
- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run check`)

## Quality Check Commands

```bash
npm run check
npm run build
```

## Notes

- **Impact scope**: BroadcastUpdate handlers will use these constants for action registration
- **Constraints**: Do not modify existing constants
- **Pattern Reference**: Follow existing `BROADCAST_` prefix pattern from broadcast-filter-extension
