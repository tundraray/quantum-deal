# Task: Register BroadcastUpdate in Module

Metadata:
- Phase: 2 (Core Implementation)
- Dependencies: Task 03 (BroadcastUpdate handlers implemented)
- Provides: BroadcastUpdate registered as NestJS provider
- Size: Small (1 file)
- Verification Level: L1 (Functional Operation)

## Implementation Content

Register the `BroadcastUpdate` class as a provider in `MasterbotModule` to enable the `/broadcast` command to respond to Telegram requests.

## Target Files

- [x] `libs/masterbot/src/masterbot.module.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [x] Verify BroadcastUpdate is not yet registered in module
- [x] Integration test placeholder exists: `it.todo('AC1: /broadcast command shows ALL subscription types')`

### 2. Green Phase

- [x] Open `libs/masterbot/src/masterbot.module.ts`
- [x] Add import: `import { BroadcastUpdate } from './broadcast.update';`
- [x] Add `BroadcastUpdate` to `providers` array

### 3. Refactor Phase

- [x] Ensure import is alphabetically ordered with other imports
- [x] Ensure provider is properly positioned in array

## Code Example

```typescript
// libs/masterbot/src/masterbot.module.ts

import { BroadcastUpdate } from './broadcast.update';
// ... other imports

@Module({
  imports: [
    // ... existing imports
  ],
  providers: [
    BroadcastUpdate,  // NEW
    MasterbotUpdate,
    MasterbotService,
    // ... other providers
  ],
})
export class MasterbotModule {}
```

## Integration Test (Phase 2 Completion)

After this task, run integration test to verify AC1:

```bash
npm test -- libs/masterbot/src/__tests__/broadcast.integration.spec.ts --testNamePattern="AC1"
```

Expected: Resolve `it.todo('AC1: /broadcast command shows ALL subscription types (signals and broadcast) with subscriber counts')`

## Phase 2 Operational Verification

1. Start bot in development mode
2. Send `/broadcast` command
3. Verify list shows ALL subscription types including signals
4. Verify each subscription shows subscriber count
5. Select a subscription, verify status filter keyboard appears

## Completion Criteria

- [x] `BroadcastUpdate` imported in masterbot.module.ts
- [x] `BroadcastUpdate` added to providers array
- [x] Build succeeds: `npm run build`
- [x] Type check passes: `npm run check`
- [x] Module compiles without errors
- [ ] `/broadcast` command responds (manual verification)
- [ ] No duplicate handler errors in logs

## Quality Check Commands

```bash
npm run check
npm run build
npm test -- libs/masterbot/src/__tests__/masterbot.module.spec.ts
npm test -- libs/masterbot/src/__tests__/broadcast.integration.spec.ts --testNamePattern="AC1"
```

## Notes

- Impact scope: Module file only
- Constraints: Do not modify MasterbotUpdate yet (Task 5)
- After this task: Both BroadcastUpdate and MasterbotUpdate will have broadcast handlers (temporary duplication)
- Estimated time: 5 minutes
