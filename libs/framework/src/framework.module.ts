import { Module } from '@nestjs/common';
import { FrameworkService } from './framework.service';
import { ReverseTextPipe } from './pipes/reverse-text.pipe';
import { ResponseTimeInterceptor } from './interceptors/response-time.interceptor';
import { LLMService } from './llm';

@Module({
  providers: [
    FrameworkService,
    ReverseTextPipe,
    ResponseTimeInterceptor,
    LLMService,
  ],
  exports: [FrameworkService, ReverseTextPipe],
})
export class FrameworkModule {}
