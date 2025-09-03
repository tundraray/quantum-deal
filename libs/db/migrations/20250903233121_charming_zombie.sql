-- Safely convert ticket_id from varchar to bigint
-- First, add a temporary column
ALTER TABLE "orders" ADD COLUMN "ticket_id_temp" bigint;--> statement-breakpoint

-- Copy converted data (only numeric values)
UPDATE "orders" 
SET "ticket_id_temp" = CASE 
  WHEN "ticket_id" ~ '^[0-9]+$' THEN "ticket_id"::bigint 
  ELSE NULL 
END;--> statement-breakpoint

-- Drop the old column and index
DROP INDEX IF EXISTS "orders_ticket_id_idx";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "ticket_id";--> statement-breakpoint

-- Rename the temp column
ALTER TABLE "orders" RENAME COLUMN "ticket_id_temp" TO "ticket_id";--> statement-breakpoint

-- Recreate the index
CREATE INDEX "orders_ticket_id_idx" ON "orders" ("ticket_id");--> statement-breakpoint

-- Fix close_time column type
ALTER TABLE "orders" ALTER COLUMN "close_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint

-- Drop unused columns if they exist
ALTER TABLE "orders" DROP COLUMN IF EXISTS "event_type";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN IF EXISTS "deal_type";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN IF EXISTS "deal_volume";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN IF EXISTS "deal_profit";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN IF EXISTS "deal_swap";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN IF EXISTS "partial_close";