# Phase 3 Completion: Handler Layer

## Phase Overview

**Phase**: 3 - Handler Layer
**Verification Level**: L1 (Functional Operation)
**Tasks Included**: Task 5, Task 6, Task 7, Task 8, Task 9

## Tasks Checklist

- [ ] Task 5: Modify /broadcast to show bot selection first
- [ ] Task 6: Implement subscription toggle keyboard
- [ ] Task 7: Implement toggle/select-all/done handlers
- [ ] Task 8: Update preview with breakdown
- [ ] Task 9: Update confirmation to use sendBroadcastMulti

## Deliverables

### Task 5 Deliverables
- [ ] `/broadcast` shows bot selection immediately
- [ ] Session state cleared at start
- [ ] `flowState = 'selecting_bot_filter'` set

### Task 6 Deliverables
- [ ] Subscription toggle keyboard implemented
- [ ] Counts filtered by selected bot
- [ ] Zero-count subscriptions hidden (with fallback)
- [ ] Toggle checkmarks displayed

### Task 7 Deliverables
- [ ] Toggle handler adds/removes subscription
- [ ] Select all handler works
- [ ] Done handler validates selection
- [ ] Warning shown for empty selection

### Task 8 Deliverables
- [ ] Preview shows unique user count
- [ ] Per-subscription breakdown displayed
- [ ] Overlap information shown

### Task 9 Deliverables
- [ ] `sendBroadcastMulti` called on confirm
- [ ] Delivery report shows deduplicated count
- [ ] Session cleared after completion

## Integration Test Resolution

- [ ] AC2: `Subscription filtering shows only subscriptions with subscribers for selected bot`

## Quality Check Commands

```bash
# Type checking
npm run check

# Build verification
npm run build

# Run handler tests
npm test -- libs/masterbot/src/__tests__/broadcast.update.spec.ts

# Run integration tests
npm test -- libs/masterbot/src/__tests__/broadcast-flow-redesign.int.test.ts
```

## Completion Criteria

- [ ] Bot selection shown first on /broadcast
- [ ] Subscription toggle keyboard displays correctly
- [ ] All toggle handlers work correctly
- [ ] Preview shows breakdown with deduplication info
- [ ] Confirmation uses sendBroadcastMulti
- [ ] Integration test AC2 resolved
- [ ] All handler tests pass
- [ ] Type checking passes
- [ ] Build succeeds

## Flow Verification

```
/broadcast
    |
    v
Bot Selection Keyboard  <-- Task 5
    |
    v
Subscription Toggle Keyboard  <-- Task 6
    |
    v
Toggle/Select All/Done  <-- Task 7
    |
    v
Status Filter (existing)
    |
    v
Message Input (existing)
    |
    v
Preview with Breakdown  <-- Task 8
    |
    v
Confirmation  <-- Task 9
    |
    v
Delivery Report
```

## AC Verification Checklist

- [ ] AC1: Bot selection shown first after /broadcast
- [ ] AC2: Subscription filtering by bot with fallback
- [ ] AC3: Multiple subscription toggle selection
- [ ] AC4: Status filter works after subscription selection
- [ ] AC5: Preview shows unique count with breakdown
- [ ] AC6: Broadcast execution deduplicates users

## Phase 3 -> Phase 4 Transition

**Prerequisites for Phase 4**:
- Complete flow implemented and manually tested
- All handler logic working correctly

**Next Steps**:
- Begin Task 10: Execute E2E Tests
- Begin Task 11: Final Quality Checks

## Notes

Phase 3 is the largest phase with 5 tasks. It implements the complete user interface flow for multiple subscription selection. Manual testing is recommended between tasks to verify flow continuity.
