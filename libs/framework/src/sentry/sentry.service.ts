import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryService {
  /**
   * Capture an exception with optional context
   */
  captureException(
    exception: unknown,
    context?: Record<string, unknown>,
  ): string {
    return Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional_context', context);
      }
      return Sentry.captureException(exception);
    });
  }

  /**
   * Capture a message with optional context
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: Record<string, unknown>,
  ): string {
    return Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional_context', context);
      }
      scope.setLevel(level);
      return Sentry.captureMessage(message);
    });
  }

  /**
   * Add breadcrumb for tracking user actions
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: Sentry.User): void {
    Sentry.setUser(user);
  }

  /**
   * Set custom tags
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, unknown>): void {
    Sentry.setContext(key, context);
  }

  /**
   * Start a new transaction for performance monitoring
   */
  startTransaction(context: {
    name: string;
    op?: string;
    data?: Record<string, unknown>;
  }): { name: string; op?: string; data?: Record<string, unknown> } {
    // Use span-based approach for newer Sentry versions
    return Sentry.withScope((scope) => {
      scope.setTag('transaction_name', context.name);
      if (context.op) {
        scope.setTag('operation', context.op);
      }
      if (context.data) {
        scope.setContext('transaction_data', context.data);
      }
      return { name: context.name, op: context.op, data: context.data };
    });
  }

  /**
   * Get the current span/transaction (compatibility method)
   */
  getCurrentTransaction(): unknown {
    return Sentry.getActiveSpan();
  }

  /**
   * Track Telegram bot user interactions
   */
  trackTelegramUser(telegramUser: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): void {
    this.setUser({
      id: String(telegramUser.id),
      username: telegramUser.username,
      name:
        [telegramUser.firstName, telegramUser.lastName]
          .filter(Boolean)
          .join(' ') || undefined,
    });

    this.setTag('user_type', 'telegram');
    this.setContext('telegram_user', {
      id: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.firstName,
      lastName: telegramUser.lastName,
    });
  }

  /**
   * Track webhook events
   */
  trackWebhookEvent(eventType: string, data?: Record<string, unknown>): void {
    this.addBreadcrumb({
      message: `Webhook event: ${eventType}`,
      category: 'webhook',
      level: 'info',
      data: data ? { event_data: data } : undefined,
    });

    this.setTag('event_type', eventType);
  }

  /**
   * Track database operations
   */
  trackDatabaseOperation(
    operation: string,
    table: string,
    duration?: number,
  ): void {
    this.addBreadcrumb({
      message: `Database ${operation} on ${table}`,
      category: 'db',
      level: 'info',
      data: {
        operation,
        table,
        ...(duration && { duration_ms: duration }),
      },
    });
  }

  /**
   * Track API calls to external services
   */
  trackExternalApiCall(
    service: string,
    endpoint: string,
    method: string,
    statusCode?: number,
  ): void {
    this.addBreadcrumb({
      message: `API call to ${service}: ${method} ${endpoint}`,
      category: 'api',
      level: statusCode && statusCode >= 400 ? 'warning' : 'info',
      data: {
        service,
        endpoint,
        method,
        ...(statusCode && { status_code: statusCode }),
      },
    });
  }

  /**
   * Flush all pending events to Sentry
   * Useful before application shutdown
   */
  async flush(timeout = 5000): Promise<boolean> {
    return Sentry.flush(timeout);
  }

  /**
   * Close the Sentry client
   * Should be called on application shutdown
   */
  async close(timeout = 5000): Promise<boolean> {
    return Sentry.close(timeout);
  }
}
