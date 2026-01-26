CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."promocode_type" AS ENUM('single_use', 'multi_use', 'system');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('days_after_expiration');--> statement-breakpoint
CREATE TABLE "promocode_activations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "promocode_activations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"promocode_id" bigint NOT NULL,
	"bot_user_id" bigint NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_promocode_activations_promocode_user" UNIQUE("promocode_id","bot_user_id")
);
--> statement-breakpoint
CREATE TABLE "promocodes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "promocodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" varchar(50) NOT NULL,
	"type" "promocode_type" NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"subscription_id" bigint NOT NULL,
	"bot_id" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_activations" integer,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "uq_promocodes_code" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "system_discount_rules" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "system_discount_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"subscription_id" bigint NOT NULL,
	"bot_id" bigint,
	"trigger_type" "trigger_type" NOT NULL,
	"trigger_value" integer NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_discounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_discounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bot_user_id" bigint NOT NULL,
	"subscription_id" bigint NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"source_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_user_discounts_bot_user_subscription" UNIQUE("bot_user_id","subscription_id")
);
--> statement-breakpoint
ALTER TABLE "promocode_activations" ADD CONSTRAINT "promocode_activations_promocode_id_promocodes_id_fk" FOREIGN KEY ("promocode_id") REFERENCES "public"."promocodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocode_activations" ADD CONSTRAINT "promocode_activations_bot_user_id_bot_users_id_fk" FOREIGN KEY ("bot_user_id") REFERENCES "public"."bot_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocodes" ADD CONSTRAINT "promocodes_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocodes" ADD CONSTRAINT "promocodes_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocodes" ADD CONSTRAINT "promocodes_created_by_managers_telegram_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."managers"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_discount_rules" ADD CONSTRAINT "system_discount_rules_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_discount_rules" ADD CONSTRAINT "system_discount_rules_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_discount_rules" ADD CONSTRAINT "system_discount_rules_created_by_managers_telegram_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."managers"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_discounts" ADD CONSTRAINT "user_discounts_bot_user_id_bot_users_id_fk" FOREIGN KEY ("bot_user_id") REFERENCES "public"."bot_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_discounts" ADD CONSTRAINT "user_discounts_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_promocode_activations_bot_user" ON "promocode_activations" USING btree ("bot_user_id");--> statement-breakpoint
CREATE INDEX "idx_promocode_activations_promocode" ON "promocode_activations" USING btree ("promocode_id");--> statement-breakpoint
CREATE INDEX "idx_promocodes_code_active" ON "promocodes" USING btree ("code","is_active");--> statement-breakpoint
CREATE INDEX "idx_promocodes_bot_active" ON "promocodes" USING btree ("bot_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_promocodes_created_by" ON "promocodes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_system_discount_rules_subscription_active" ON "system_discount_rules" USING btree ("subscription_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_system_discount_rules_bot_active" ON "system_discount_rules" USING btree ("bot_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_user_discounts_bot_user" ON "user_discounts" USING btree ("bot_user_id");--> statement-breakpoint
CREATE INDEX "idx_user_discounts_source" ON "user_discounts" USING btree ("source_type","source_id");