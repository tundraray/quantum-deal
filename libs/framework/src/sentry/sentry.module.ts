import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryGlobalExceptionFilter } from './sentry.filter';
import { SentryPerformanceInterceptor } from './sentry.interceptor';
import { SentryService } from './sentry.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    SentryService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryPerformanceInterceptor,
    },
  ],
  exports: [
    SentryService,
    SentryGlobalExceptionFilter,
    SentryPerformanceInterceptor,
  ],
})
export class SentryModule {}
