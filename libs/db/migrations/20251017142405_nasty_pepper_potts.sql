CREATE TABLE "instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"group" varchar(50) NOT NULL,
	"subgroup" varchar(50),
	"sector" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
-- ============================================================================
-- Performance Indexes for instruments
-- ============================================================================
-- These indexes optimize the most common instrument queries:
-- 1. Filter by sector (for webhook processing)
-- 2. Filter by group (for UI grouping)
-- 3. Filter by active status (for filtering out inactive instruments)
-- ============================================================================

-- Index for sector-based filtering (webhook processing)
CREATE INDEX IF NOT EXISTS "idx_instruments_sector"
  ON "instruments"("sector");
--> statement-breakpoint
-- Index for group-based queries (UI display)
CREATE INDEX IF NOT EXISTS "idx_instruments_group"
  ON "instruments"("group");
--> statement-breakpoint
-- Index for active instruments only
CREATE INDEX IF NOT EXISTS "idx_instruments_active"
  ON "instruments"("is_active") WHERE "is_active" = true;
--> statement-breakpoint
