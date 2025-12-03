-- Migration: Add botUserId to user_subscriptions
-- ADR-009: User Subscriptions Migration from users to bot_users
-- Prerequisite: Ensure 20251126200000_seed_default_bot.sql has been executed
--               (creates bot_users for all existing users with default bot)

-- Phase 1: Add nullable column
ALTER TABLE "user_subscriptions" ADD COLUMN "bot_user_id" bigint;--> statement-breakpoint

-- Phase 2: Create missing bot_users for orphaned subscriptions
-- This handles subscriptions where no bot_users record exists for the (userId, botId) pair
INSERT INTO bot_users (user_id, bot_id, is_active, created_at, updated_at)
SELECT DISTINCT us.user_id, us.bot_id, true, NOW(), NOW()
FROM user_subscriptions us
LEFT JOIN bot_users bu ON bu.user_id = us.user_id AND bu.bot_id = us.bot_id
WHERE bu.id IS NULL AND us.bot_id IS NOT NULL;--> statement-breakpoint

-- Phase 3: Populate bot_user_id from bot_users
UPDATE user_subscriptions us
SET bot_user_id = bu.id
FROM bot_users bu
WHERE us.user_id = bu.user_id AND us.bot_id = bu.bot_id;--> statement-breakpoint

-- Phase 4: Add FK constraint (after data is populated)
ALTER TABLE "user_subscriptions"
ADD CONSTRAINT "user_subscriptions_bot_user_id_bot_users_id_fk"
FOREIGN KEY ("bot_user_id")
REFERENCES "public"."bot_users"("id")
ON DELETE cascade
ON UPDATE no action;--> statement-breakpoint

-- Phase 5: Create index for query performance
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_bot_user"
ON "user_subscriptions" USING btree ("bot_user_id");

-- Phase 6: Make NOT NULL (optional - run after verification)
-- Uncomment after verifying all records have bot_user_id populated:
-- ALTER TABLE "user_subscriptions" ALTER COLUMN "bot_user_id" SET NOT NULL;

-- Verification queries (run after migration):
-- SELECT COUNT(*) FROM user_subscriptions WHERE bot_user_id IS NULL AND bot_id IS NOT NULL;
-- Expected: 0
--
-- SELECT COUNT(*) FROM user_subscriptions us
-- LEFT JOIN bot_users bu ON us.bot_user_id = bu.id
-- WHERE us.bot_user_id IS NOT NULL AND bu.id IS NULL;
-- Expected: 0
