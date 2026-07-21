ALTER TABLE "product_sizes" ADD COLUMN "stock" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Backfill: seed each existing size row with the product's current total
-- stock, since no real per-size split exists yet. This is NOT an accurate
-- per-size count — admins must correct real per-size quantities in the
-- admin panel after this migration runs.
UPDATE "product_sizes"
SET "stock" = (SELECT "stock" FROM "products" WHERE "products"."id" = "product_sizes"."product_id")
WHERE "stock" = 0;