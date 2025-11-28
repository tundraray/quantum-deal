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

export const sessionMiddleware = session();
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

    // Dynamic bots loaded from database
    TelegrafModule.forRootDynamic({
      botConfigProvider: DynamicBotConfigService,
      sharedHandlerModules: [BotModule],
      webhookDomain: process.env.TELEGRAM_BOT_WEBHOOK_DOMAIN ?? '',
      imports: [DbModule, ConfigModule, BotModule],
      globalMiddlewares: [sessionMiddleware],
    }),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, OrdersRepository],
})
export class AppModule {}
