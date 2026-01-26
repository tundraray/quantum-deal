// libs/db/src/repositories/bot-settings.repository.ts

import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database.provider';
import {
  botSettings,
  BotSettingsRecord,
  NewBotSettingsRecord,
  BotSettings,
  PaymentSettings,
} from '../schema/bot-settings';

/**
 * BotSettingsRepository
 *
 * Repository for managing bot-specific settings in the database.
 * Settings are stored in a separate table (1:1 relationship with bots)
 * for cleaner separation of concerns.
 *
 * Per ADR-004 Decision 5: JSONB storage enables flexible feature flags
 * without requiring database migrations for new settings.
 *
 * Key Features:
 * - findByBotId(): Retrieve settings by bot ID
 * - upsert(): Create or update settings atomically
 * - updateFeatureFlags(): Partial merge of feature flag updates
 */
@Injectable()
export class BotSettingsRepository extends BaseRepository<
  BotSettingsRecord,
  NewBotSettingsRecord,
  number
> {
  protected table = botSettings;
  protected idColumn = botSettings.id;

  constructor(@Inject(DRIZZLE_CLIENT) db: DrizzleClient) {
    super(db);
  }

  /**
   * Find settings by bot ID
   *
   * Returns the settings record for a specific bot, or null if no settings exist.
   * The settings column contains JSONB data matching the BotSettings interface.
   *
   * @param botId - The bot's unique identifier
   * @returns Settings record or null if not found
   */
  async findByBotId(botId: number): Promise<BotSettingsRecord | null> {
    return this.findOneBy(eq(botSettings.botId, botId));
  }

  /**
   * Create or update settings for a bot (upsert)
   *
   * If settings exist for the bot, updates them.
   * If no settings exist, creates a new record.
   *
   * Note: Creating settings for a non-existent bot will throw a FK violation error.
   *
   * @param botId - The bot's unique identifier
   * @param data - Settings data to upsert (settings and/or paymentSettings)
   * @returns The created or updated settings record
   * @throws Error if botId references a non-existent bot (FK violation)
   */
  async upsert(
    botId: number,
    data: { settings?: BotSettings; paymentSettings?: PaymentSettings },
  ): Promise<BotSettingsRecord> {
    const existing = await this.findByBotId(botId);

    if (existing) {
      // Update existing record
      const result = await this.db
        .update(botSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(botSettings.botId, botId))
        .returning();

      return result[0];
    }

    // Create new record
    const result = await this.db
      .insert(botSettings)
      .values({ botId, ...data })
      .returning();

    return result[0];
  }

  /**
   * Update specific feature flags with partial merge
   *
   * Merges the provided feature flags with existing ones, preserving
   * any flags not included in the update. Also preserves non-feature
   * settings (defaults, ui).
   *
   * Returns null if no settings exist for the bot (caller should create
   * settings first using upsert).
   *
   * @param botId - The bot's unique identifier
   * @param features - Partial feature flags to merge
   * @returns Updated settings record or null if bot has no settings
   */
  async updateFeatureFlags(
    botId: number,
    features: Partial<BotSettings['features']>,
  ): Promise<BotSettingsRecord | null> {
    const existing = await this.findByBotId(botId);
    if (!existing) return null;

    const currentSettings = existing.settings;
    const updatedSettings: BotSettings = {
      ...currentSettings,
      features: {
        ...currentSettings.features,
        ...features,
      },
    };

    const result = await this.db
      .update(botSettings)
      .set({ settings: updatedSettings, updatedAt: new Date() })
      .where(eq(botSettings.botId, botId))
      .returning();

    return result[0] ?? null;
  }
}
