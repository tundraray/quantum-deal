ALTER TABLE "codes" DROP CONSTRAINT "codes_subscription_id_fkey";
--> statement-breakpoint
ALTER TABLE "codes" DROP CONSTRAINT "codes_user_id_fkey";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_subscribe_id_fkey";
--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "username" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "username" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "lang" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "lang" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "first_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "first_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "last_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "last_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "symbol" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "symbol" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_type" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "ticket_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "lang" SET DATA TYPE varchar(10) USING lang::varchar(10);--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "lang" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" SET DATA TYPE varchar(10) USING type::varchar(10);--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "lang" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "lang" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "event_type" varchar(30) DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "account" varchar(50) DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "broker" varchar(100) DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "schema_version" varchar(10) DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ea_version" varchar(20) DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sector" varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "position_id" varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "event_timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "swap" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "commission" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deal_type" varchar(10);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deal_volume" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deal_profit" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deal_swap" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "partial_close" real;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "comment" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_user_id_users_telegram_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_subscribe_id_subscriptions_id_fk" FOREIGN KEY ("subscribe_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_ticket_id_idx" ON "orders" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "orders_account_idx" ON "orders" USING btree ("account");--> statement-breakpoint
CREATE INDEX "orders_symbol_idx" ON "orders" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "orders_event_type_idx" ON "orders" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "orders_event_timestamp_idx" ON "orders" USING btree ("event_timestamp");--> statement-breakpoint
CREATE INDEX "orders_position_id_idx" ON "orders" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "orders_account_event_timestamp_idx" ON "orders" USING btree ("account","event_timestamp");