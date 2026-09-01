CREATE TYPE "public"."checkout_intent_status" AS ENUM('created', 'consumed', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "checkout_intents" (
	"id" serial PRIMARY KEY NOT NULL,
	"razorpay_order_id" varchar(100) NOT NULL,
	"user_id" integer NOT NULL,
	"items" text NOT NULL,
	"subtotal_inr" integer NOT NULL,
	"discount_inr" integer DEFAULT 0 NOT NULL,
	"payable_inr" integer NOT NULL,
	"coupon_code" varchar(50),
	"shipping_name" varchar(200),
	"shipping_email" varchar(320),
	"shipping_phone" varchar(20),
	"shipping_address" text,
	"status" "checkout_intent_status" DEFAULT 'created' NOT NULL,
	"order_id" varchar(20),
	"failure_reason" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_intents_razorpay_order_id_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "checkout_intents_payable_non_negative" CHECK ("checkout_intents"."payable_inr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"razorpay_payment_id" varchar(100),
	"razorpay_order_id" varchar(100),
	"intent_id" integer,
	"user_id" integer,
	"amount_inr" integer,
	"reason" text NOT NULL,
	"source" varchar(40) NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"intent_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"size" varchar(10) DEFAULT '' NOT NULL,
	"quantity" integer NOT NULL,
	"released_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_reservations_quantity_positive" CHECK ("stock_reservations"."quantity" > 0)
);
--> statement-breakpoint
DROP INDEX "abandoned_carts_email_idx";--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD COLUMN "intent_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_amount_inr" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "payment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_intents" ADD CONSTRAINT "checkout_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_intents" ADD CONSTRAINT "checkout_intents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_incidents" ADD CONSTRAINT "payment_incidents_intent_id_checkout_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."checkout_intents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_incidents" ADD CONSTRAINT "payment_incidents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_intent_id_checkout_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."checkout_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_intents_status_expires_idx" ON "checkout_intents" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "checkout_intents_user_idx" ON "checkout_intents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_incidents_unresolved_idx" ON "payment_incidents" USING btree ("created_at") WHERE "payment_incidents"."resolved_at" IS NULL;--> statement-breakpoint
CREATE INDEX "payment_incidents_payment_idx" ON "payment_incidents" USING btree ("razorpay_payment_id");--> statement-breakpoint
CREATE INDEX "stock_reservations_active_idx" ON "stock_reservations" USING btree ("product_id","size") WHERE "stock_reservations"."released_at" IS NULL;--> statement-breakpoint
CREATE INDEX "stock_reservations_expiry_idx" ON "stock_reservations" USING btree ("expires_at") WHERE "stock_reservations"."released_at" IS NULL;--> statement-breakpoint
CREATE INDEX "stock_reservations_intent_idx" ON "stock_reservations" USING btree ("intent_id");--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_intent_id_checkout_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."checkout_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coupon_redemptions_intent_idx" ON "coupon_redemptions" USING btree ("intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_razorpay_order_idx" ON "orders" USING btree ("razorpay_order_id") WHERE "orders"."razorpay_order_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "abandoned_carts_email_idx" ON "abandoned_carts" USING btree ("email");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_stock_non_negative" CHECK ("product_sizes"."stock" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_stock_non_negative" CHECK ("products"."stock" >= 0);