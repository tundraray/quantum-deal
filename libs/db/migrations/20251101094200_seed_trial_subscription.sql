-- Migration: Seed Trial Subscription
-- Description: Creates a 7-day free trial subscription with renewal tariff and feature flag
-- Author: System
-- Date: 2025-11-01

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- Insert trial subscription (only if it doesn't exist)
DO $$
DECLARE
  v_subscription_id bigint;
BEGIN
  -- Check if trial subscription already exists
  SELECT id INTO v_subscription_id
  FROM subscriptions
  WHERE name = 'Trial 7 Days' AND type = 'signals';

  -- Only insert if it doesn't exist
  IF v_subscription_id IS NULL THEN
    -- Insert subscription
    INSERT INTO subscriptions (name, type, is_hidden)
    VALUES ('Trial 7 Days', 'signals', true)
    RETURNING id INTO v_subscription_id;

    -- Insert renewal tariff for trial (7 days, 0 stars)
    INSERT INTO renewal_tariffs (
      subscription_id,
      period_days,
      price_stars,
      display_name,
      discount_percent,
      is_active,
      sort_order
    )
    VALUES (
      v_subscription_id,
      7,
      0,
      'Trial 7 Days',
      NULL,
      true,
      0
    );

    -- Insert feature flag to mark this as a trial subscription
    INSERT INTO subscription_features (
      subscription_id,
      feature_key,
      is_enabled,
      config
    )
    VALUES (
      v_subscription_id,
      'is_trial',
      true,
      '{}'::jsonb
    );

    RAISE NOTICE 'Trial subscription created with ID: %', v_subscription_id;
  ELSE
    RAISE NOTICE 'Trial subscription already exists with ID: %', v_subscription_id;
  END IF;
END $$;

-- ==========================================
-- DOWN MIGRATION
-- ==========================================

-- To rollback, delete the trial subscription and cascade to related records:
-- DELETE FROM subscriptions WHERE name = 'Trial 7 Days' AND type = 'signals';
-- Note: This will cascade delete renewal_tariffs and subscription_features due to foreign key constraints
