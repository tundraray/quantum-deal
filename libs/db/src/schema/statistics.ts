import {
  integer,
  numeric,
  real,
  timestamp,
  pgMaterializedView,
} from 'drizzle-orm/pg-core';

/**
 * Monthly Bot Statistics Materialized View
 *
 * Caches monthly statistics for bot onboarding display.
 * This view is refreshed every 15 minutes via a cron job.
 *
 * Business Rules:
 * - Only includes closed deals (closed_at IS NOT NULL)
 * - Aggregates data for the current month
 * - Provides real-time statistics for onboarding flow
 *
 * Performance:
 * - Materialized view for fast query performance
 * - Index on period_start for efficient lookups
 * - Refreshed via cron job (see migration for details)
 */
export const monthlyBotStatistics = pgMaterializedView(
  'monthly_bot_statistics',
  {
    totalDeals: integer('total_deals').notNull(),
    totalProfit: numeric('total_profit').notNull(),
    winRate: real('win_rate').notNull(),
    activeTraders: integer('active_traders').notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull(),
  },
);

/**
 * TypeScript Types
 */
export type MonthlyBotStatistics = typeof monthlyBotStatistics;
