import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';

interface RequestLike {
  method: string;
  url: string;
  route?: { path: string };
}

interface ResponseLike {
  statusCode: number;
}

@Injectable()
export class SentryPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SentryPerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestLike>();
    const response = httpContext.getResponse<ResponseLike>();

    // Create a transaction for performance monitoring
    const transactionName = this.getTransactionName(context, request);

    // Use modern Sentry approach with spans
    Sentry.withScope((scope) => {
      scope.setTag('transaction_name', transactionName);
      scope.setTag('operation', 'http.server');
      scope.setContext('request_data', {
        method: request.method,
        url: request.url,
        route: request.route?.path,
      });
    });

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        // Add breadcrumb for successful requests
        Sentry.addBreadcrumb({
          message: `${request.method} ${request.url}`,
          category: 'http',
          level: 'info',
          data: {
            method: request.method,
            url: request.url,
            status_code: response.statusCode,
            duration_ms: duration,
          },
        });

        // Set additional context for the response
        Sentry.withScope((scope) => {
          scope.setContext('response', {
            status_code: response.statusCode,
            duration_ms: duration,
          });
        });

        // Log slow requests
        if (duration > 5000) {
          // 5 seconds
          this.logger.warn(
            `Slow request detected: ${request.method} ${request.url} took ${duration}ms`,
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Add error breadcrumb
        Sentry.addBreadcrumb({
          message: `Error in ${request.method} ${request.url}`,
          category: 'http',
          level: 'error',
          data: {
            method: request.method,
            url: request.url,
            duration_ms: duration,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        // Set error context
        Sentry.withScope((scope) => {
          scope.setContext('error_response', {
            duration_ms: duration,
            error_message:
              error instanceof Error ? error.message : String(error),
          });
        });

        // Re-throw the error to continue normal error handling
        throw error;
      }),
    );
  }

  private getTransactionName(
    context: ExecutionContext,
    request: RequestLike,
  ): string {
    const handler = context.getHandler().name;
    const className = context.getClass().name;

    // Try to use route path if available
    if (request.route?.path) {
      return `${request.method} ${request.route.path}`;
    }

    // Fallback to controller and handler names
    return `${className}.${handler}`;
  }
}
