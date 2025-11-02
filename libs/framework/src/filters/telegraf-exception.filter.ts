import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { TelegrafArgumentsHost } from 'nestjs-telegraf';
import { Context } from '../interfaces/context.interface';
import { SentryService } from '../sentry/sentry.service';

@Catch()
export class TelegrafExceptionFilter implements ExceptionFilter {
  constructor(private readonly sentryService: SentryService) {}

  catch(exception: Error, host: ArgumentsHost): void {
    const telegrafHost = TelegrafArgumentsHost.create(host);
    const ctx = telegrafHost.getContext<Context>();

    this.sentryService.captureException(exception, {
      context: {
        user: ctx.from?.id,
      },
      extra: {
        user: ctx.from?.id,
      },
    });
  }
}
