CREATE TABLE "homepage_shared_moment_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_image" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "homepage_shared_moment_videos_active_idx" ON "homepage_shared_moment_videos" USING btree ("id") WHERE "homepage_shared_moment_videos"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "homepage_shared_moment_videos_sort_idx" ON "homepage_shared_moment_videos" USING btree ("sort_order");