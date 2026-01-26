ALTER TABLE "user_subscription_features" DROP CONSTRAINT "unique_user_feature";--> statement-breakpoint
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_user_id_users_telegram_id_fk";
--> statement-breakpoint
ALTER TABLE "user_subscription_features" DROP CONSTRAINT "user_subscription_features_user_id_users_telegram_id_fk";
--> statement-breakpoint
ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_user_id_users_telegram_id_fk";
--> statement-breakpoint
DROP INDEX "idx_payment_transactions_user_id";--> statement-breakpoint
DROP INDEX "idx_user_subscriptions_user_bot";--> statement-breakpoint
ALTER TABLE "payment_transactions" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "user_subscription_features" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "user_subscriptions" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "user_subscription_features" ADD CONSTRAINT "unique_bot_user_feature" UNIQUE("bot_user_id","feature_key");