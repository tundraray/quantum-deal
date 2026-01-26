-- Migration: Add botUserId to user_subscription_features
-- Description: Adds bot_user_id column to user_subscription_features table for multi-bot support
-- Prerequisite: 20251126200000_seed_default_bot.sql (creates bot_users for existing users)
-- Prerequisite: 20251202221748_elite_piledriver.sql (similar migration for user_subscriptions)
-- ADR Reference: ADR-009-user-subscriptions-bot-users-migration.md

-- ==========================================
-- Phase 1: Add bot_user_id column (nullable initially)
-- ==========================================
ALTER TABLE "user_subscription_features" ADD COLUMN "bot_user_id" bigint;--> statement-breakpoint

-- ==========================================
-- Phase 2: Create missing bot_users records for orphaned feature settings
-- ==========================================
-- Any user_subscription_features record without a corresponding bot_users record
-- needs one created. Uses default bot (QuantumDealBot) for existing records.
INSERT INTO bot_users (user_id, bot_id, lang, is_active)
SELECT DISTINCT
  usf.user_id,
  (SELECT id FROM bots WHERE name = 'QuantumDealBot' LIMIT 1),
  COALESCE(u.lang, 'en'),
  COALESCE(u.is_active, true)
FROM user_subscription_features usf
JOIN users u ON u.telegram_id = usf.user_id
LEFT JOIN bot_users bu ON bu.user_id = usf.user_id
  AND bu.bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot' LIMIT 1)
WHERE bu.id IS NULL;--> statement-breakpoint

-- ==========================================
-- Phase 3: Populate bot_user_id from existing bot_users
-- ==========================================
UPDATE user_subscription_features usf
SET bot_user_id = bu.id
FROM bot_users bu
WHERE bu.user_id = usf.user_id
  AND bu.bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot' LIMIT 1);--> statement-breakpoint

-- ==========================================
-- Phase 4: Add FK constraint (after data is populated)
-- ==========================================
ALTER TABLE "user_subscription_features"
ADD CONSTRAINT "user_subscription_features_bot_user_id_bot_users_id_fk"
FOREIGN KEY ("bot_user_id") REFERENCES "public"."bot_users"("id")
ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- ==========================================
-- Phase 5: Create index for query performance
-- ==========================================
CREATE INDEX IF NOT EXISTS "idx_user_subscription_features_bot_user"
ON "user_subscription_features" USING btree ("bot_user_id");

-- ==========================================
-- Post-migration verification (run manually)
-- ==========================================
-- Check all records have bot_user_id populated:
-- SELECT COUNT(*) FROM user_subscription_features WHERE bot_user_id IS NULL;
-- Expected: 0
--
-- Verify FK relationship:
-- SELECT usf.id, usf.user_id, usf.bot_user_id, bu.user_id as bu_user_id
-- FROM user_subscription_features usf
-- LEFT JOIN bot_users bu ON bu.id = usf.bot_user_id
-- WHERE bu.id IS NULL;
-- Expected: 0 rows
