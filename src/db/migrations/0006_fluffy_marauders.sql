CREATE TABLE "coupon_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_id" integer NOT NULL,
	"order_id" varchar(20) NOT NULL,
	"user_id" integer NOT NULL,
	"ip" varchar(45),
	"discount_inr" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"counter" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(20) NOT NULL,
	"from_status" "order_status" NOT NULL,
	"to_status" "order_status" NOT NULL,
	"changed_by" varchar(320) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "max_discount_inr" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "per_user_limit" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "per_ip_limit" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_inr" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_carrier" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_number" varchar(30);--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_user_idx" ON "coupon_redemptions" USING btree ("coupon_id","user_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_ip_idx" ON "coupon_redemptions" USING btree ("coupon_id","ip");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_order_idx" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_idx" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_invoice_number_idx" ON "orders" USING btree ("invoice_number") WHERE "orders"."invoice_number" IS NOT NULL;