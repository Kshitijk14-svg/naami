INSERT INTO "product_metafields" ("product_id", "name", "description", "sort_order")
  SELECT "id", 'Material', "material", 0 FROM "products" WHERE COALESCE("material", '') <> '';
--> statement-breakpoint
INSERT INTO "product_metafields" ("product_id", "name", "description", "sort_order")
  SELECT "id", 'Fit', "fit", 1 FROM "products" WHERE COALESCE("fit", '') <> '';
--> statement-breakpoint
INSERT INTO "product_metafields" ("product_id", "name", "description", "sort_order")
  SELECT "id", 'Origin', "origin", 2 FROM "products" WHERE COALESCE("origin", '') <> '';
--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "thumbnail_url", "sort_order")
  SELECT "id", "image", "thumbnail_image", 0 FROM "products" WHERE "deleted_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "material";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "fit";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "origin";