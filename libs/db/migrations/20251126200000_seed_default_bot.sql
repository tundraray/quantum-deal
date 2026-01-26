-- Migration: Seed Default Bot
-- Description: Creates the default QuantumDealBot with settings and populates botId for existing records
-- Author: System
-- Date: 2025-11-26
-- Task Reference: 20251126-feature-multi-bot-database-schema-task-4-1.md

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- This migration seeds the default bot (QuantumDealBot) for backward compatibility.
-- It creates:
--   1. Default bot record in bots table
--   2. Default bot_settings with standard feature flags
--   3. Updates existing user_subscriptions with the default botId
--   4. Updates existing codes with the default botId
--   5. Creates bot_users entries for all existing users

DO $$
DECLARE
  v_bot_id bigint;
  v_users_count integer;
  v_subscriptions_updated integer;
  v_codes_updated integer;
  v_bot_users_created integer;
BEGIN
  -- Check if default bot already exists
  SELECT id INTO v_bot_id
  FROM bots
  WHERE name = 'QuantumDealBot';

  -- Only proceed if bot doesn't exist
  IF v_bot_id IS NULL THEN
    -- ==========================================
    -- 1. Create default bot
    -- ==========================================
    -- Token is a placeholder - MUST be updated with real token from environment
    -- isDynamic = false because this is the static bot managed by nest-telegraf
    INSERT INTO bots (token, name, username, webhook_path, is_dynamic, is_active)
    VALUES (
      'PLACEHOLDER_TOKEN_UPDATE_ME',  -- Will be updated by application startup
      'QuantumDealBot',
      'QuantumDealBot',
      '/bot',
      false,  -- Static bot, not dynamic
      true    -- Active
    )
    RETURNING id INTO v_bot_id;

    RAISE NOTICE 'Created default bot (QuantumDealBot) with ID: %', v_bot_id;

    -- ==========================================
    -- 2. Create default bot_settings
    -- ==========================================
    -- Settings match DEFAULT_BOT_SETTINGS from bot-settings.ts schema
    INSERT INTO bot_settings (bot_id, settings)
    VALUES (
      v_bot_id,
      '{
        "features": {
          "trialEnabled": true,
          "paymentsEnabled": true,
          "signalsEnabled": true,
          "broadcastEnabled": false
        },
        "defaults": {
          "subscriptionDays": 30,
          "trialDays": 7,
          "language": "en"
        }
      }'::jsonb
    );

    RAISE NOTICE 'Created default bot_settings for bot ID: %', v_bot_id;

    -- ==========================================
    -- 3. Update existing user_subscriptions with botId
    -- ==========================================
    UPDATE user_subscriptions
    SET bot_id = v_bot_id
    WHERE bot_id IS NULL;

    GET DIAGNOSTICS v_subscriptions_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % user_subscriptions with default botId', v_subscriptions_updated;

    -- ==========================================
    -- 4. Update existing codes with botId
    -- ==========================================
    UPDATE codes
    SET bot_id = v_bot_id
    WHERE bot_id IS NULL;

    GET DIAGNOSTICS v_codes_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % codes with default botId', v_codes_updated;

    -- ==========================================
    -- 5. Create bot_users for existing users
    -- ==========================================
    -- Copy user preferences (lang, is_active) to bot_users table
    INSERT INTO bot_users (user_id, bot_id, lang, is_active)
    SELECT u.telegram_id, v_bot_id, u.lang, u.is_active
    FROM users u
    ON CONFLICT (user_id, bot_id) DO NOTHING;

    GET DIAGNOSTICS v_bot_users_created = ROW_COUNT;
    RAISE NOTICE 'Created % bot_users entries for existing users', v_bot_users_created;

    -- ==========================================
    -- Summary
    -- ==========================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Default bot seed completed successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bot ID: %', v_bot_id;
    RAISE NOTICE 'User subscriptions updated: %', v_subscriptions_updated;
    RAISE NOTICE 'Codes updated: %', v_codes_updated;
    RAISE NOTICE 'Bot users created: %', v_bot_users_created;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'IMPORTANT: Update bot token in bots table with real TELEGRAM_BOT_TOKEN';

  ELSE
    RAISE NOTICE 'Default bot (QuantumDealBot) already exists with ID: %. Skipping seed.', v_bot_id;
  END IF;
END $$;

-- ==========================================
-- DOWN MIGRATION
-- ==========================================

-- To rollback this seed:
-- 1. Delete bot_users for the default bot (CASCADE will handle this)
-- 2. Set bot_id to NULL in user_subscriptions and codes
-- 3. Delete bot_settings (CASCADE will handle this)
-- 4. Delete the default bot

-- WARNING: This will break FK constraints if records reference the bot!
-- Only use if you understand the consequences.

-- Rollback commands (do not run automatically):
-- UPDATE user_subscriptions SET bot_id = NULL WHERE bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot');
-- UPDATE codes SET bot_id = NULL WHERE bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot');
-- DELETE FROM bots WHERE name = 'QuantumDealBot';
-- Note: CASCADE will automatically delete bot_settings and bot_users
