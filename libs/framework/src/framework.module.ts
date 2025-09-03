import { Module } from '@nestjs/common';
import { FrameworkService } from './framework.service';
import { ReverseTextPipe } from './pipes/reverse-text.pipe';
import { ResponseTimeInterceptor } from './interceptors/response-time.interceptor';
import { LLMService, LLMConfigurationService } from './llm';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@quantumdeal/db';

@Module({
  imports: [ConfigModule, DbModule],
  providers: [
    FrameworkService,
    ReverseTextPipe,
    ResponseTimeInterceptor,

    LLMConfigurationService,
    LLMService,
  ],
  exports: [
    FrameworkService,
    ReverseTextPipe,
    LLMService,
    LLMConfigurationService,
  ],
})
export class FrameworkModule {}
