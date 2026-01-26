-- Migration: Add botUserId to payment_transactions
-- Description: Adds bot_user_id column to payment_transactions table for multi-bot support
-- Prerequisite: 20251126200000_seed_default_bot.sql (creates bot_users for existing users)
-- Pattern Reference: 20251203002433_fat_clint_barton.sql (user_subscription_features migration)

-- ==========================================
-- Phase 1: Add bot_user_id column (nullable initially)
-- ==========================================
ALTER TABLE "payment_transactions" ADD COLUMN "bot_user_id" bigint;--> statement-breakpoint

-- ==========================================
-- Phase 2: Create missing bot_users records for orphaned payment transactions
-- ==========================================
-- Any payment_transactions record without a corresponding bot_users record
-- needs one created. Uses default bot (QuantumDealBot) for existing records.
INSERT INTO bot_users (user_id, bot_id, lang, is_active)
SELECT DISTINCT
  pt.user_id,
  (SELECT id FROM bots WHERE name = 'QuantumDealBot' LIMIT 1),
  COALESCE(u.lang, 'en'),
  COALESCE(u.is_active, true)
FROM payment_transactions pt
JOIN users u ON u.telegram_id = pt.user_id
LEFT JOIN bot_users bu ON bu.user_id = pt.user_id
  AND bu.bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot' LIMIT 1)
WHERE bu.id IS NULL;--> statement-breakpoint

-- ==========================================
-- Phase 3: Populate bot_user_id from existing bot_users
-- ==========================================
UPDATE payment_transactions pt
SET bot_user_id = bu.id
FROM bot_users bu
WHERE bu.user_id = pt.user_id
  AND bu.bot_id = (SELECT id FROM bots WHERE name = 'QuantumDealBot' LIMIT 1);--> statement-breakpoint

-- ==========================================
-- Phase 4: Add FK constraint (after data is populated)
-- ==========================================
ALTER TABLE "payment_transactions"
ADD CONSTRAINT "payment_transactions_bot_user_id_bot_users_id_fk"
FOREIGN KEY ("bot_user_id") REFERENCES "public"."bot_users"("id")
ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- ==========================================
-- Phase 5: Create index for query performance
-- ==========================================
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_bot_user"
ON "payment_transactions" USING btree ("bot_user_id");

-- ==========================================
-- Post-migration verification (run manually)
-- ==========================================
-- Check all records have bot_user_id populated:
-- SELECT COUNT(*) FROM payment_transactions WHERE bot_user_id IS NULL;
-- Expected: 0
--
-- Verify FK relationship:
-- SELECT pt.id, pt.user_id, pt.bot_user_id, bu.user_id as bu_user_id
-- FROM payment_transactions pt
-- LEFT JOIN bot_users bu ON bu.id = pt.bot_user_id
-- WHERE bu.id IS NULL;
-- Expected: 0 rows
