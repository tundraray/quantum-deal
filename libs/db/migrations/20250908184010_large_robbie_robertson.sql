ALTER TABLE "messages" ALTER COLUMN "type" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "codes" ADD COLUMN "manager_id" bigint;--> statement-breakpoint
ALTER TABLE "managers" ADD COLUMN "level" varchar(50);--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_manager_id_managers_telegram_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("telegram_id") ON DELETE no action ON UPDATE no action;