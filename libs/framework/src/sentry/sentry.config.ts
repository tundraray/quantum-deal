import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { NodeOptions } from '@sentry/nestjs';

export interface SentryConfigOptions {
  dsn: string;
  environment: string;
  release?: string;
  debug?: boolean;
  enableTracing?: boolean;
  enableProfiling?: boolean;
  sampleRate?: number;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

export function createSentryConfig(options: SentryConfigOptions): NodeOptions {
  const {
    dsn,
    environment,
    release,
    debug = environment === 'development',
    enableTracing = true,
    enableProfiling = environment === 'production',
    sampleRate = environment === 'production' ? 0.1 : 1.0,
    tracesSampleRate = environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate = environment === 'production' ? 0.1 : 1.0,
  } = options;

  const integrations: any[] = [];

  // Add profiling integration if enabled
  if (enableProfiling) {
    integrations.push(nodeProfilingIntegration());
  }

  const config: NodeOptions = {
    dsn,
    environment,
    debug,
    sampleRate,
    integrations,

    // Release tracking
    ...(release && { release }),

    // Performance monitoring
    ...(enableTracing && {
      tracesSampleRate,
      profilesSampleRate: enableProfiling ? profilesSampleRate : 0,
    }),

    // Error filtering
    beforeSend(event) {
      // Filter out development noise
      if (environment === 'development') {
        // Don't send certain types of errors in development
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (
            error?.type === 'ValidationError' ||
            error?.type === 'BadRequestException'
          ) {
            return null;
          }
        }
      }
      return event;
    },

    // Breadcrumbs configuration
    beforeBreadcrumb(breadcrumb) {
      // Filter sensitive data from breadcrumbs
      if (breadcrumb.category === 'http' && breadcrumb.data) {
        // Remove sensitive headers
        if (
          breadcrumb.data.headers &&
          typeof breadcrumb.data.headers === 'object'
        ) {
          const headers = breadcrumb.data.headers as Record<string, unknown>;
          delete headers.authorization;
          delete headers['x-api-key'];
        }
      }
      return breadcrumb;
    },

    // Transaction naming for better performance insights
    beforeSendTransaction(event) {
      // Clean up transaction names
      if (event.transaction) {
        // Remove IDs from transaction names for better grouping
        event.transaction = event.transaction.replace(/\/\d+/g, '/:id');
        event.transaction = event.transaction.replace(
          /\/[a-f0-9]{24}/g,
          '/:id',
        );
      }
      return event;
    },

    // Tags for better organization
    initialScope: {
      tags: {
        component: 'telegram-bot',
        framework: 'nestjs',
      },
    },
  };

  return config;
}
