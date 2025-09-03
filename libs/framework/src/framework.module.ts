import { Module } from '@nestjs/common';
import { FrameworkService } from './framework.service';
import { ReverseTextPipe } from './pipes/reverse-text.pipe';
import { ResponseTimeInterceptor } from './interceptors/response-time.interceptor';

@Module({
  providers: [FrameworkService, ReverseTextPipe, ResponseTimeInterceptor],
  exports: [FrameworkService, ReverseTextPipe],
})
export class FrameworkModule {}
