-- Migration: Create monthly_bot_statistics materialized view
-- Description: Caches statistics for the last 30 days for onboarding (closed deals only)
-- Author: System
-- Date: 2025-11-01

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- Drop existing view to ensure it's recreated with updated logic
DROP MATERIALIZED VIEW IF EXISTS monthly_bot_statistics;

-- Create materialized view for last 30 days statistics
CREATE MATERIALIZED VIEW monthly_bot_statistics AS
SELECT
  COUNT(*)::int as total_deals,
  COALESCE(SUM(profit), 0)::numeric as total_profit,
  COALESCE(
    COUNT(CASE WHEN profit > 0 THEN 1 END)::float / NULLIF(COUNT(*), 0),
    0
  ) as win_rate,
  COUNT(DISTINCT account)::int as active_traders,
  CURRENT_DATE - INTERVAL '30 days' as period_start,
  NOW() as last_updated
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND close_time IS NOT NULL  -- Only closed orders
;

-- Create index on period_start for faster lookups
CREATE INDEX IF NOT EXISTS idx_monthly_bot_statistics_period
  ON monthly_bot_statistics(period_start);

-- Grant SELECT permissions (adjust user as needed)
GRANT SELECT ON monthly_bot_statistics TO current_user;

-- Initial refresh
REFRESH MATERIALIZED VIEW monthly_bot_statistics;

-- Add comment for documentation
COMMENT ON MATERIALIZED VIEW monthly_bot_statistics IS
  'Cached statistics for the last 30 days for bot onboarding. Refreshed every 15 minutes via cron job. Only includes closed orders (close_time IS NOT NULL).';

-- ==========================================
-- DOWN MIGRATION
-- ==========================================

-- To rollback, drop the materialized view:
-- DROP MATERIALIZED VIEW IF EXISTS monthly_bot_statistics;
