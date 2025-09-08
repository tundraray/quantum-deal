import { Module } from '@nestjs/common';
import { FrameworkService } from './framework.service';
import { ResponseTimeInterceptor } from './interceptors/response-time.interceptor';
import { LLMService, LLMConfigurationService } from './llm';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@quantumdeal/db';

@Module({
  imports: [ConfigModule, DbModule],
  providers: [
    FrameworkService,
    ResponseTimeInterceptor,

    LLMConfigurationService,
    LLMService,
  ],
  exports: [FrameworkService, LLMService, LLMConfigurationService],
})
export class FrameworkModule {}
