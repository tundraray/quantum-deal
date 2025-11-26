CREATE TABLE "bot_messages" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bot_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bot_id" bigint NOT NULL,
	"type" varchar(50) NOT NULL,
	"lang" varchar(10) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_bot_messages_bot_type_lang" UNIQUE("bot_id","type","lang")
);
--> statement-breakpoint
CREATE TABLE "bot_settings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bot_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bot_id" bigint NOT NULL,
	"settings" jsonb DEFAULT '{"features":{"trialEnabled":true,"paymentsEnabled":true,"signalsEnabled":true,"broadcastEnabled":false},"defaults":{"subscriptionDays":30,"trialDays":7,"language":"en"}}'::jsonb NOT NULL,
	"payment_settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_settings_bot_id_unique" UNIQUE("bot_id")
);
--> statement-breakpoint
CREATE TABLE "bot_users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bot_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"bot_id" bigint NOT NULL,
	"lang" varchar(10),
	"preferences" jsonb,
	"state" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_bot_users_user_bot" UNIQUE("user_id","bot_id")
);
--> statement-breakpoint
CREATE TABLE "bots" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"token" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"username" varchar(100),
	"webhook_path" varchar(100),
	"is_dynamic" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bots_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "renewal_tariffs" DROP CONSTRAINT "uq_renewal_tariff_subscription_period";--> statement-breakpoint
ALTER TABLE "codes" ADD COLUMN "bot_id" bigint;--> statement-breakpoint
ALTER TABLE "renewal_tariffs" ADD COLUMN "bot_id" bigint;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "bot_id" bigint;--> statement-breakpoint
ALTER TABLE "bot_messages" ADD CONSTRAINT "bot_messages_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_settings" ADD CONSTRAINT "bot_settings_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_users" ADD CONSTRAINT "bot_users_user_id_users_telegram_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("telegram_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_users" ADD CONSTRAINT "bot_users_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_tariffs" ADD CONSTRAINT "renewal_tariffs_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_codes_bot" ON "codes" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "idx_renewal_tariffs_bot" ON "renewal_tariffs" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_bot" ON "user_subscriptions" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_user_bot" ON "user_subscriptions" USING btree ("user_id","bot_id");--> statement-breakpoint
ALTER TABLE "renewal_tariffs" ADD CONSTRAINT "uq_renewal_tariff_subscription_period_bot" UNIQUE("subscription_id","period_days","bot_id");

-- ============================================================
-- MANUAL ADDITIONS (Drizzle cannot generate these automatically)
-- ============================================================

-- FR-012: Partial unique index - prevents duplicate active subscriptions per user+subscription+bot
-- This allows historical records (is_active = false) to have duplicates
-- while ensuring only one active subscription per user+subscription+bot combination
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_subscriptions_active
  ON user_subscriptions(user_id, subscription_id, bot_id)
  WHERE is_active = true;