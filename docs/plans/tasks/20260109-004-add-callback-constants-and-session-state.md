# Task: Add Callback Constants and Session State Fields

Metadata:
- Dependencies: None (can run in parallel with Phase 2)
- Provides:
  - `libs/masterbot/src/constants.ts` - Filter callback constants
  - `libs/masterbot/src/interfaces/user-context.interface.ts` - Session state extensions
- Size: Small (2 files)
- Phase: 3 - Handler Layer
- Verification Level: L3 (Build Success)
- Acceptance Criteria: AC1, AC2, AC4

## Implementation Content

Add new callback action constants for filter selection and extend the session state interface to track selected filters during the broadcast flow. This task prepares the foundation for the filter selection handlers.

## Target Files

- [x] `libs/masterbot/src/constants.ts` (add constants)
- [x] `libs/masterbot/src/interfaces/user-context.interface.ts` (extend session state)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] No unit tests needed (L3 verification - type definitions only)
- [x] Verify current build passes before changes
- [x] Plan additions based on Design Doc session state machine

### 2. Green Phase

**Constants (`constants.ts`):**
- [x] Add filter callback constants to `CALLBACK_ACTIONS` or equivalent:
  ```typescript
  BROADCAST_FILTER_ACTIVE: 'broadcast_filter_active',
  BROADCAST_FILTER_EXPIRED: 'broadcast_filter_expired',
  BROADCAST_BOT_ALL: 'broadcast_bot_all',
  BROADCAST_BOT_PREFIX: 'broadcast_bot_',  // broadcast_bot_{id}
  ```

**Session State (`user-context.interface.ts`):**
- [x] Add new flow states to `flowState` type union:
  ```typescript
  | 'selecting_status_filter'
  | 'selecting_bot_filter'
  ```
- [x] Add filter fields to session state interface:
  ```typescript
  broadcastFilterStatus?: 'active' | 'expired' | null;
  broadcastFilterBotId?: number | null;
  ```
- [x] Verify build succeeds with new types

### 3. Refactor Phase

- [x] Ensure naming consistency with existing constants
- [x] Verify JSDoc comments match existing style
- [x] Confirm build still succeeds

## Type Definitions

```typescript
// Filter status type (can be exported for reuse)
type BroadcastFilterStatus = 'active' | 'expired';

// Extended flow state
type FlowState =
  | 'awaiting_subscription_name'
  | 'awaiting_broadcast_message'
  | 'confirming_broadcast'
  | 'selecting_status_filter'    // NEW
  | 'selecting_bot_filter'       // NEW
  | null;

// Extended session fields
interface SessionState {
  // ... existing fields ...

  // NEW: Broadcast filter fields
  broadcastFilterStatus?: 'active' | 'expired' | null;
  broadcastFilterBotId?: number | null;  // null = all bots
}
```

## Completion Criteria

- [x] Build succeeds without errors (`npm run build`)
- [x] Type check passes (`npm run lint`)
- [x] Constants defined and exported correctly
- [x] Flow states added to type union
- [x] Session fields added to interface
- [x] No existing functionality broken

## Quality Check Commands

```bash
npm run check
npm run build
```

## Notes

- **Impact scope**: Handler implementation (Task 005, 006) will use these constants and types
- **Constraints**: Do not modify existing constants or flow states
- **Type Safety**: All new types must be properly defined (no `any`)

## Callback Action Reference

| Constant | Value | Purpose |
|----------|-------|---------|
| `BROADCAST_FILTER_ACTIVE` | `'broadcast_filter_active'` | Select active subscribers |
| `BROADCAST_FILTER_EXPIRED` | `'broadcast_filter_expired'` | Select expired subscribers |
| `BROADCAST_BOT_ALL` | `'broadcast_bot_all'` | Target all bots |
| `BROADCAST_BOT_PREFIX` | `'broadcast_bot_'` | Prefix for specific bot (append ID) |

## Session State Flow

```
Initial: broadcastFilterStatus = null, broadcastFilterBotId = null

After selecting subscription:
  flowState = 'selecting_status_filter'

After selecting status filter:
  broadcastFilterStatus = 'active' | 'expired'
  flowState = 'selecting_bot_filter'

After selecting bot filter:
  broadcastFilterBotId = number | null
  flowState = 'awaiting_broadcast_message'

On cancel or completion:
  Reset: broadcastFilterStatus = null, broadcastFilterBotId = null
```
