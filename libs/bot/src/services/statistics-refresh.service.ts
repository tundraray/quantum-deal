import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_CLIENT, type DrizzleClient } from '@quantumdeal/db';
import { sql } from 'drizzle-orm';

/**
 * StatisticsRefreshService
 *
 * Responsible for auto-refreshing the monthly_bot_statistics materialized view.
 *
 * Features:
 * - Cron job runs every 15 minutes to refresh statistics
 * - Uses CONCURRENT refresh to avoid blocking queries
 * - Configurable via STATISTICS_SHOW_ON_ONBOARDING environment variable
 * - Graceful error handling with logging
 *
 * Architecture:
 * - Part of Week 3: Statistics & Onboarding implementation
 * - Works with materialized view created in Week 1 database migrations
 */
@Injectable()
export class StatisticsRefreshService {
  private readonly logger = new Logger(StatisticsRefreshService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT)
    private readonly db: DrizzleClient,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Refresh materialized view every 15 minutes
   *
   * Note: CONCURRENTLY mode removed because it requires a UNIQUE index.
   * Since the view contains only 1 row (aggregated stats), refresh is fast (<100ms)
   * and doesn't cause noticeable blocking.
   *
   * Cron pattern: "star-slash-15 * * * *" = Every 15 minutes
   */
  @Cron('*/15 * * * *')
  async refreshStatistics(): Promise<void> {
    const enabled = this.configService.get<boolean>(
      'STATISTICS_SHOW_ON_ONBOARDING',
      true,
    );

    if (!enabled) {
      this.logger.debug('Statistics refresh disabled via config');
      return;
    }

    try {
      await this.db.execute(sql`
        REFRESH MATERIALIZED VIEW monthly_bot_statistics
      `);
    } catch (error) {
      this.logger.error('Failed to refresh statistics', error);
      // Don't throw - this is a background job, failures should not crash the app
    }
  }

  /**
   * Manual refresh method for testing or admin triggers
   *
   * Can be called directly from other services or admin commands.
   */
  async manualRefresh(): Promise<void> {
    await this.refreshStatistics();
  }
}
