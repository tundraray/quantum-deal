// Import and initialize Sentry before any other imports
import * as Sentry from '@sentry/nestjs';
import { createSentryConfig } from '@quantumdeal/framework';

// Initialize Sentry early in the application lifecycle
if (process.env.SENTRY_DSN) {
  Sentry.init(
    createSentryConfig({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE,
      debug: process.env.NODE_ENV === 'development',
      enableTracing: process.env.SENTRY_ENABLE_TRACING === 'true',
      enableProfiling: process.env.SENTRY_ENABLE_PROFILING === 'true',
      sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0',
      ),
      profilesSampleRate: parseFloat(
        process.env.SENTRY_PROFILES_SAMPLE_RATE || '1.0',
      ),
    }),
  );
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Enable shutdown hooks for graceful shutdown
    app.enableShutdownHooks();

    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    logger.log(`Application is running on port ${port}`);

    // Add Sentry context for application start
    if (process.env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message: 'Application started successfully',
        level: 'info',
        category: 'app.lifecycle',
        data: { port, environment: process.env.NODE_ENV },
      });
    }
  } catch (error) {
    logger.error('Failed to start application', error);

    // Capture startup errors in Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }

    process.exit(1);
  }
}

void bootstrap();
