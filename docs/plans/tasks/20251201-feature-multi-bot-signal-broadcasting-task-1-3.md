# Task: Update interfaces/index.ts exports

Metadata:
- Phase: 1 (Interface Definitions)
- Dependencies: Task 1-1, Task 1-2
- Provides: Updated `libs/bot/src/interfaces/index.ts`
- Size: Small (1 file)
- Verification Level: L3 (Build success)

## Implementation Content

Update the interfaces barrel file to export the new bot-registry and multi-bot-signal interfaces. This enables consumers to import types from `@quantumdeal/bot/interfaces`.

**IMPORTANT**: Preserve all existing exports. Only ADD new exports.

## Target Files

- [x] `libs/bot/src/interfaces/index.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Read the current contents of `libs/bot/src/interfaces/index.ts`
- [x] Identify existing exports (must not be removed)

### 2. Green Phase
- [x] Add exports for new interface files:
  - `export * from './bot-registry.interface';`
  - `export * from './multi-bot-signal.interface';`
- [x] Run `npm run build` to verify

### 3. Refactor Phase
- [x] Organize exports (existing first, then new with comment)
- [x] Verify imports work from consumer perspective

## Implementation Code

```typescript
// libs/bot/src/interfaces/index.ts

// ============================================================
// EXISTING EXPORTS (DO NOT REMOVE)
// ============================================================
export * from './user-context.interface';
export * from './user.dto';
export * from './notification.interface';

// ============================================================
// NEW EXPORTS (ADR-007: Multi-bot signal broadcasting)
// ============================================================
export * from './bot-registry.interface';
export * from './multi-bot-signal.interface';
```

## Completion Criteria

- [x] Existing exports preserved
- [x] New exports added
- [x] Build succeeds (`npm run build`)
- [x] Types importable from `@quantumdeal/bot/interfaces`

## Verification Commands

```bash
# Verify build
npm run build

# Verify types are accessible (manual check in IDE)
# import { SignalCapableBot, BroadcastResult } from '@quantumdeal/bot/interfaces'
```

## Notes

- Impact scope: Export aggregation only
- Constraints: Must not break existing imports
- This task depends on Task 1-1 and Task 1-2 being complete
