import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotModule, BotName } from '@quantumdeal/bot';
import { MasterbotModule } from '@quantumdeal/masterbot';
import { DbModule } from '@quantumdeal/db';
import { FrameworkModule } from '@quantumdeal/framework';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DbModule,
    FrameworkModule,
    TelegrafModule.forRootAsync({
      botName: BotName,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
        webhook: {
          domain: configService.getOrThrow<string>(
            'TELEGRAM_BOT_WEBHOOK_DOMAIN',
          ),
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
    BotModule,
    MasterbotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
