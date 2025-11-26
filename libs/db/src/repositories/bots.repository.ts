import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import { bots, Bot, NewBot } from '../schema/bots';
import {
  botSettings,
  BotSettings,
  PaymentSettings,
} from '../schema/bot-settings';

/**
 * Combined type for bot with settings loaded via JOIN
 *
 * Represents a bot record with its associated settings (1:1 relationship).
 * Settings may be null if no settings record exists.
 */
export interface BotWithSettings extends Bot {
  settings: BotSettings | null;
  paymentSettings: PaymentSettings | null;
}

/**
 * BotsRepository
 *
 * Repository for managing bot configurations in the database.
 * Provides methods for CRUD operations on the bots table.
 *
 * Per ADR-004: Bots table stores configuration for all Telegram bots
 * (both static and dynamic). Token storage is plain text per ADR-004 Decision 4.
 */
@Injectable()
export class BotsRepository extends BaseRepository<Bot, NewBot, number> {
  protected table = bots;
  protected idColumn = bots.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find all active dynamic bots with their settings
   *
   * Used during application startup to load bots managed by DynamicTelegrafModule.
   * Returns bots with isDynamic=true AND isActive=true, including joined settings.
   *
   * @returns Array of active dynamic bots with their settings
   */
  async findActiveDynamic(): Promise<BotWithSettings[]> {
    const result = await this.db
      .select({
        bot: bots,
        settings: botSettings,
      })
      .from(bots)
      .leftJoin(botSettings, eq(bots.id, botSettings.botId))
      .where(and(eq(bots.isDynamic, true), eq(bots.isActive, true)));

    return result.map((row) => ({
      ...row.bot,
      settings: (row.settings?.settings as BotSettings) ?? null,
      paymentSettings:
        (row.settings?.paymentSettings as PaymentSettings) ?? null,
    }));
  }

  /**
   * Find all active bots (both static and dynamic)
   *
   * @returns Array of all active bots
   */
  async findAllActive(): Promise<Bot[]> {
    return this.findBy(eq(bots.isActive, true));
  }

  /**
   * Find a bot by ID with its settings (LEFT JOIN)
   *
   * Returns the bot with joined settings in a single query.
   * Settings may be null if no settings record exists for the bot.
   *
   * @param id - The bot ID
   * @returns Bot with settings or null if not found
   */
  async findByIdWithSettings(id: number): Promise<BotWithSettings | null> {
    const result = await this.db
      .select({
        bot: bots,
        settings: botSettings,
      })
      .from(bots)
      .leftJoin(botSettings, eq(bots.id, botSettings.botId))
      .where(eq(bots.id, id))
      .limit(1);

    if (!result[0]) return null;

    return {
      ...result[0].bot,
      settings: (result[0].settings?.settings as BotSettings) ?? null,
      paymentSettings:
        (result[0].settings?.paymentSettings as PaymentSettings) ?? null,
    };
  }

  /**
   * Find a bot by name
   *
   * Name is unique per the database schema.
   *
   * @param name - The bot name (e.g., 'QuantumDealBot', 'SignalBot')
   * @returns Bot or null if not found
   */
  async findByName(name: string): Promise<Bot | null> {
    return this.findOneBy(eq(bots.name, name));
  }

  /**
   * Find a bot by Telegram username
   *
   * @param username - The Telegram bot username (without @)
   * @returns Bot or null if not found
   */
  async findByUsername(username: string): Promise<Bot | null> {
    return this.findOneBy(eq(bots.username, username));
  }

  /**
   * Find a bot by webhook path
   *
   * Used to route incoming webhooks to the correct bot.
   *
   * @param webhookPath - The webhook path (e.g., '/bot', '/dynamic/signal')
   * @returns Bot or null if not found
   */
  async findByWebhookPath(webhookPath: string): Promise<Bot | null> {
    return this.findOneBy(eq(bots.webhookPath, webhookPath));
  }

  /**
   * Deactivate a bot (soft delete)
   *
   * Sets isActive to false. The bot will no longer be returned by
   * findActiveDynamic() and will not be loaded on application startup.
   *
   * @param id - The bot ID
   * @returns Updated bot or null if not found
   */
  async deactivate(id: number): Promise<Bot | null> {
    return this.update(id, { isActive: false });
  }

  /**
   * Activate a bot
   *
   * Sets isActive to true. The bot will be included in findActiveDynamic()
   * results and loaded on application startup.
   *
   * @param id - The bot ID
   * @returns Updated bot or null if not found
   */
  async activate(id: number): Promise<Bot | null> {
    return this.update(id, { isActive: true });
  }
}
