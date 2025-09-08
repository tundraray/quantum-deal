import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';

@Injectable()
@Catch()
export class SentryGlobalExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  private readonly logger = new Logger(SentryGlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    // Determine if this is an HTTP exception
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Add request context to Sentry
    Sentry.withScope((scope) => {
      // Set user context if available
      const requestWithUser = request as Request & {
        user?: { id?: unknown; userId?: unknown; username?: string };
      };
      if (requestWithUser.user) {
        scope.setUser({
          id:
            String(requestWithUser.user.id) ||
            String(requestWithUser.user.userId) ||
            'unknown',
          username: requestWithUser.user.username,
        });
      }

      // Set request context
      scope.setTag('url', request.url);
      scope.setTag('method', request.method);
      scope.setTag('status_code', status);
      scope.setContext('request', {
        url: request.url,
        method: request.method,
        headers: this.filterSensitiveHeaders(
          request.headers as Record<string, unknown>,
        ),
        query: request.query,
        params: request.params,
        user_agent: request.get('User-Agent'),
        ip: request.ip,
      });

      // Set different levels based on error type
      if (status >= 500) {
        scope.setLevel('error');
        Sentry.captureException(exception);
        this.logger.error(
          `Internal server error: ${String(exception)}`,
          exception instanceof Error ? exception.stack : undefined,
        );
      } else if (status >= 400) {
        scope.setLevel('warning');
        // Only capture 4xx errors that might be important
        if (status === 401 || status === 403 || status === 429) {
          Sentry.captureException(exception);
        }
        this.logger.warn(`Client error ${status}: ${String(exception)}`);
      } else {
        scope.setLevel('info');
      }
    });

    // Call the base exception filter to handle the response
    super.catch(exception, host);
  }

  private filterSensitiveHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const filtered = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
    ];

    sensitiveHeaders.forEach((header) => {
      if (filtered[header]) {
        filtered[header] = '[FILTERED]';
      }
    });

    return filtered;
  }
}
