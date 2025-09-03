import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    Logger.debug('Starting...');

    const start = Date.now();
    return next
      .handle()
      .pipe(tap(() => Logger.debug(`Response time: ${Date.now() - start}ms`)));
  }
}
