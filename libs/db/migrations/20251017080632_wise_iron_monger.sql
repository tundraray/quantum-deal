CREATE TABLE "user_subscription_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"feature_key" varchar(50) NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_feature" UNIQUE("user_id","feature_key")
);
--> statement-breakpoint
ALTER TABLE "user_subscription_features" ADD CONSTRAINT "user_subscription_features_user_id_users_telegram_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("telegram_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ============================================================================
-- Performance Indexes for user_subscription_features
-- ============================================================================
-- These indexes optimize user settings queries:
-- 1. Load all settings for a user (by user_id)
-- 2. Find users with specific feature configured (by feature_key)
-- 3. Filter only active settings (by is_active)
-- 4. Query JSONB settings field (GIN index for JSON queries)
-- ============================================================================

-- Index for fast user settings lookups
CREATE INDEX IF NOT EXISTS "idx_user_subscription_features_user_id"
  ON "user_subscription_features"("user_id");
--> statement-breakpoint
-- Index for feature key lookups
CREATE INDEX IF NOT EXISTS "idx_user_subscription_features_feature_key"
  ON "user_subscription_features"("feature_key");
--> statement-breakpoint
-- Index for active settings queries
CREATE INDEX IF NOT EXISTS "idx_user_subscription_features_active"
  ON "user_subscription_features"("user_id", "is_active");
--> statement-breakpoint
-- GIN index for JSONB settings queries (e.g., searching within symbols array)
CREATE INDEX IF NOT EXISTS "idx_user_subscription_features_jsonb"
  ON "user_subscription_features" USING GIN("settings");