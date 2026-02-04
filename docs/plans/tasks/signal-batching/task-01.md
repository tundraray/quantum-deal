# Task 1: Interface Definitions

**Phase**: 1 - Foundation
**Verification Level**: L3 (Build success)
**Estimated Effort**: Small (2 files)
**Dependencies**: None

## Task Overview

Create TypeScript interface definitions and type contracts for the signal batching module. This establishes the type system foundation that all subsequent tasks will use.

## Target Files

### Files to Create (2)
1. `libs/framework/src/webhook/batching/signal-batching.interface.ts` - Core interfaces
2. `libs/framework/src/webhook/batching/index.ts` - Module exports

## Implementation Steps

### Step 1: Create signal-batching.interface.ts

Create the file with the following interfaces per Design Doc:

```typescript
/**
 * Configuration for signal batching behavior.
 * Per ADR-011: In-memory buffer with per-bot independent timers.
 */
export interface BatchingConfig {
  enabled: boolean;
  windowMs: number;           // Default: 5000 (5 seconds), Range: 1000-60000
  maxBatchSize?: number;      // Default: 10, Safety valve per FR-008
}

/**
 * Default batching configuration per Design Doc.
 */
export const DEFAULT_BATCHING_CONFIG: BatchingConfig = {
  enabled: true,
  windowMs: 5000,
  maxBatchSize: 10,
};

/**
 * Represents a buffered signal waiting in batch.
 * Stores original order data + eventType + user language.
 */
export interface BufferedSignal {
  order: any;                  // Original MT5 order data
  eventType: string;           // 'open', 'close_plus', 'close_minus', 'close_zero', 'tp', 'sl'
  timestamp: Date;             // When signal was buffered (for chronological ordering)
  symbol: string;              // Extracted for filtering
}

/**
 * User information for batch delivery.
 */
export interface BatchUser {
  botUserId: number;
  telegramUserId: number;
  lang: string;                // User's language preference
  hasCustomFiltering: boolean;
  filterSettings: { symbols?: string[] } | null;  // From extended repository
}

/**
 * A pending batch for one user from one bot.
 * Key: ${botId}:${userId}
 */
export interface PendingBatch {
  botId: number;
  userId: number;
  signals: BufferedSignal[];   // Chronologically ordered
  user: BatchUser;             // User info for delivery
}

/**
 * Result of flushing batches for a bot.
 */
export interface BatchFlushResult {
  botId: number;
  flushedBatches: number;      // Number of user batches flushed
  totalSignals: number;        // Total signals across all batches
  errors: Array<{ userId: number; error: string }>;
}

/**
 * Statistics for monitoring batching behavior.
 */
export interface BatchingStats {
  activeBots: number;          // Bots with pending batches
  pendingBatches: number;      // Total user batches waiting
  totalBufferedSignals: number;
  activeTimers: number;        // Running bot timers
}
```

**Important Contract Points**:
- `BufferedSignal.timestamp`: For chronological ordering (FR-004-b)
- `PendingBatch.signals[]`: Ordered array, preserves arrival order
- `BatchingConfig.windowMs`: Range 1000-60000ms per FR-002-c
- `BatchUser.filterSettings`: From extended repository (zero additional queries)

### Step 2: Create index.ts

Create the module exports file:

```typescript
/**
 * Signal Batching Module
 * Per ADR-011: In-memory buffer with per-bot independent timers
 */

export * from './signal-batching.interface';
```

### Step 3: Verify TypeScript Build

Run build to verify interfaces compile correctly:

```bash
npm run build
```

Expected: No TypeScript errors, clean build.

### Step 4: Verify Import Path

Test that imports work from the module path:

```typescript
// This should work:
import { BatchingConfig, DEFAULT_BATCHING_CONFIG } from '@quantumdeal/framework/webhook/batching';
```

## Completion Criteria

- [x] All interfaces defined per Design Doc contract specifications
- [x] DEFAULT_BATCHING_CONFIG constant exported with correct values
- [x] Module exports configured in index.ts
- [x] TypeScript build succeeds: `npm run build` - 0 errors
- [x] Interfaces importable from `@quantumdeal/framework/webhook/batching`

## Verification Procedures

### Build Verification
```bash
npm run build
```
**Expected**: Build completes without TypeScript errors.

### Import Test (Manual)
Create a temporary test file to verify imports work:
```typescript
import { BatchingConfig, BufferedSignal, PendingBatch } from './libs/framework/src/webhook/batching';
// If this compiles, imports work correctly
```

## Test Information

**Test Category**: N/A (interface definitions only)
**Test Complexity**: N/A
**Test Dependencies**: None

This task establishes type contracts only. Testing begins in Task 2 (Template Engine).

## Dependencies

**Depends on**: None (foundational task)
**Required by**:
- Task 2 (Template Engine) - uses interfaces
- Task 4 (Core Batching Service) - implements using interfaces
- Task 5 (Batch Message Formatter) - uses BufferedSignal interface

## Notes

- Interface definitions must exactly match Design Doc specifications
- This task has no tests - verification is through TypeScript compilation
- Changes to these interfaces after Task 2+ will cause breaking changes
- Review interface contracts carefully before proceeding

## Related Documents

- [Design Doc](../../design/signal-batching-design.md) - Section "Interface and Contract Definitions"
- [ADR-011](../../adr/ADR-011-signal-batching.md) - Architecture decisions
- [Overall Design](./_overview.md) - Task relationships
