import { Injectable, Logger } from '@nestjs/common';
import type {
  BotConfigurationProvider,
  DynamicBotConfig,
  BotSettings,
} from '@quantumdeal/telegraf';
import { BotsRepository, type BotWithSettings } from '@quantumdeal/db';

/**
 * DynamicBotConfigService
 *
 * Implements BotConfigurationProvider interface to load dynamic bot
 * configurations from the database for TelegrafModule.forRootDynamic().
 *
 * This service bridges the @quantumdeal/db layer with the @quantumdeal/telegraf
 * dynamic bot loading infrastructure.
 */
@Injectable()
export class DynamicBotConfigService implements BotConfigurationProvider {
  private readonly logger = new Logger(DynamicBotConfigService.name);

  constructor(private readonly botsRepository: BotsRepository) {}

  /**
   * Load all active dynamic bot configurations from database.
   *
   * Called by DynamicTelegrafService during OnModuleInit to load all
   * bots that should be dynamically managed.
   *
   * Filters out bots that have no webhookPath configured.
   *
   * @returns Promise resolving to array of dynamic bot configurations
   */
  async loadDynamicBots(): Promise<DynamicBotConfig[]> {
    const activeDynamicBots = await this.botsRepository.findActiveDynamic();

    const configs: DynamicBotConfig[] = [];
    for (const bot of activeDynamicBots) {
      const config = this.mapToDynamicBotConfig(bot);
      if (config) {
        configs.push(config);
      }
    }

    return configs;
  }

  /**
   * Map BotWithSettings from database to DynamicBotConfig interface.
   *
   * Returns null if the bot has no webhookPath configured (required field).
   *
   * @param bot - Bot with settings from database
   * @returns DynamicBotConfig for the telegraf module, or null if invalid
   */
  private mapToDynamicBotConfig(bot: BotWithSettings): DynamicBotConfig | null {
    // webhookPath is required for dynamic bots
    if (!bot.webhookPath) {
      this.logger.warn(
        `Skipping bot "${bot.name}" (ID: ${bot.id}): no webhookPath configured`,
      );
      return null;
    }

    return {
      id: bot.id,
      token: bot.token,
      name: bot.name,
      username: bot.username,
      webhookPath: bot.webhookPath,
      isActive: bot.isActive,
      settings: bot.settings ? this.mapBotSettings(bot.settings) : null,
    };
  }

  /**
   * Map database BotSettings to DynamicBotConfig BotSettings.
   *
   * The database schema uses the same structure as the interface,
   * so this is primarily a type-safe conversion.
   *
   * @param dbSettings - Settings from database
   * @returns BotSettings for dynamic config
   */
  private mapBotSettings(dbSettings: unknown): BotSettings | null {
    // Database stores settings as JSONB, validate structure
    if (!dbSettings || typeof dbSettings !== 'object') {
      return null;
    }

    const settings = dbSettings as Record<string, unknown>;

    // Validate required structure
    if (!settings.features || !settings.defaults) {
      return null;
    }

    return {
      features: {
        trialEnabled: Boolean(
          (settings.features as Record<string, unknown>).trialEnabled,
        ),
        paymentsEnabled: Boolean(
          (settings.features as Record<string, unknown>).paymentsEnabled,
        ),
        signalsEnabled: Boolean(
          (settings.features as Record<string, unknown>).signalsEnabled,
        ),
        broadcastEnabled: Boolean(
          (settings.features as Record<string, unknown>).broadcastEnabled,
        ),
      },
      defaults: {
        subscriptionDays: Number(
          (settings.defaults as Record<string, unknown>).subscriptionDays,
        ),
        trialDays: Number(
          (settings.defaults as Record<string, unknown>).trialDays,
        ),
        language: String(
          (settings.defaults as Record<string, unknown>).language,
        ),
      },
      ui: settings.ui
        ? {
            welcomeImage: (settings.ui as Record<string, unknown>)
              .welcomeImage as string | undefined,
            brandColor: (settings.ui as Record<string, unknown>).brandColor as
              | string
              | undefined,
          }
        : undefined,
    };
  }
}
