CREATE TABLE "payment_transactions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"user_subscription_id" bigint NOT NULL,
	"tariff_id" bigint,
	"telegram_invoice_id" varchar(255),
	"telegram_payment_charge_id" varchar(255),
	"amount_stars" integer NOT NULL,
	"period_days" integer NOT NULL,
	"state" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"failure_reason" varchar(500),
	"cancellation_reason" varchar(500),
	"refund_reason" varchar(500),
	"refund_amount" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renewal_tariffs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "renewal_tariffs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"subscription_id" bigint,
	"period_days" integer NOT NULL,
	"price_stars" integer NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_renewal_tariff_subscription_period" UNIQUE("subscription_id","period_days")
);
--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_telegram_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("telegram_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("user_subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_tariff_id_renewal_tariffs_id_fk" FOREIGN KEY ("tariff_id") REFERENCES "public"."renewal_tariffs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_tariffs" ADD CONSTRAINT "renewal_tariffs_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_user_id" ON "payment_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_state" ON "payment_transactions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_telegram_invoice_id" ON "payment_transactions" USING btree ("telegram_invoice_id");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_created_at" ON "payment_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_user_subscription" ON "payment_transactions" USING btree ("user_subscription_id");