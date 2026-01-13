# Task: Add BROADCAST Command Constant

Metadata:
- Phase: 1 (Foundation)
- Dependencies: None
- Provides: BROADCAST constant for handler decorator
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content

Add the `BROADCAST: '/broadcast'` constant to `MASTERBOT_CONSTANTS.COMMANDS` to enable the new `/broadcast` command handler registration.

## Target Files

- [x] `libs/masterbot/src/constants.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] No test needed for constant definition (L3 verification)
- [x] Verify constant does not exist yet

### 2. Green Phase
- [x] Open `libs/masterbot/src/constants.ts`
- [x] Add `BROADCAST: '/broadcast'` to `MASTERBOT_CONSTANTS.COMMANDS` object
- [x] Ensure alphabetical ordering if applicable

### 3. Refactor Phase
- [x] Verify consistent formatting with existing constants
- [x] No refactoring expected for single constant addition

## Code Example

```typescript
// libs/masterbot/src/constants.ts
export const MASTERBOT_CONSTANTS = {
  COMMANDS: {
    START: '/start',
    STATS: '/stats',
    CODE: '/code',
    HELP: '/help',
    SUBSCRIPTION: '/subscription',
    BROADCAST: '/broadcast',  // NEW
  },
  // ... rest unchanged
} as const;
```

## Completion Criteria

- [x] BROADCAST constant defined in constants.ts
- [x] Build succeeds: `npm run build`
- [x] Type check passes: `npm run check` (N/A - script does not exist, build verification used instead)

## Quality Check Commands

```bash
npm run check
npm run build
```

## Notes

- Impact scope: Constants file only, no runtime impact until handler uses it
- Constraints: Do not modify existing constants
- Estimated time: 5 minutes
