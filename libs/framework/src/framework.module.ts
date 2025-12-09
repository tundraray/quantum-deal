import { Module } from '@nestjs/common';
import { ResponseTimeInterceptor } from './interceptors/response-time.interceptor';
import { LLMService, LLMConfigurationService } from './llm';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@quantumdeal/db';
import { BotRegistryService, SignalService } from './webhook';
import { NotificationService } from './notifications';
import { LocalizationModule } from './localization';

@Module({
  imports: [ConfigModule, DbModule, LocalizationModule],
  providers: [
    ResponseTimeInterceptor,
    LLMConfigurationService,
    LLMService,
    NotificationService,
    BotRegistryService,
    SignalService,
  ],
  exports: [
    NotificationService,
    LLMService,
    LLMConfigurationService,
    BotRegistryService,
    SignalService,
    LocalizationModule,
  ],
})
export class FrameworkModule {}
