import { Module, DynamicModule } from '@nestjs/common';
import { TelegrafCoreModule } from './telegraf-core.module';
import { DynamicTelegrafCoreModule } from './dynamic-telegraf-core.module';
import {
  TelegrafModuleOptions,
  TelegrafModuleAsyncOptions,
  TelegrafDynamicModuleOptions,
} from './interfaces';

@Module({})
export class TelegrafModule {
  public static forRoot(options: TelegrafModuleOptions): DynamicModule {
    return {
      module: TelegrafModule,
      imports: [TelegrafCoreModule.forRoot(options)],
      exports: [TelegrafCoreModule],
    };
  }

  public static forRootAsync(
    options: TelegrafModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: TelegrafModule,
      imports: [TelegrafCoreModule.forRootAsync(options)],
      exports: [TelegrafCoreModule],
    };
  }

  /**
   * Dynamic bot loading from database.
   *
   * Creates a DynamicTelegrafCoreModule that:
   * 1. Loads bot configurations from BotConfigurationProvider at startup
   * 2. Creates Telegraf instances for each active bot
   * 3. Registers shared handlers on each bot
   * 4. Sets up webhooks
   * 5. Provides bot registry for update routing
   *
   * @param options Dynamic module configuration
   * @returns DynamicModule for NestJS registration
   *
   * @example
   * ```typescript
   * // app.module.ts
   * @Module({
   *   imports: [
   *     // Static bot (existing)
   *     TelegrafModule.forRootAsync({
   *       imports: [ConfigModule],
   *       useFactory: (config: ConfigService) => ({
   *         token: config.get('MAIN_BOT_TOKEN'),
   *       }),
   *       inject: [ConfigService],
   *     }),
   *
   *     // Dynamic bots (new)
   *     TelegrafModule.forRootDynamic({
   *       botConfigProvider: BotsRepository,
   *       sharedHandlerModules: [SharedHandlersModule],
   *       webhookDomain: process.env.WEBHOOK_DOMAIN,
   *       imports: [DbModule],
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  public static forRootDynamic(
    options: TelegrafDynamicModuleOptions,
  ): DynamicModule {
    return {
      module: TelegrafModule,
      imports: [DynamicTelegrafCoreModule.forRoot(options)],
      exports: [DynamicTelegrafCoreModule],
    };
  }
}
