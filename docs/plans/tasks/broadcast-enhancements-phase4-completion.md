# Phase 4 Completion: Handler Layer

## Phase Overview

Phase 4 updates the UI layer to display counts in keyboards and adds the "Without subscription" targeting capability. This phase connects service layer methods to user-facing interfaces.

## Included Tasks

- [x] Task 0004: Update subscription toggle keyboard with total counts and "Without subscription" button
- [x] Task 0005: Update status filter keyboard with counts
- [x] Task 0006: Add "Without subscription" handler and callback constant

## Acceptance Criteria Verification

### AC3: "Without subscription" status filter option is available
- [ ] "Without subscription" button appears in subscription selection keyboard
- [ ] Button shows count: "Without subscription (N users)"
- [ ] Button triggers `BROADCAST_FILTER_NO_SUBSCRIPTION` callback

### AC4: Status filter buttons display subscriber counts
- [ ] "Active (N)" button shows active subscriber count
- [ ] "Expired (M)" button shows expired subscriber count
- [ ] Counts match actual database query results

### AC5: Subscription toggle keyboard shows total user counts
- [ ] Subscription buttons show total counts (active + expired)
- [ ] Example: "Premium (150 users)" instead of "Premium (45 users)"
- [ ] Count includes all users with subscription record for that subscription

### AC6: "Without subscription" broadcast executes correctly
- [ ] Flow skips status filter when "Without subscription" selected
- [ ] Messages sent only to bot users with NO subscription records
- [ ] Users with any subscription (active or expired) are excluded

## Quality Checks

- [ ] `pnpm typecheck` - zero errors
- [ ] `pnpm lint` - zero errors
- [ ] `pnpm build` - success

## Operational Verification Procedures (from Design Doc)

1. **Subscription Selection Verification**:
   - Select a bot
   - Verify subscription buttons show total user counts (e.g., "Premium (120 users)")
   - Verify "Without subscription" button shows count

2. **Status Filter Verification**:
   - Select subscriptions and click "Done"
   - Verify status filter buttons show counts: "Active (45)" / "Expired (12)"

3. **Without Subscription Flow**:
   - Start new `/broadcast` flow
   - Select a bot
   - Click "Without subscription" button
   - Verify flow skips status filter and goes to message input
   - Enter message, confirm
   - Verify broadcast sent only to users without any subscription

## Phase Completion Criteria

- [ ] All tasks in phase completed
- [ ] AC3-AC6 verified (manual tests)
- [ ] Quality checks pass
- [ ] Ready to proceed to Phase 5

## Phase Dependencies

- **Depends on**: Phase 3 (Service Layer methods)
- **Required for**: Phase 5 (Quality Assurance)

## Notes

- Session type extension for 'no_subscription' status is required
- "Without subscription" flow skips status filter step entirely
- All count queries should use parallel execution for performance
