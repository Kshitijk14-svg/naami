CREATE TABLE "brand_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"order_id" varchar(20),
	"rating" integer NOT NULL,
	"comment" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_feedback" ADD CONSTRAINT "brand_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_feedback" ADD CONSTRAINT "brand_feedback_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_feedback_order_idx" ON "brand_feedback" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "brand_feedback_approved_idx" ON "brand_feedback" USING btree ("is_approved");