import { Module, OnModuleInit } from '@nestjs/common';
import { ResponseTimeInterceptor } from './interceptors/response-time.interceptor';
import { LLMService, LLMConfigurationService } from './llm';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@quantumdeal/db';
import {
  BotRegistryService,
  BatchMessageFormatter,
  SignalBatchingService,
  SignalService,
  TemplateEngine,
} from './webhook';
import { NotificationService } from './notifications';
import { LocalizationModule, LocalizationService } from './localization';
import {
  signalsMessages,
  SIGNALS_I18N_NAMESPACE,
} from './webhook/signals.i18n';

@Module({
  imports: [ConfigModule, DbModule, LocalizationModule],
  providers: [
    ResponseTimeInterceptor,
    LLMConfigurationService,
    LLMService,
    NotificationService,
    BotRegistryService,
    BatchMessageFormatter,
    TemplateEngine,
    SignalBatchingService,
    SignalService,
  ],
  exports: [
    NotificationService,
    LLMService,
    LLMConfigurationService,
    BotRegistryService,
    BatchMessageFormatter,
    TemplateEngine,
    SignalBatchingService,
    SignalService,
    LocalizationModule,
  ],
})
export class FrameworkModule implements OnModuleInit {
  constructor(private readonly localizationService: LocalizationService) {}

  onModuleInit(): void {
    this.localizationService.registerI18n(
      SIGNALS_I18N_NAMESPACE,
      signalsMessages,
    );
  }
}
