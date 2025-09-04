import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  BotModule,
  BotName,
  UserManagementMiddleware,
  NotificationService,
} from '@quantumdeal/bot';
import { MasterbotModule } from '@quantumdeal/masterbot';
import { DbModule, OrdersRepository } from '@quantumdeal/db';
import { FrameworkModule } from '@quantumdeal/framework';
import { session } from 'telegraf';

export const sessionMiddleware = session();
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

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
    /*
    TelegrafModule.forRootAsync({
      botName: 'MasterQuantumDealBot',
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('TELEGRAM_MASTER_BOT_TOKEN'),
        include: [MasterbotModule],
      }),
    }),
    */
  ],
  controllers: [WebhookController],
  providers: [WebhookService, OrdersRepository, NotificationService],
})
export class AppModule {}
