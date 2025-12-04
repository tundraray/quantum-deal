import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { TelegrafModule } from '@quantumdeal/telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  BotModule,
  BotName,
  UserManagementMiddleware,
  DynamicBotConfigService,
} from '@quantumdeal/bot';
import { ManagersMiddleware, MasterbotModule } from '@quantumdeal/masterbot';
import { DbModule, OrdersRepository } from '@quantumdeal/db';
import { FrameworkModule, SentryModule } from '@quantumdeal/framework';
import { session } from 'telegraf';
import { WebhookService } from './webhook.service';
import { PartnerBotModule } from '@quantumdeal/partner-bot';
import { UserDynamicManagementMiddleware } from '@quantumdeal/partner-bot/middleware/user-management.middleware';

const sessionMiddleware = session();
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    SentryModule,

    BotModule,
    MasterbotModule,
    DbModule,
    FrameworkModule,
    TelegrafModule.forRootAsync({
      botName: BotName,
      imports: [ConfigModule, BotModule],
      inject: [ConfigService, UserManagementMiddleware],

      useFactory: (
        configService: ConfigService,
        userMiddleware: UserManagementMiddleware,
      ) => ({
        token: configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
        middlewares: [
          userMiddleware.use.bind(userMiddleware),
          sessionMiddleware,
        ],

        webhook: {
          domain: configService.getOrThrow<string>(
            'TELEGRAM_BOT_WEBHOOK_DOMAIN',
          ),
          allowedUpdates: ['message', 'callback_query', 'inline_query'],
          port: configService.get<number>('TELEGRAM_BOT_WEBHOOK_PORT', 443),
          path: '/bot',
        },
        include: [BotModule],
      }),
    }),

    TelegrafModule.forRootAsync({
      botName: 'QuantumDealMasterBot',
      imports: [ConfigModule, MasterbotModule],
      inject: [ConfigService, ManagersMiddleware],
      useFactory: (
        configService: ConfigService,
        managersMiddleware: ManagersMiddleware,
      ) => ({
        token: configService.getOrThrow<string>('TELEGRAM_MASTER_BOT_TOKEN'),
        include: [MasterbotModule],
        middlewares: [
          sessionMiddleware,
          managersMiddleware.use.bind(managersMiddleware),
        ],
        webhook: {
          domain: configService.getOrThrow<string>(
            'TELEGRAM_BOT_WEBHOOK_DOMAIN',
          ),
          allowedUpdates: ['message', 'callback_query', 'inline_query'],
          port: configService.get<number>('TELEGRAM_BOT_WEBHOOK_PORT', 443),
          path: '/masterbot',
        },
      }),
    }),

    TelegrafModule.forRootDynamicAsync({
      botConfigProvider: DynamicBotConfigService,
      sharedHandlerModules: [PartnerBotModule],
      imports: [DbModule, ConfigModule, PartnerBotModule],
      useFactory: (
        configService: ConfigService,
        userMiddleware: UserDynamicManagementMiddleware,
      ) => ({
        webhookDomain: configService.getOrThrow<string>(
          'TELEGRAM_BOT_WEBHOOK_DOMAIN',
        ),
        globalMiddlewares: [
          sessionMiddleware,
          userMiddleware.use.bind(userMiddleware),
        ],
        middlewareFactory: (botConfig) => [
          async (ctx, next) => {
            (ctx as { botId?: number }).botId = botConfig.id;
            await next();
          },
        ],
      }),
      inject: [ConfigService, UserDynamicManagementMiddleware],
    }),

    // Dynamic bots loaded from database
    /*
    TelegrafModule.forRootDynamic({
      botConfigProvider: DynamicBotConfigService,
      sharedHandlerModules: [PartnerBotModule],
      webhookDomain: process.env.TELEGRAM_BOT_WEBHOOK_DOMAIN ?? '',
      imports: [
        DbModule,
        ConfigModule,
        PartnerBotModule,
        UserManagementMiddleware,
      ],
      globalMiddlewares: [sessionMiddleware],
      // Inject botId into context for each dynamic bot
      middlewareFactory: (botConfig) => [
        async (ctx, next) => {
          // Inject the database botId into the context
          // This allows handlers to access ctx.botId for bot-specific operations
          (ctx as { botId?: number }).botId = botConfig.id;
          await next();
        },
      ],
    }),
    */
  ],
  controllers: [WebhookController],
  providers: [WebhookService, OrdersRepository],
})
export class AppModule {}
