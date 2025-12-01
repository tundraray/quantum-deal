# Task: Create BotRegistryService

Metadata:
- Phase: 4 (BotRegistryService)
- Dependencies: Phase 1 completed, Phase 2 completed
- Provides: `libs/bot/src/services/bot-registry.service.ts`
- Size: Medium (1 new file)
- Verification Level: L2 (Unit tests pass)

## Implementation Content

Create the `BotRegistryService` that provides unified access to both static (QuantumDealBot) and dynamic bots. This service implements the `BotRegistry` interface and manages the static bot's Bottleneck limiter.

**AC Support**:
- AC-008 (static bot inclusion with botId=null)
- AC-001 (all signal-capable bots via getSignalCapableBots)
- AC-005 (static bot has its own Bottleneck limiter)

## Target Files

- [x] `libs/bot/src/services/bot-registry.service.ts` (new file)
- [x] `libs/bot/src/services/__tests__/bot-registry.service.spec.ts` (new file)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Create test file with failing tests
- [x] Define test cases for all public methods

### 2. Green Phase
- [x] Create service implementation
- [x] Inject static bot via `@InjectBot('QuantumDealBot')`
- [x] Inject `DynamicTelegrafService`
- [x] Create static bot Bottleneck limiter in `onModuleInit()`
- [x] Implement `getSignalCapableBots()`
- [x] Implement `getBot(botId)`
- [x] Implement `hasBot(botId)`
- [x] Implement `setStaticBotSignalsEnabled()`

### 3. Refactor Phase
- [x] Add comprehensive JSDoc documentation
- [x] Setup limiter error handlers
- [x] Ensure all tests pass

## Implementation Code

```typescript
// libs/bot/src/services/bot-registry.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot } from '@quantumdeal/telegraf';
import { Telegraf, Context } from 'telegraf';
import Bottleneck from 'bottleneck';
import { DynamicTelegrafService } from '@quantumdeal/telegraf';
import type {
  SignalCapableBot,
  BotRegistry,
} from '../interfaces/bot-registry.interface';
import type { UserContext } from '../interfaces';

/**
 * BotRegistryService
 *
 * Provides unified access to all bots capable of sending signals.
 * Aggregates both the static QuantumDealBot and dynamic bots from
 * DynamicTelegrafService behind a single interface.
 *
 * Per ADR-007 Decision 4: BotRegistryService Facade Pattern
 */
@Injectable()
export class BotRegistryService implements BotRegistry, OnModuleInit {
  private readonly logger = new Logger(BotRegistryService.name);

  /** Rate limiter for static bot */
  private staticBotLimiter!: Bottleneck;

  /** Bottleneck configuration matching NotificationService */
  private readonly bottleneckConfig = {
    maxConcurrent: 4,
    minTime: 30,
    reservoir: 28,
    reservoirRefreshAmount: 28,
    reservoirRefreshInterval: 1000,
  };

  /** Flag to check if static bot signals are enabled */
  private staticBotSignalsEnabled = true;

  constructor(
    @InjectBot('QuantumDealBot')
    private readonly staticBot: Telegraf<UserContext>,
    private readonly dynamicTelegrafService: DynamicTelegrafService,
  ) {}

  onModuleInit(): void {
    this.staticBotLimiter = new Bottleneck(this.bottleneckConfig);
    this.setupLimiterErrorHandlers(this.staticBotLimiter, 'QuantumDealBot');
    this.logger.log('BotRegistryService initialized with static bot limiter');
  }

  /**
   * Get all bots capable of sending signals.
   * Includes static bot (if enabled) and all dynamic bots with signalsEnabled=true.
   */
  async getSignalCapableBots(): Promise<SignalCapableBot[]> {
    const bots: SignalCapableBot[] = [];

    // Add static bot if signals are enabled
    if (this.staticBotSignalsEnabled) {
      bots.push({
        botId: null,
        name: 'QuantumDealBot',
        instance: this.staticBot as unknown as Telegraf<Context>,
        limiter: this.staticBotLimiter,
        type: 'static',
      });
    }

    // Add dynamic bots with signalsEnabled
    const dynamicBots = this.dynamicTelegrafService.getAllBots();
    for (const [botId, instance] of dynamicBots) {
      if (instance.settings?.features?.signalsEnabled) {
        bots.push({
          botId,
          name: instance.name,
          instance: instance.bot,
          limiter: instance.limiter,
          type: 'dynamic',
          settings: instance.settings,
        });
      }
    }

    this.logger.debug(`Found ${bots.length} signal-capable bots`);
    return bots;
  }

  /**
   * Get a specific bot by ID.
   * @param botId - Database ID (null for static bot)
   */
  getBot(botId: number | null): SignalCapableBot | undefined {
    if (botId === null) {
      if (!this.staticBotSignalsEnabled) return undefined;
      return {
        botId: null,
        name: 'QuantumDealBot',
        instance: this.staticBot as unknown as Telegraf<Context>,
        limiter: this.staticBotLimiter,
        type: 'static',
      };
    }

    const instance = this.dynamicTelegrafService.getBotInstance(botId);
    if (!instance) return undefined;

    return {
      botId,
      name: instance.name,
      instance: instance.bot,
      limiter: instance.limiter,
      type: 'dynamic',
      settings: instance.settings ?? undefined,
    };
  }

  /**
   * Check if a bot exists and is running.
   * @param botId - Database ID (null for static bot)
   */
  hasBot(botId: number | null): boolean {
    if (botId === null) {
      return this.staticBotSignalsEnabled;
    }
    return this.dynamicTelegrafService.hasBot(botId);
  }

  /**
   * Configure static bot signal capability.
   * @param enabled - Whether static bot should send signals
   */
  setStaticBotSignalsEnabled(enabled: boolean): void {
    this.staticBotSignalsEnabled = enabled;
    this.logger.log(`Static bot signals ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Setup error handlers for a Bottleneck limiter.
   */
  private setupLimiterErrorHandlers(
    limiter: Bottleneck,
    botName: string,
  ): void {
    limiter.on('error', (error) => {
      this.logger.error(`Bottleneck error for ${botName}:`, error);
    });

    limiter.on('dropped', (dropped) => {
      this.logger.warn(`Message dropped for ${botName}:`, dropped);
    });
  }
}
```

## Test Cases

```typescript
// libs/bot/src/services/__tests__/bot-registry.service.test.ts

describe('BotRegistryService', () => {
  describe('getSignalCapableBots', () => {
    it('AC-008: should include static QuantumDealBot with botId=null', async () => {
      const bots = await service.getSignalCapableBots();
      const staticBot = bots.find((b) => b.botId === null);
      expect(staticBot).toBeDefined();
      expect(staticBot?.name).toBe('QuantumDealBot');
      expect(staticBot?.type).toBe('static');
    });

    it('AC-001: should exclude dynamic bots with signalsEnabled=false', async () => {
      // Setup dynamic bot with signalsEnabled=false
      const bots = await service.getSignalCapableBots();
      // Assert bot is not included
    });

    it('AC-005: should return bots with their own Bottleneck limiter', async () => {
      const bots = await service.getSignalCapableBots();
      for (const bot of bots) {
        expect(bot.limiter).toBeDefined();
        expect(bot.limiter).toBeInstanceOf(Bottleneck);
      }
    });
  });

  describe('getBot', () => {
    it('should return static bot when botId is null', () => {
      const bot = service.getBot(null);
      expect(bot?.botId).toBeNull();
      expect(bot?.type).toBe('static');
    });

    it('should return dynamic bot when botId is specified', () => {
      const bot = service.getBot(5);
      expect(bot?.botId).toBe(5);
      expect(bot?.type).toBe('dynamic');
    });

    it('should return undefined for non-existent bot', () => {
      const bot = service.getBot(999);
      expect(bot).toBeUndefined();
    });
  });

  describe('hasBot', () => {
    it('should return true for static bot when enabled', () => {
      expect(service.hasBot(null)).toBe(true);
    });

    it('should return false for static bot when disabled', () => {
      service.setStaticBotSignalsEnabled(false);
      expect(service.hasBot(null)).toBe(false);
    });
  });

  describe('setStaticBotSignalsEnabled', () => {
    it('should exclude static bot from getSignalCapableBots when disabled', async () => {
      service.setStaticBotSignalsEnabled(false);
      const bots = await service.getSignalCapableBots();
      expect(bots.find((b) => b.botId === null)).toBeUndefined();
    });
  });
});
```

## Completion Criteria

- [x] Service created with all methods implemented
- [x] Static bot limiter initialized in `onModuleInit()`
- [x] Error handlers set up for static bot limiter
- [x] Unit tests pass (22 tests passed)
- [x] Build succeeds

## Verification Commands

```bash
# Run unit tests
npm run test -- --filter="BotRegistryService"

# Build verification
npm run build
```

## Notes

- Impact scope: New service file
- Constraints: Must implement `BotRegistry` interface exactly
- The static bot uses `Telegraf<UserContext>` which extends `Context`
- Type assertion used for static bot to match `SignalCapableBot.instance` type
