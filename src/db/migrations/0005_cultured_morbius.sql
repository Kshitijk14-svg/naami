CREATE TABLE "homepage_hotspots" (
	"id" serial PRIMARY KEY NOT NULL,
	"look_card_id" integer,
	"product_id" integer,
	"top_pct" integer NOT NULL,
	"left_pct" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_look_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '/images/product-jacket.png' NOT NULL,
	"thumbnail_image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "homepage_hotspots" ADD CONSTRAINT "homepage_hotspots_look_card_id_homepage_look_cards_id_fk" FOREIGN KEY ("look_card_id") REFERENCES "public"."homepage_look_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_hotspots" ADD CONSTRAINT "homepage_hotspots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "homepage_hotspots_look_card_idx" ON "homepage_hotspots" USING btree ("look_card_id");--> statement-breakpoint
CREATE INDEX "homepage_hotspots_product_idx" ON "homepage_hotspots" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "homepage_look_cards_active_idx" ON "homepage_look_cards" USING btree ("id") WHERE "homepage_look_cards"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "homepage_look_cards_sort_idx" ON "homepage_look_cards" USING btree ("sort_order");