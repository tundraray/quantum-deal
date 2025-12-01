import type { ModuleMetadata, Type, Abstract } from '@nestjs/common/interfaces';
import type { Context, Middleware, Telegraf } from 'telegraf';
import type { Scenes } from 'telegraf';
import type Bottleneck from 'bottleneck';

/** Type for module class references */
type ModuleClass = new (...args: unknown[]) => unknown;

/**
 * Configuration for a single dynamic bot loaded from database.
 *
 * This interface defines the contract between the database layer and
 * the dynamic Telegraf module for bot configuration data.
 */
export interface DynamicBotConfig {
  /** Database record ID */
  id: number;
  /** Bot token from BotFather */
  token: string;
  /** Bot display name for logging */
  name: string;
  /** Telegram bot username (without @), null if not yet validated */
  username: string | null;
  /** Unique webhook path (e.g., '/dynamic/brand1') */
  webhookPath: string;
  /** Whether the bot is active and should be loaded */
  isActive: boolean;
  /** Bot-specific settings (feature flags, defaults) */
  settings?: BotSettings | null;
}

/**
 * Bot settings structure for feature flags and defaults.
 *
 * Enables per-bot configuration without schema changes.
 * This interface mirrors the database BotSettings structure.
 */
export interface BotSettings {
  /** Feature flags controlling bot functionality */
  features: {
    /** Whether trial period is enabled for new users */
    trialEnabled: boolean;
    /** Whether payment processing is enabled */
    paymentsEnabled: boolean;
    /** Whether signal delivery is enabled */
    signalsEnabled: boolean;
    /** Whether broadcast messaging is enabled */
    broadcastEnabled: boolean;
  };
  /** Default values for bot operations */
  defaults: {
    /** Default subscription duration in days */
    subscriptionDays: number;
    /** Default trial duration in days */
    trialDays: number;
    /** Default language code (e.g., 'en', 'ru') */
    language: string;
  };
  /** Optional UI customization settings */
  ui?: {
    /** URL to welcome image */
    welcomeImage?: string;
    /** Hex color code for branding */
    brandColor?: string;
  };
}

/**
 * Interface for services that provide bot configurations from database.
 *
 * Must be implemented by the consuming application to load bot configurations.
 * Called once during OnModuleInit to load all active dynamic bots.
 */
export interface BotConfigurationProvider {
  /**
   * Load all active dynamic bot configurations from database.
   *
   * @returns Promise resolving to array of bot configurations
   * @throws May throw database errors which are caught by DynamicTelegrafService
   */
  loadDynamicBots(): Promise<DynamicBotConfig[]>;
}

/**
 * Injection token for BotConfigurationProvider.
 *
 * Use this token to inject the bot configuration provider service.
 * @example
 * ```typescript
 * @Inject(BOT_CONFIGURATION_PROVIDER)
 * private readonly botConfigProvider: BotConfigurationProvider
 * ```
 */
export const BOT_CONFIGURATION_PROVIDER = 'BOT_CONFIGURATION_PROVIDER';

/**
 * Options for TelegrafModule.forRootDynamic().
 *
 * Configures the dynamic bot loading infrastructure.
 * @see TelegrafModule.forRootDynamic
 */
export interface TelegrafDynamicModuleOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Service class that implements BotConfigurationProvider interface.
   * Used to load bot configurations from database.
   */
  botConfigProvider: Type<BotConfigurationProvider>;

  /**
   * Modules containing shared handlers for dynamic bots.
   * These handlers are scanned and registered on each dynamic bot.
   */
  sharedHandlerModules: ModuleClass[];

  /**
   * Webhook domain for dynamic bots.
   * Combined with bot's webhookPath to form full webhook URL.
   * @example 'https://api.example.com'
   */
  webhookDomain: string;

  /**
   * Global middlewares applied to all dynamic bots.
   * @example Session middleware, logging middleware
   */
  globalMiddlewares?: ReadonlyArray<Middleware<Context>>;

  /**
   * Optional factory for creating bot-specific middlewares.
   * Called for each bot during initialization.
   */
  middlewareFactory?: (botConfig: DynamicBotConfig) => Middleware<Context>[];

  /**
   * Optional Telegraf options applied to all dynamic bot instances.
   */
  telegrafOptions?: Partial<Telegraf.Options<Context>>;
}

/**
 * Async options for TelegrafModule.forRootDynamic().
 *
 * Supports useFactory pattern for async configuration.
 * @see TelegrafModule.forRootDynamic
 */
export interface TelegrafDynamicModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Service class that implements BotConfigurationProvider.
   */
  botConfigProvider: Type<BotConfigurationProvider>;

  /**
   * Modules containing shared handlers.
   */
  sharedHandlerModules: ModuleClass[];

  /**
   * Factory function for creating options.
   */
  useFactory?: (
    ...args: unknown[]
  ) => Promise<TelegrafDynamicModuleOptions> | TelegrafDynamicModuleOptions;

  /**
   * Dependencies to inject into useFactory.
   */
  inject?: Array<Type<unknown> | string | symbol | Abstract<unknown>>;
}

/**
 * Represents a running dynamic bot instance.
 *
 * Stored in DynamicTelegrafService registry for bot management.
 */
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

/**
 * Result of bot initialization attempt.
 *
 * Used for tracking initialization success/failure per bot.
 */
export interface BotInitResult {
  /** Whether initialization was successful */
  success: boolean;
  /** Database bot ID */
  botId: number;
  /** Bot display name */
  name: string;
  /** Telegram username (only present on success) */
  username?: string;
  /** Error message (only present on failure) */
  error?: string;
}

/**
 * Statistics about dynamic bot initialization.
 *
 * Provides summary information about the initialization process.
 */
export interface DynamicBotStats {
  /** Total number of bots processed */
  total: number;
  /** Number of successfully initialized bots */
  successful: number;
  /** Number of failed bot initializations */
  failed: number;
  /** Detailed status per bot */
  bots: Array<{
    /** Database bot ID */
    botId: number;
    /** Bot display name */
    name: string;
    /** Current status */
    status: 'running' | 'failed';
    /** Error message if failed */
    error?: string;
  }>;
}
