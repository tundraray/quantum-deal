import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import {
  TelegrafDynamicModuleOptions,
  TelegrafDynamicModuleAsyncOptions,
  BOT_CONFIGURATION_PROVIDER,
} from './interfaces';
import { DYNAMIC_TELEGRAF_MODULE_OPTIONS } from './telegraf.constants';
import { DynamicTelegrafService } from './services/dynamic-telegraf.service';
import { DynamicListenersExplorerService } from './services/dynamic-listeners-explorer.service';
import { MetadataAccessorService } from './services';

/**
 * Core module for dynamic bot loading infrastructure.
 *
 * This module is marked as @Global to allow DynamicTelegrafService
 * to be injected anywhere in the application for update routing.
 *
 * Module Structure:
 * - Imports: DiscoveryModule, user-provided modules, shared handler modules
 * - Providers: Options, BotConfigurationProvider, DynamicTelegrafService, DynamicListenersExplorerService, MetadataAccessorService
 * - Exports: DynamicTelegrafService, DYNAMIC_TELEGRAF_MODULE_OPTIONS
 *
 * @example
 * ```typescript
 * TelegrafModule.forRootDynamic({
 *   botConfigProvider: BotConfigService,
 *   sharedHandlerModules: [SharedHandlersModule],
 *   webhookDomain: 'https://api.example.com',
 *   imports: [DbModule],
 * })
 * ```
 */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [MetadataAccessorService],
})
export class DynamicTelegrafCoreModule {
  /**
   * Create dynamic module with bot configuration provider.
   *
   * This method configures the module with all necessary providers for
   * dynamic bot loading infrastructure. It imports DiscoveryModule for
   * handler discovery and user-provided modules for database access.
   *
   * @param options - Configuration options for dynamic bot loading
   * @returns DynamicModule configured with all providers
   */
  public static forRoot(options: TelegrafDynamicModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: DYNAMIC_TELEGRAF_MODULE_OPTIONS,
      useValue: options,
    };

    const botConfigProviderProvider: Provider = {
      provide: BOT_CONFIGURATION_PROVIDER,
      useClass: options.botConfigProvider,
    };

    // Cast sharedHandlerModules to Type[] for NestJS module imports
    // The Function[] type in the interface is for flexibility, but NestJS requires Type[]
    const sharedModules = options.sharedHandlerModules as unknown as Type[];

    return {
      module: DynamicTelegrafCoreModule,
      imports: [...(options.imports || []), ...sharedModules],
      providers: [
        optionsProvider,
        botConfigProviderProvider,
        DynamicTelegrafService,
        DynamicListenersExplorerService,
      ],
      exports: [DynamicTelegrafService, DYNAMIC_TELEGRAF_MODULE_OPTIONS],
    };
  }

  /**
   * Create dynamic module with async configuration using factory pattern.
   *
   * This method allows injecting dependencies (e.g., ConfigService) to
   * resolve configuration asynchronously.
   *
   * @param options - Async configuration options with useFactory and inject
   * @returns DynamicModule configured with async providers
   *
   * @example
   * ```typescript
   * TelegrafModule.forRootDynamicAsync({
   *   botConfigProvider: DynamicBotConfigService,
   *   sharedHandlerModules: [PartnerBotModule],
   *   imports: [ConfigModule, DbModule],
   *   inject: [ConfigService],
   *   useFactory: (configService: ConfigService) => ({
   *     webhookDomain: configService.getOrThrow('WEBHOOK_DOMAIN'),
   *     globalMiddlewares: [sessionMiddleware],
   *   }),
   * })
   * ```
   */
  public static forRootAsync(
    options: TelegrafDynamicModuleAsyncOptions,
  ): DynamicModule {
    const botConfigProviderProvider: Provider = {
      provide: BOT_CONFIGURATION_PROVIDER,
      useClass: options.botConfigProvider,
    };

    // Cast sharedHandlerModules to Type[] for NestJS module imports
    const sharedModules = options.sharedHandlerModules as unknown as Type[];

    const asyncOptionsProvider = this.createAsyncOptionsProvider(options);

    return {
      module: DynamicTelegrafCoreModule,
      imports: [...(options.imports || []), ...sharedModules],
      providers: [
        asyncOptionsProvider,
        botConfigProviderProvider,
        DynamicTelegrafService,
        DynamicListenersExplorerService,
      ],
      exports: [DynamicTelegrafService, DYNAMIC_TELEGRAF_MODULE_OPTIONS],
    };
  }

  /**
   * Create the async options provider using useFactory pattern.
   *
   * Transforms the factory options into full module options by combining
   * with the static options (botConfigProvider, sharedHandlerModules).
   *
   * @param options - Async options containing useFactory and inject
   * @returns Provider for DYNAMIC_TELEGRAF_MODULE_OPTIONS
   */
  private static createAsyncOptionsProvider(
    options: TelegrafDynamicModuleAsyncOptions,
  ): Provider {
    return {
      provide: DYNAMIC_TELEGRAF_MODULE_OPTIONS,
      useFactory: async (
        ...args: unknown[]
      ): Promise<TelegrafDynamicModuleOptions> => {
        const factoryOptions = await options.useFactory(...args);
        return {
          botConfigProvider: options.botConfigProvider,
          sharedHandlerModules: options.sharedHandlerModules,
          imports: options.imports,
          ...factoryOptions,
        };
      },
      inject: options.inject || [],
    };
  }
}
