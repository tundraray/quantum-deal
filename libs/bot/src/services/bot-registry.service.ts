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
 *
 * @remarks
 * - Static bot (QuantumDealBot) is identified by botId = null
 * - Dynamic bots use their database ID as botId
 * - Each bot has its own Bottleneck rate limiter instance
 */
@Injectable()
export class BotRegistryService implements BotRegistry, OnModuleInit {
  private readonly logger = new Logger(BotRegistryService.name);

  /** Rate limiter for static bot */
  private staticBotLimiter!: Bottleneck;

  /** Bottleneck configuration matching NotificationService (28 msg/sec) */
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

  /**
   * Initialize the static bot rate limiter.
   * Called automatically by NestJS after dependency injection.
   */
  onModuleInit(): void {
    this.staticBotLimiter = new Bottleneck(this.bottleneckConfig);
    this.setupLimiterErrorHandlers(this.staticBotLimiter, 'QuantumDealBot');
    this.logger.log('BotRegistryService initialized with static bot limiter');
  }

  /**
   * Get all bots capable of sending signals.
   * Includes static bot (if enabled) and all dynamic bots with signalsEnabled=true.
   *
   * @returns Array of signal-capable bots (static + dynamic)
   *
   * @remarks
   * - Static bot is included only if staticBotSignalsEnabled is true
   * - Dynamic bots are filtered by settings.features.signalsEnabled
   * - AC-001: Returns all signal-capable bots for broadcasting
   * - AC-008: Static bot included with botId=null when enabled
   */
  getSignalCapableBots(): SignalCapableBot[] {
    const bots: SignalCapableBot[] = [];

    // Add static bot if signals are enabled
    if (this.staticBotSignalsEnabled) {
      bots.push({
        botId: 1,
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
   *
   * @param botId - Database ID (null for static bot)
   * @returns SignalCapableBot if found, undefined otherwise
   *
   * @remarks
   * - Returns undefined if static bot is disabled and botId is null
   * - Returns undefined if dynamic bot does not exist
   */
  getBot(botId: number | null): SignalCapableBot | undefined {
    if (botId === null) {
      if (!this.staticBotSignalsEnabled) return undefined;
      return {
        botId: 1,
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
   *
   * @param botId - Database ID (null for static bot)
   * @returns true if bot is available, false otherwise
   *
   * @remarks
   * - For static bot, returns staticBotSignalsEnabled status
   * - For dynamic bots, delegates to DynamicTelegrafService.hasBot()
   */
  hasBot(botId: number | null): boolean {
    if (botId === null) {
      return this.staticBotSignalsEnabled;
    }
    return this.dynamicTelegrafService.hasBot(botId);
  }

  /**
   * Configure static bot signal capability.
   *
   * @param enabled - Whether static bot should send signals
   *
   * @remarks
   * Use this method to temporarily disable the static bot from signal broadcasting
   * without affecting dynamic bots.
   */
  setStaticBotSignalsEnabled(enabled: boolean): void {
    this.staticBotSignalsEnabled = enabled;
    this.logger.log(`Static bot signals ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Setup error handlers for a Bottleneck limiter.
   *
   * @param limiter - Bottleneck instance to configure
   * @param botName - Bot name for logging
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
