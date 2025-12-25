import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { Scenes, Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import Bottleneck from 'bottleneck';
import {
  BOT_CONFIGURATION_PROVIDER,
  type BotConfigurationProvider,
  type BotInitResult,
  type DynamicBotConfig,
  type DynamicBotInstance,
  type DynamicBotStats,
  type TelegrafDynamicModuleOptions,
} from '../interfaces';
import { DYNAMIC_TELEGRAF_MODULE_OPTIONS } from '../telegraf.constants';
import { DynamicListenersExplorerService } from './dynamic-listeners-explorer.service';
import { createBotFactory } from '../utils';
import * as Sentry from '@sentry/nestjs';

/**
 * DynamicTelegrafService
 *
 * Manages dynamically loaded Telegram bots from database.
 * Implements OnModuleInit to load bots at application startup
 * and OnApplicationShutdown for graceful cleanup.
 *
 * Key responsibilities:
 * - Load active dynamic bots from database via BotConfigurationProvider
 * - Create and configure Telegraf instances per bot
 * - Create per-bot Stage instances for scene isolation
 * - Register shared handlers on each bot
 * - Set up webhooks with Telegram API
 * - Route incoming updates to correct bot instance
 * - Graceful shutdown (delete webhooks, stop bots)
 */
@Injectable()
export class DynamicTelegrafService
  implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DynamicTelegrafService.name);

  /** Map of botId -> DynamicBotInstance for O(1) lookup */
  private readonly bots = new Map<number, DynamicBotInstance>();

  /** Map of webhookPath -> botId for fast routing */
  private readonly webhookPathIndex = new Map<string, number>();

  /** Initialization statistics */
  private stats: DynamicBotStats = {
    total: 0,
    successful: 0,
    failed: 0,
    bots: [],
  };

  /** Bottleneck configuration for per-bot rate limiting (ADR-007) */
  private readonly bottleneckConfig = {
    maxConcurrent: 4,
    minTime: 30,
    reservoir: 28,
    reservoirRefreshAmount: 28,
    reservoirRefreshInterval: 1000,
  };

  constructor(
    @Inject(DYNAMIC_TELEGRAF_MODULE_OPTIONS)
    private readonly options: TelegrafDynamicModuleOptions,
    @Inject(BOT_CONFIGURATION_PROVIDER)
    private readonly botConfigProvider: BotConfigurationProvider,
    private readonly listenersExplorer: DynamicListenersExplorerService,
  ) { }

  /**
   * Initialize all dynamic bots on application startup.
   *
   * Called automatically by NestJS after module initialization.
   * Loads bot configurations from BotConfigurationProvider and
   * creates Telegraf instances for each active bot.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing dynamic bots...');

    try {
      const results = await this.loadAndInitializeBots();

      this.stats = {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        bots: results.map((r) => ({
          botId: r.botId,
          name: r.name,
          status: r.success ? 'running' : 'failed',
          error: r.error,
        })),
      };

      this.logger.log(
        `Dynamic bots initialized: ${this.stats.successful} success, ${this.stats.failed} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Critical error during dynamic bot initialization',
        error,
      );
    }
  }

  /**
   * Graceful shutdown - stop all bots and delete webhooks.
   *
   * Called automatically by NestJS when application is shutting down.
   * Deletes webhooks for all dynamic bots and stops instances.
   *
   * @param signal - Optional shutdown signal (e.g., 'SIGTERM')
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Application shutting down (signal: ${signal}), stopping ${this.bots.size} dynamic bots...`,
    );

    const stopPromises: Promise<void>[] = [];

    for (const [, instance] of this.bots) {
      stopPromises.push(this.stopBot(instance));
    }

    const results = await Promise.allSettled(stopPromises);

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(`${failures.length} bots failed to stop cleanly`);
    }

    this.bots.clear();
    this.webhookPathIndex.clear();

    Sentry.captureEvent({
      message: `All dynamic bots stopped (signal: ${signal})`,
      level: 'info',
    });

    this.logger.log('All dynamic bots stopped');
  }

  /**
   * Load bot configurations and initialize each bot.
   *
   * @returns Array of initialization results for each bot
   */
  private async loadAndInitializeBots(): Promise<BotInitResult[]> {
    const configs = await this.botConfigProvider.loadDynamicBots();
    const results: BotInitResult[] = [];

    for (const config of configs) {
      if (!config.isActive) {
        this.logger.debug(`Skipping inactive bot: ${config.name}`);
        continue;
      }

      const result = await this.initializeBot(config);
      results.push(result);
    }

    return results;
  }

  /**
   * Initialize a single bot instance.
   *
   * Creates a Telegraf instance, validates the token via getMe(),
   * applies middlewares in the correct order (global -> factory -> stage),
   * and stores the instance in the registry.
   *
   * @param config - Bot configuration from database
   * @returns Initialization result with success/failure status
   */
  private async initializeBot(
    config: DynamicBotConfig,
  ): Promise<BotInitResult> {
    const { id, name, token, webhookPath, settings } = config;

    try {
      this.logger.debug(`Initializing bot: ${name} (ID: ${id})`);
      const bot = await createBotFactory({
        token,
        options: this.options.telegrafOptions,
      });
      // Validate token by calling getMe()
      const botInfo = await bot.telegram.getMe();
      const username = botInfo.username;

      // Log username mismatch if detected
      if (config.username && config.username !== username) {
        this.logger.warn(
          `Bot "${name}": username mismatch - DB: ${config.username}, Telegram: ${username}`,
        );
      }

      // Create per-bot Stage instance for scene isolation
      const stage = new Scenes.Stage<Scenes.SceneContext>([]);

      // Apply bot-specific middlewares from factory
      if (this.options.middlewareFactory) {
        const botMiddlewares = this.options.middlewareFactory(config);
        for (const middleware of botMiddlewares) {
          bot.use(middleware);
        }
      }

      if (this.options.globalMiddlewares) {
        bot.use(...(this.options.globalMiddlewares ?? []));
      }

      // Apply stage middleware (must be after global and factory middlewares)
      bot.use(stage.middleware());

      // Register shared handlers from handler modules
      this.listenersExplorer.registerHandlers(bot, id, stage, settings ?? null);

      // Setup global error handler
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      bot.catch((err: unknown, _ctx) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;
        this.logger.error(
          `Error in bot "${name}" (@${username}): ${errorMessage}`,
          errorStack,
        );
      });

      // Create per-bot rate limiter (ADR-007)
      const limiter = new Bottleneck(this.bottleneckConfig);
      limiter.on('error', (error) => {
        this.logger.error(`Bottleneck error for bot "${name}":`, error);
      });

      // Store bot instance in registry
      const instance: DynamicBotInstance = {
        botId: id,
        name,
        bot,
        stage,
        webhookPath,
        settings: settings ?? null,
        username,
        limiter,
      };

      this.bots.set(id, instance);
      this.webhookPathIndex.set(webhookPath, id);

      this.logger.log(`Dynamic bot started: "${name}" (@${username})`);

      return { success: true, botId: id, name, username };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Mask token in error messages to prevent token leakage in logs
      const safeError = errorMessage.replace(/\d+:[A-Za-z0-9_-]+/g, '***:****');
      this.logger.error(
        `Failed to initialize bot "${name}" (ID: ${id}): ${safeError}`,
      );
      return { success: false, botId: id, name, error: safeError };
    }
  }

  /**
   * Setup webhook for a bot.
   *
   * Constructs the full webhook URL from webhookDomain + webhookPath
   * and configures it with Telegram via setWebhook API.
   *
   * Error handling is non-blocking - failures are logged but don't prevent
   * bot initialization. This allows manual webhook setup as a fallback.
   *
   * @param bot - Telegraf instance
   * @param webhookPath - Unique webhook path for the bot
   * @param botName - Bot name for logging
   */
  private async setupWebhook(
    bot: Telegraf<Context>,
    webhookPath: string,
    botName: string,
  ): Promise<void> {
    try {
      const webhookUrl = `${this.options.webhookDomain}${webhookPath}`;
      this.logger.debug(`Setting webhook for bot "${botName}": ${webhookUrl}`);

      await bot.telegram.setWebhook(webhookUrl);

      this.logger.log(`Webhook configured for bot "${botName}": ${webhookUrl}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to setup webhook for bot "${botName}": ${errorMessage}`,
      );
      // Non-blocking: don't throw, allow bot to continue initialization
      // Manual webhook setup can be performed if needed
    }
  }

  /**
   * Stop a single bot and delete its webhook.
   *
   * @param botId - Database bot ID
   * @param instance - Dynamic bot instance
   */
  private async stopBot(instance: DynamicBotInstance): Promise<void> {
    try {
      // Stop the rate limiter (ADR-007)
      await instance.limiter.stop({ dropWaitingJobs: false });
      await instance.bot.telegram.deleteWebhook();
      this.logger.debug(
        `Bot "${instance.name}" stopped (webhook deleted, limiter stopped)`,
      );
    } catch (error) {
      this.logger.error(`Error stopping bot "${instance.name}":`, error);
      throw error; // Re-throw for Promise.allSettled to catch
    }
  }

  // ==================== Public API ====================

  /**
   * Handle incoming webhook update.
   *
   * Routes the update to the correct bot instance based on webhook path.
   * Returns true if handled, false if no bot found.
   *
   * @param webhookPath - Full webhook path (e.g., '/dynamic/signal')
   * @param update - Telegram update object
   * @returns true if update was routed to a bot, false otherwise
   */
  async handleUpdate(webhookPath: string, update: Update): Promise<boolean> {
    const botId = this.webhookPathIndex.get(webhookPath);
    this.logger.debug(`Handling update for webhook path: ${webhookPath}`);

    if (botId === undefined) {
      this.logger.warn(`No bot found for webhook path: ${webhookPath}`);
      return false;
    }

    const instance = this.bots.get(botId);

    if (!instance) {
      this.logger.error(`Bot ID ${botId} found in index but not in registry`);
      return false;
    }

    try {
      await instance.bot.handleUpdate(update);
      return true;
    } catch (error) {
      this.logger.error(
        `Error handling update for bot "${instance.name}":`,
        error,
      );
      return false;
    }
  }

  /**
   * Get a bot instance by database ID.
   *
   * @param botId - Database record ID
   * @returns Telegraf instance or undefined if not found
   */
  getBot(botId: number): Telegraf<Context> | undefined {
    return this.bots.get(botId)?.bot;
  }

  /**
   * Get a bot instance by webhook path.
   *
   * @param webhookPath - Webhook path (e.g., '/dynamic/brand1')
   * @returns Telegraf instance or undefined if not found
   */
  getBotByWebhookPath(webhookPath: string): Telegraf<Context> | undefined {
    const botId = this.webhookPathIndex.get(webhookPath);
    if (botId === undefined) return undefined;
    return this.bots.get(botId)?.bot;
  }

  /**
   * Get all running dynamic bot instances.
   *
   * Returns a copy to prevent external modification.
   *
   * @returns Map of botId to DynamicBotInstance
   */
  getAllBots(): Map<number, DynamicBotInstance> {
    return new Map(this.bots);
  }

  /**
   * Get count of running dynamic bots.
   *
   * @returns Number of currently running bots
   */
  getBotCount(): number {
    return this.bots.size;
  }

  /**
   * Get initialization statistics.
   *
   * @returns Statistics about bot initialization
   */
  getStats(): DynamicBotStats {
    return { ...this.stats };
  }

  /**
   * Check if a bot exists and is running.
   *
   * @param botId - Database record ID
   * @returns true if bot is running, false otherwise
   */
  hasBot(botId: number): boolean {
    return this.bots.has(botId);
  }

  /**
   * Get full bot instance by database ID.
   *
   * Provides access to the complete DynamicBotInstance including
   * the per-bot Stage for scene management.
   *
   * @param botId - Database record ID
   * @returns DynamicBotInstance or undefined if not found
   */
  getBotInstance(botId: number): DynamicBotInstance | undefined {
    return this.bots.get(botId);
  }
}
