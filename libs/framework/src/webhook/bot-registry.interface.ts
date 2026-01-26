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
  getSignalCapableBots(): SignalCapableBot[];

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
