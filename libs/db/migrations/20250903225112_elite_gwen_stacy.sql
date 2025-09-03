-- Safely convert position_id from varchar to bigint
-- First, add a temporary column
ALTER TABLE "orders" ADD COLUMN "position_id_temp" bigint;

-- Copy converted data (only numeric values)
UPDATE "orders" 
SET "position_id_temp" = CASE 
  WHEN "position_id" ~ '^[0-9]+$' THEN "position_id"::bigint 
  ELSE NULL 
END;

-- Drop the old column
ALTER TABLE "orders" DROP COLUMN "position_id";

-- Rename the temp column
ALTER TABLE "orders" RENAME COLUMN "position_id_temp" TO "position_id";

-- Recreate the index
CREATE INDEX IF NOT EXISTS "orders_position_id_idx" ON "orders" ("position_id");