# Task: Add limiter to DynamicBotInstance interface

Metadata:
- Phase: 2 (DynamicBotInstance Extension)
- Dependencies: Phase 1 completed
- Provides: Extended `DynamicBotInstance` interface with `limiter` field
- Size: Small (1 file)
- Verification Level: L3 (Build success)

## Implementation Content

Extend the `DynamicBotInstance` interface to include a `limiter` field of type `Bottleneck`. This enables per-bot rate limiting as specified in ADR-007 Decision 1.

**AC Support**:
- AC-005 (per-bot Bottleneck limiter)

## Target Files

- [x] `libs/telegraf/src/interfaces/dynamic-telegraf-options.interface.ts` (modify)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Read the current contents of `dynamic-telegraf-options.interface.ts`
- [x] Identify the `DynamicBotInstance` interface location
- [x] Build will fail after adding limiter until Task 2-2 initializes it

### 2. Green Phase
- [x] Add import for `Bottleneck` type
- [x] Add `limiter: Bottleneck` field to `DynamicBotInstance`
- [x] Add JSDoc documentation for the field

### 3. Refactor Phase
- [x] Ensure consistent formatting with existing fields
- [x] Verify documentation is clear

## Implementation Changes

```typescript
// At the top of the file, add import:
import type Bottleneck from 'bottleneck';

// In the DynamicBotInstance interface, add field:
export interface DynamicBotInstance {
  /** Database record ID */
  botId: number;
  /** Bot name for logging */
  name: string;
  /** Telegraf bot instance */
  bot: Telegraf<Context>;
  /** Per-bot Stage instance for scene management */
  stage: Scenes.Stage<Scenes.SceneContext>;
  /** Configured webhook path */
  webhookPath: string;
  /** Bot settings from database */
  settings: BotSettings | null;
  /** Telegram bot username (populated after getMe()) */
  username: string;
  /** Per-bot rate limiter for signal delivery (ADR-007) */
  limiter: Bottleneck;
}
```

## Completion Criteria

- [x] Import added for Bottleneck type
- [x] `limiter` field added to `DynamicBotInstance`
- [x] JSDoc documentation added
- [x] Build passes (after Task 2-2 completes)

## Notes

- Impact scope: Interface extension, requires Task 2-2 for implementation
- Constraints: Build will have errors until Task 2-2 initializes the limiter
- The limiter will be created in DynamicTelegrafService.initializeBot()
- Execute Task 2-1 and Task 2-2 together to maintain buildable state
