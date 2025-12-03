# Task: Create bot-registry.interface.ts

Metadata:
- Phase: 1 (Interface Definitions)
- Dependencies: None
- Provides: `libs/bot/src/interfaces/bot-registry.interface.ts`
- Size: Small (1 file)
- Verification Level: L3 (Build success)

## Implementation Content

Create the `SignalCapableBot` and `BotRegistry` interfaces that define the contract for unified bot access. These interfaces enable the BotRegistryService to provide a consistent API for accessing both static and dynamic bots.

**AC Support**:
- AC-008 (static bot inclusion via `botId: null`)
- AC-001 (signal-capable bot access via `getSignalCapableBots()`)

## Target Files

- [x] `libs/bot/src/interfaces/bot-registry.interface.ts` (new file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Create the interface file with type definitions
- [x] Run `npm run build` - should pass (L3 verification)

### 2. Green Phase
- [x] Verify all type imports resolve correctly:
  - `Bottleneck` from 'bottleneck'
  - `Telegraf`, `Context` from 'telegraf'
  - `BotSettings` from '@quantumdeal/telegraf'
- [x] Ensure interface compiles without errors

### 3. Refactor Phase
- [x] Add comprehensive JSDoc documentation
- [x] Verify type exports are consistent

## Implementation Code

```typescript
// libs/bot/src/interfaces/bot-registry.interface.ts

import type Bottleneck from 'bottleneck';
import type { Telegraf, Context } from 'telegraf';
import type { BotSettings } from '@quantumdeal/telegraf';

/**
 * Represents a bot capable of sending signals.
 * Unified interface for both static and dynamic bots.
 *
 * @remarks
 * - Static bot (QuantumDealBot): botId = null
 * - Dynamic bots: botId = database ID
 */
export interface SignalCapableBot {
  /** Database bot ID (null for static QuantumDealBot) */
  botId: number | null;
  /** Bot display name */
  name: string;
  /** Telegraf bot instance */
  instance: Telegraf<Context>;
  /** Per-bot rate limiter (28 msg/sec) */
  limiter: Bottleneck;
  /** Bot type identifier */
  type: 'static' | 'dynamic';
  /** Bot settings (only for dynamic bots) */
  settings?: BotSettings;
}

/**
 * Interface for the bot registry service.
 * Provides unified access to all signal-capable bots.
 *
 * @remarks
 * Per ADR-007 Decision 4: BotRegistryService Facade Pattern
 */
export interface BotRegistry {
  /**
   * Get all bots capable of sending signals.
   * Only includes bots with signalsEnabled=true.
   *
   * @returns Array of signal-capable bots (static + dynamic)
   */
  getSignalCapableBots(): Promise<SignalCapableBot[]>;

  /**
   * Get a specific bot by ID.
   *
   * @param botId - Database ID (null for static bot)
   * @returns SignalCapableBot if found, undefined otherwise
   */
  getBot(botId: number | null): SignalCapableBot | undefined;

  /**
   * Check if a bot exists and is running.
   *
   * @param botId - Database ID (null for static bot)
   * @returns true if bot is available
   */
  hasBot(botId: number | null): boolean;
}
```

## Completion Criteria

- [x] File created at correct path
- [x] Build succeeds (`npm run build`)
- [x] Types are importable (verified in Task 1-3)
- [x] JSDoc documentation complete for all exports

## Notes

- Impact scope: New file, no existing code affected
- Constraints: Must match Design Doc type definitions exactly
- The `instance` field uses `Telegraf<Context>` to support both static (UserContext extends Context) and dynamic bots
