# Task: Create multi-bot-signal.interface.ts

Metadata:
- Phase: 1 (Interface Definitions)
- Dependencies: None
- Provides: `libs/bot/src/interfaces/multi-bot-signal.interface.ts`
- Size: Small (1 file)
- Verification Level: L3 (Build success)

## Implementation Content

Create the `BotDeliveryResult`, `BroadcastResult`, and `MultiBotSignal` interfaces that define the contract for multi-bot signal broadcasting. These interfaces document the async failure tracking semantics important for understanding the fire-and-forget delivery model.

**AC Support**:
- AC-007 (per-bot success/failure counts via `BotDeliveryResult`)

## Target Files

- [x] `libs/bot/src/interfaces/multi-bot-signal.interface.ts` (new file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Create the interface file with type definitions
- [x] Run `npm run build` - should pass (L3 verification)

### 2. Green Phase
- [x] Verify all type imports resolve correctly:
  - `MergedOrder`, `MessageType` from '@quantumdeal/db/schema'
- [x] Ensure interface compiles without errors

### 3. Refactor Phase
- [x] Add comprehensive JSDoc documentation
- [x] Document async failure semantics clearly in comments

## Implementation Code

```typescript
// libs/bot/src/interfaces/multi-bot-signal.interface.ts

import type { MergedOrder, MessageType } from '@quantumdeal/db/schema';

/**
 * Result of a single bot's signal delivery.
 *
 * IMPORTANT: Async Failure Tracking Semantics
 * -------------------------------------------
 * - `sentCount` represents successfully SCHEDULED messages, not delivered ones
 * - Actual delivery failures are handled by Bottleneck's built-in retry mechanism
 * - Telegram API does not provide delivery confirmation (fire-and-forget model)
 * - Per-bot results show "scheduled" count, NOT "delivered" count
 * - Delivery errors are tracked via:
 *   1. Sentry (error monitoring)
 *   2. NotificationService.messageStats (internal counters)
 *   3. Bottleneck 'failed' event handlers
 */
export interface BotDeliveryResult {
  /** Database bot ID (null for static bot) */
  botId: number | null;
  /** Bot name for logging */
  botName: string;
  /** Whether scheduling was successful (true if messages were queued) */
  success: boolean;
  /** Number of messages successfully SCHEDULED with Bottleneck (not delivered) */
  sentCount: number;
  /** Number of messages that failed to schedule (immediate errors only) */
  failedCount: number;
  /** Error message if bot-level failure occurred */
  error?: string;
  /** Processing duration in milliseconds */
  durationMs: number;
}

/**
 * Aggregated result of multi-bot signal broadcast.
 *
 * NOTE: All counts represent SCHEDULED messages, not confirmed deliveries.
 * Telegram does not provide delivery receipts for regular messages.
 */
export interface BroadcastResult {
  /** Overall success (true if at least one bot scheduled messages) */
  success: boolean;
  /** Total messages SCHEDULED across all bots (not confirmed delivered) */
  totalSent: number;
  /** Total scheduling failures across all bots */
  totalFailed: number;
  /** Number of bots that processed signals */
  botsProcessed: number;
  /** Number of bots that failed entirely */
  botsFailed: number;
  /** Per-bot delivery results */
  perBotResults: BotDeliveryResult[];
  /** Total processing duration in milliseconds */
  totalDurationMs: number;
}

/**
 * Interface for the multi-bot signal service.
 *
 * @remarks
 * Per ADR-007 Decision 2: MultiBotSignalService Orchestrator Pattern
 */
export interface MultiBotSignal {
  /**
   * Broadcast a signal to all active bots.
   *
   * @param order - The order data with placeholders
   * @param eventType - The signal event type (open, close_plus, etc.)
   * @returns Aggregated results from all bots
   */
  broadcastSignal(
    order: MergedOrder,
    eventType: MessageType,
  ): Promise<BroadcastResult>;

  /**
   * Get count of bots currently capable of sending signals.
   *
   * @returns Number of signal-capable bots
   */
  getEligibleBotCount(): Promise<number>;
}
```

## Completion Criteria

- [x] File created at correct path
- [x] Build succeeds (`npm run build`)
- [x] Types are importable (verified in Task 1-3)
- [x] JSDoc documentation complete for all exports
- [x] Async failure semantics documented in comments

## Notes

- Impact scope: New file, no existing code affected
- Constraints: Must match Design Doc type definitions exactly
- Important: Document that counts are SCHEDULED, not DELIVERED
- The `MergedOrder` type already exists in the codebase
