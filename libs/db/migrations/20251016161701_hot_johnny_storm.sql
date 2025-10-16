CREATE TABLE "subscription_features" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscription_features_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"subscription_id" bigint NOT NULL,
	"feature_key" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_subscription_feature" UNIQUE("subscription_id","feature_key")
);
--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "activated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "activated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "expires_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "subscription_features" ADD CONSTRAINT "subscription_features_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ============================================================================
-- Data Migration: Populate subscription_features for existing subscriptions
-- ============================================================================
--
-- This section migrates existing active signal subscriptions to the new
-- feature flags system. It assigns features based on subscription tier:
--
-- Feature Assignment Logic:
-- - VIP tier (subscription.id = 3):
--   * TIER_BASED_FILTERING: System-controlled filtering by tier
--   * CUSTOM_USER_FILTERING: User-configurable filtering preferences
--
-- - Basic tier (other active signal subscriptions):
--   * TIER_BASED_FILTERING: Basic signal filtering
--
-- Configuration Migration:
-- - For TIER_BASED_FILTERING features, migrates subscription.scope → config.sectors
-- - Uses JSONB to store configuration data
--
-- Idempotency:
-- - Uses ON CONFLICT DO NOTHING to safely re-run this migration
-- - Unique constraint on (subscription_id, feature_key) prevents duplicates
--
-- ============================================================================

-- Step 1: Insert TIER_BASED_FILTERING feature for VIP tier (id=3)
-- Migrates scope to config.sectors if scope exists
INSERT INTO "subscription_features" (
    "subscription_id",
    "feature_key",
    "is_enabled",
    "config"
)
SELECT
    s.id,
    'tier_based_filtering',
    true,
    CASE
        WHEN s.scope IS NOT NULL THEN jsonb_build_object('sectors', s.scope)
        ELSE '{}'::jsonb
    END
FROM "subscriptions" s
WHERE s.id = 3
    AND s.is_active = true
    AND s.type = 'signals'
ON CONFLICT ("subscription_id", "feature_key") DO NOTHING;

-- Step 2: Insert CUSTOM_USER_FILTERING feature for VIP tier (id=3)
INSERT INTO "subscription_features" (
    "subscription_id",
    "feature_key",
    "is_enabled",
    "config"
)
SELECT
    s.id,
    'custom_user_filtering',
    true,
    '{}'::jsonb
FROM "subscriptions" s
WHERE s.id = 3
    AND s.is_active = true
    AND s.type = 'signals'
ON CONFLICT ("subscription_id", "feature_key") DO NOTHING;

-- Step 3: Insert TIER_BASED_FILTERING feature for Basic tier (non-VIP signal subscriptions)
-- Migrates scope to config.sectors if scope exists
INSERT INTO "subscription_features" (
    "subscription_id",
    "feature_key",
    "is_enabled",
    "config"
)
SELECT
    s.id,
    'tier_based_filtering',
    true,
    CASE
        WHEN s.scope IS NOT NULL THEN jsonb_build_object('sectors', s.scope)
        ELSE '{}'::jsonb
    END
FROM "subscriptions" s
WHERE s.id != 3
    AND s.is_active = true
    AND s.type = 'signals'
ON CONFLICT ("subscription_id", "feature_key") DO NOTHING;