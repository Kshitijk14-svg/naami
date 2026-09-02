import {
  pgTable,
  pgEnum,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", [
  "customer",
  "staff",
  "admin",
  "super_admin",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);

export const discountTypeEnum = pgEnum("discount_type", ["percent", "fixed"]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "done",
  "failed",
]);

// Money state, kept separate from `order_status` (which tracks fulfilment).
// Before this existed a paid order was written as "pending" and was
// indistinguishable from an unpaid one.
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

// Lifecycle of a checkout intent — the server-side record of what a given
// Razorpay order is allowed to buy, and for how much.
export const checkoutIntentStatusEnum = pgEnum("checkout_intent_status", [
  "created",
  "consumed",
  "expired",
  "failed",
]);

// ─── 1. users ─────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    name: text("name"),
    // scrypt hash (scheme$N$r$p$salt$hash). Nullable: legacy accounts and
    // accounts mid-signup may not have set a password yet.
    passwordHash: text("password_hash"),
    role: roleEnum("role").notNull().default("customer"),
    // Soft delete: non-null = deactivated. Reads filter on deletedAt IS NULL.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

// ─── 2. categories ────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_slug_idx").on(t.slug),
    index("categories_active_idx").on(t.id).where(sql`${t.deletedAt} IS NULL`),
  ]
);

// ─── 3. products ──────────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    number: varchar("number", { length: 10 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    subtitle: text("subtitle").notNull().default(""),
    image: text("image").notNull().default("/images/product-jacket.png"),
    thumbnailImage: text("thumbnail_image"),
    // Optional promo clip shown as a floating player on the product page.
    // video_thumbnail_image is the ffmpeg-extracted poster frame.
    videoUrl: text("video_url"),
    videoThumbnailImage: text("video_thumbnail_image"),
    priceInr: integer("price_inr").notNull(),
    compareAtPriceInr: integer("compare_at_price_inr"),
    stock: integer("stock").notNull().default(0),
    // false = infinite stock: admin can sell without decrementing/blocking on stock.
    trackStock: boolean("track_stock").notNull().default(true),
    isPublished: boolean("is_published").notNull().default(true),
    isFeaturedNewArrival: boolean("is_featured_new_arrival").notNull().default(false),
    isFeaturedBestseller: boolean("is_featured_bestseller").notNull().default(false),
    homeSortOrder: integer("home_sort_order").notNull().default(0),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_published_idx").on(t.isPublished),
    index("products_category_idx").on(t.categoryId),
    index("products_active_idx").on(t.id).where(sql`${t.deletedAt} IS NULL`),
    // The app-level FOR UPDATE guard in createOrder is the primary defence;
    // this is the backstop that turns a missed lock into a loud failure
    // instead of silently negative inventory.
    check("products_stock_non_negative", sql`${t.stock} >= 0`),
    index("products_new_arrival_idx").on(t.isFeaturedNewArrival),
    index("products_bestseller_idx").on(t.isFeaturedBestseller),
  ]
);

// ─── 4. product_sizes ─────────────────────────────────────────────────────────

export const productSizes = pgTable(
  "product_sizes",
  {
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    size: varchar("size", { length: 10 }).notNull(),
    stock: integer("stock").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.size] }),
    check("product_sizes_stock_non_negative", sql`${t.stock} >= 0`),
  ]
);

// ─── 4a. product_metafields ───────────────────────────────────────────────────
// Generic name/description pairs replacing the old fixed material/fit/origin
// columns (e.g. name "Material", description "the material is cotton").

export const productMetafields = pgTable(
  "product_metafields",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_metafields_product_idx").on(t.productId)]
);

// ─── 4b. product_images ───────────────────────────────────────────────────────
// Gallery of up to 6 images per product. products.image/thumbnailImage stay in
// sync with the position-0 row here (see setProductImages).

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    sizeBytes: integer("size_bytes"),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.sortOrder)]
);

// ─── 5. collections ───────────────────────────────────────────────────────────

export const collections = pgTable(
  "collections",
  {
    id: serial("id").primaryKey(),
    number: varchar("number", { length: 10 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    tag: varchar("tag", { length: 100 }).notNull().default(""),
    description: text("description").notNull().default(""),
    image: text("image").notNull().default("/images/product-jacket.png"),
    thumbnailImage: text("thumbnail_image"),
    isPublished: boolean("is_published").notNull().default(true),
    showOnHomepage: boolean("show_on_homepage").notNull().default(false),
    homeSortOrder: integer("home_sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("collections_active_idx").on(t.id).where(sql`${t.deletedAt} IS NULL`),
    index("collections_homepage_idx").on(t.showOnHomepage),
  ]
);

// ─── 6. collection_products ───────────────────────────────────────────────────

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] })]
);

// ─── 6b. homepage_look_cards ────────────────────────────────────────────────────

export const homepageLookCards = pgTable(
  "homepage_look_cards",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: text("subtitle").notNull().default(""),
    image: text("image").notNull().default("/images/product-jacket.png"),
    thumbnailImage: text("thumbnail_image"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("homepage_look_cards_active_idx").on(t.id).where(sql`${t.deletedAt} IS NULL`),
    index("homepage_look_cards_sort_idx").on(t.sortOrder),
  ]
);

// ─── 6b2. homepage_shared_moment_videos ─────────────────────────────────────────
// Admin-uploaded clips for the homepage "Shared Moments" carousel — replaces the
// former Instagram Graph API feed (no more token to expire/rotate).

export const homepageSharedMomentVideos = pgTable(
  "homepage_shared_moment_videos",
  {
    id: serial("id").primaryKey(),
    videoUrl: text("video_url").notNull(),
    thumbnailImage: text("thumbnail_image").notNull().default(""),
    caption: text("caption").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("homepage_shared_moment_videos_active_idx").on(t.id).where(sql`${t.deletedAt} IS NULL`),
    index("homepage_shared_moment_videos_sort_idx").on(t.sortOrder),
  ]
);

// ─── 6c. homepage_hotspots ──────────────────────────────────────────────────────
// Shared by both the singleton lookbook banner (lookCardId IS NULL) and each
// look card's nested hotspots (lookCardId set) — avoids duplicating identical
// columns/CRUD across two near-identical tables.

export const homepageHotspots = pgTable(
  "homepage_hotspots",
  {
    id: serial("id").primaryKey(),
    lookCardId: integer("look_card_id").references(() => homepageLookCards.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    // Optional destination URL (e.g. "/about", "/collection"). When set, the
    // hotspot navigates here instead of opening the product quick-add popover.
    linkUrl: text("link_url"),
    topPct: integer("top_pct").notNull(),
    leftPct: integer("left_pct").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("homepage_hotspots_look_card_idx").on(t.lookCardId),
    index("homepage_hotspots_product_idx").on(t.productId),
  ]
);

// ─── 7. coupons ───────────────────────────────────────────────────────────────

export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    discountType: discountTypeEnum("discount_type").notNull(),
    discountValue: integer("discount_value").notNull(),
    minOrderValue: integer("min_order_value"),
    // Cap on the computed discount for percent coupons (₹). Null = uncapped.
    maxDiscountInr: integer("max_discount_inr"),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    // Per-user / per-IP redemption caps, enforced against coupon_redemptions.
    perUserLimit: integer("per_user_limit"),
    perIpLimit: integer("per_ip_limit"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coupons_code_idx").on(t.code)]
);

// ─── 8. orders ────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 20 }).primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pending"),
    totalInr: integer("total_inr").notNull(),
    // Coupon discount applied to this order (₹), snapshotted at purchase time.
    discountInr: integer("discount_inr").notNull().default(0),
    couponId: integer("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    trackingNumber: varchar("tracking_number", { length: 100 }),
    trackingCarrier: varchar("tracking_carrier", { length: 100 }),
    trackingUrl: text("tracking_url"),
    adminNotes: text("admin_notes"),
    invoiceNumber: varchar("invoice_number", { length: 30 }),
    // Shipping snapshot — captured at order time, nullable for existing orders
    shippingName: varchar("shipping_name", { length: 200 }),
    shippingEmail: varchar("shipping_email", { length: 320 }),
    shippingPhone: varchar("shipping_phone", { length: 20 }),
    shippingAddress: text("shipping_address"), // JSON: {line1,line2?,city,state,pincode}
    razorpayOrderId: varchar("razorpay_order_id", { length: 100 }),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
    // What the gateway says it actually captured, in whole rupees. totalInr is
    // what we computed; this is what the customer was charged. They must match,
    // and fulfilOrder() refuses to create the order unless they do.
    paidAmountInr: integer("paid_amount_inr"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_created_at_idx").on(t.createdAt),
    // Idempotency: a given gateway payment maps to at most one order.
    uniqueIndex("orders_razorpay_payment_idx")
      .on(t.razorpayPaymentId)
      .where(sql`${t.razorpayPaymentId} IS NOT NULL`),
    uniqueIndex("orders_invoice_number_idx")
      .on(t.invoiceNumber)
      .where(sql`${t.invoiceNumber} IS NOT NULL`),
    // One Razorpay order backs at most one of ours. Without this a single
    // gateway order could be spent across several rows.
    uniqueIndex("orders_razorpay_order_idx")
      .on(t.razorpayOrderId)
      .where(sql`${t.razorpayOrderId} IS NOT NULL`),
    index("orders_payment_status_idx").on(t.paymentStatus),
  ]
);

// ─── 9. order_items ───────────────────────────────────────────────────────────

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: varchar("order_id", { length: 20 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
    // Intentional snapshot: preserve name and price at time of purchase
    productName: varchar("product_name", { length: 200 }).notNull(),
    unitPriceInr: integer("unit_price_inr").notNull(),
    quantity: integer("quantity").notNull(),
    size: varchar("size", { length: 10 }),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_product_idx").on(t.productId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
  ]
);

// ─── 9a. coupon_redemptions ───────────────────────────────────────────────────
// One row per coupon redemption, written inside the order-creation transaction.
// Powers per-user and per-IP usage limits and gives an audit trail of who
// redeemed which coupon (usedCount on coupons stays the fast aggregate).

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: serial("id").primaryKey(),
    couponId: integer("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
    // Nullable: the row is written when the coupon is HELD at create-order
    // time (before payment) and only linked to an order once payment lands.
    // An intent that expires unpaid deletes the row and gives the use back.
    orderId: varchar("order_id", { length: 20 }).references(() => orders.id, { onDelete: "cascade" }),
    intentId: integer("intent_id").references(() => checkoutIntents.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ip: varchar("ip", { length: 45 }), // IPv6-safe; null when unknown
    discountInr: integer("discount_inr").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("coupon_redemptions_coupon_user_idx").on(t.couponId, t.userId),
    index("coupon_redemptions_coupon_ip_idx").on(t.couponId, t.ip),
    index("coupon_redemptions_order_idx").on(t.orderId),
    index("coupon_redemptions_intent_idx").on(t.intentId),
  ]
);

// ─── 9b. order_status_history ─────────────────────────────────────────────────
// Audit trail of every admin status change.

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: serial("id").primaryKey(),
    orderId: varchar("order_id", { length: 20 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatusEnum("from_status").notNull(),
    toStatus: orderStatusEnum("to_status").notNull(),
    changedBy: varchar("changed_by", { length: 320 }).notNull(), // admin email
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)]
);

// ─── 9d. checkout_intents ─────────────────────────────────────────────────────
// The server's record of what a given Razorpay order is allowed to buy, and for
// how much. Written BEFORE the customer is sent to the payment widget, so
// verification never has to trust a client-supplied cart: a valid signature
// only proves Razorpay signed some (order, payment) pair for our account — it
// says nothing about what was bought or what was charged. The intent is what
// binds the two together.

export const checkoutIntents = pgTable(
  "checkout_intents",
  {
    id: serial("id").primaryKey(),
    // The gateway order id is the lookup key from both the browser callback and
    // the webhook. Unique so one gateway order can never fund two carts.
    razorpayOrderId: varchar("razorpay_order_id", { length: 100 }).notNull().unique(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    // JSON snapshot of priceCart()'s output — names and unit prices frozen at
    // intent time. This, not the request body, becomes the order's line items.
    items: text("items").notNull(),
    subtotalInr: integer("subtotal_inr").notNull(),
    discountInr: integer("discount_inr").notNull().default(0),
    // The exact rupee amount the Razorpay order was opened for. Verification
    // rejects the payment unless the gateway reports this same amount.
    payableInr: integer("payable_inr").notNull(),
    couponCode: varchar("coupon_code", { length: 50 }),
    // Shipping snapshot, so the address cannot be swapped after payment.
    // Phone/address are encrypted at rest exactly as on `orders`.
    shippingName: varchar("shipping_name", { length: 200 }),
    shippingEmail: varchar("shipping_email", { length: 320 }),
    shippingPhone: varchar("shipping_phone", { length: 20 }),
    shippingAddress: text("shipping_address"),
    status: checkoutIntentStatusEnum("status").notNull().default("created"),
    // Set when the intent is spent. The conditional UPDATE that flips
    // created -> consumed is the replay gate for the whole payment flow.
    orderId: varchar("order_id", { length: 20 }).references(() => orders.id, { onDelete: "set null" }),
    failureReason: text("failure_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("checkout_intents_status_expires_idx").on(t.status, t.expiresAt),
    index("checkout_intents_user_idx").on(t.userId),
    check("checkout_intents_payable_non_negative", sql`${t.payableInr} >= 0`),
  ]
);

// ─── 9e. stock_reservations ───────────────────────────────────────────────────
// Units held for an in-flight checkout. Taken inside the same transaction that
// creates the intent — i.e. BEFORE the customer pays — so two people racing for
// the last unit collide at the reservation, where one can still be turned away
// cleanly, rather than after both have been charged.
//
// A row is ACTIVE while `released_at IS NULL AND expires_at > now()`.
// Available stock = products/product_sizes.stock MINUS active reservations.

export const stockReservations = pgTable(
  "stock_reservations",
  {
    id: serial("id").primaryKey(),
    intentId: integer("intent_id").notNull().references(() => checkoutIntents.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    // Empty string for sizeless products, mirroring createOrder's `size ?? ""`
    // key convention so both paths group identically.
    size: varchar("size", { length: 10 }).notNull().default(""),
    quantity: integer("quantity").notNull(),
    // Stamped when the hold is consumed by a real order OR swept after expiry.
    // Never deleted — it is the audit trail for a disputed sell-out.
    releasedAt: timestamp("released_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("stock_reservations_active_idx")
      .on(t.productId, t.size)
      .where(sql`${t.releasedAt} IS NULL`),
    index("stock_reservations_expiry_idx")
      .on(t.expiresAt)
      .where(sql`${t.releasedAt} IS NULL`),
    index("stock_reservations_intent_idx").on(t.intentId),
    check("stock_reservations_quantity_positive", sql`${t.quantity} > 0`),
  ]
);

// ─── 9f. payment_incidents ────────────────────────────────────────────────────
// A payment the gateway captured that we could not turn into an order. Every
// post-capture failure lands here so money is never quietly lost to a 500 —
// admin can see exactly which payments need a refund or a manual order.

export const paymentIncidents = pgTable(
  "payment_incidents",
  {
    id: serial("id").primaryKey(),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
    razorpayOrderId: varchar("razorpay_order_id", { length: 100 }),
    intentId: integer("intent_id").references(() => checkoutIntents.id, { onDelete: "set null" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    amountInr: integer("amount_inr"),
    reason: text("reason").notNull(),
    // Where it came from: "verify-payment" | "webhook".
    source: varchar("source", { length: 40 }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: varchar("resolved_by", { length: 320 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payment_incidents_unresolved_idx")
      .on(t.createdAt)
      .where(sql`${t.resolvedAt} IS NULL`),
    index("payment_incidents_payment_idx").on(t.razorpayPaymentId),
  ]
);

// ─── 9c. invoice_counters ─────────────────────────────────────────────────────
// Per-year sequential counter for invoice numbers (NAAMI-INV-<year>-<seq>).
// Incremented via atomic upsert; orders.invoice_number unique index is the backstop.

export const invoiceCounters = pgTable("invoice_counters", {
  year: integer("year").primaryKey(),
  counter: integer("counter").notNull(),
});

// ─── 10. otp_codes ────────────────────────────────────────────────────────────

export const otpCodes = pgTable("otp_codes", {
  email: varchar("email", { length: 320 }).primaryKey(),
  code: varchar("code", { length: 6 }).notNull(),
  name: text("name"),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 11. blog_posts ───────────────────────────────────────────────────────────
// UNUSED as of the Journal → Our Journey conversion. Kept so existing rows are
// not lost; a follow-up migration can drop the table. Our Journey stores its
// data in the `our_journey_json` design setting, not here.

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    excerpt: text("excerpt"),
    content: text("content").notNull().default(""),
    coverImage: text("cover_image"),
    isPublished: boolean("is_published").notNull().default(false),
    // publishedAt differs from createdAt — drafts have createdAt but null publishedAt
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("blog_posts_slug_idx").on(t.slug),
    index("blog_posts_published_idx").on(t.isPublished, t.publishedAt),
  ]
);

// ─── 12. design_settings ─────────────────────────────────────────────────────
// BCNF key-value store: key → value, key → updatedAt. No non-trivial dependencies.

export const designSettings = pgTable("design_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 13. abandoned_carts ─────────────────────────────────────────────────────
// Snapshot of cart state at checkout entry. email is NOT a FK to users because
// the cart may be abandoned before account creation. items is a JSON snapshot.

export const abandonedCarts = pgTable(
  "abandoned_carts",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    items: text("items").notNull(), // JSON: CartItem[]
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Unique on email: create-order does a select-then-insert with no lock, which
  // could otherwise duplicate rows and send the same reminder twice.
  (t) => [uniqueIndex("abandoned_carts_email_idx").on(t.email)]
);

// ─── 14. idempotency_keys ────────────────────────────────────────────────────
// Stores the response of a completed POST so a client retry with the same
// Idempotency-Key header replays the original result instead of re-executing.

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    key: varchar("key", { length: 255 }).primaryKey(),
    statusCode: integer("status_code").notNull(),
    responseBody: text("response_body").notNull(), // JSON snapshot of the response
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("idempotency_keys_expires_idx").on(t.expiresAt)]
);

// ─── 15. wishlists ───────────────────────────────────────────────────────────

export const wishlists = pgTable(
  "wishlists",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("wishlists_user_product_idx").on(t.userId, t.productId),
    index("wishlists_user_idx").on(t.userId),
  ]
);

// ─── 16. jobs ─────────────────────────────────────────────────────────────────
// Transactional outbox: side effects (emails) are enqueued inside the same DB
// transaction as the state change, then drained by a worker with retries.

export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 100 }).notNull(),
    payload: text("payload").notNull(), // JSON
    status: jobStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_status_run_at_idx").on(t.status, t.runAt)]
);

// ─── 17. brand_feedback ───────────────────────────────────────────────────────
// Post-purchase brand-level feedback (not per-product reviews). userId/orderId
// are nullable + set-null on delete so a deleted account or order doesn't
// force deleting feedback history. Nothing surfaces publicly until approved.

export const brandFeedback = pgTable(
  "brand_feedback",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    orderId: varchar("order_id", { length: 20 }).references(() => orders.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    isApproved: boolean("is_approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("brand_feedback_order_idx").on(t.orderId),
    index("brand_feedback_approved_idx").on(t.isApproved),
  ]
);

// ─── Drizzle relations ────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  wishlists: many(wishlists),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  sizes: many(productSizes),
  metafields: many(productMetafields),
  images: many(productImages),
  collectionProducts: many(collectionProducts),
  orderItems: many(orderItems),
  wishlists: many(wishlists),
}));

export const productMetafieldsRelations = relations(productMetafields, ({ one }) => ({
  product: one(products, { fields: [productMetafields.productId], references: [products.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  product: one(products, { fields: [wishlists.productId], references: [products.id] }),
}));

export const productSizesRelations = relations(productSizes, ({ one }) => ({
  product: one(products, { fields: [productSizes.productId], references: [products.id] }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  collectionProducts: many(collectionProducts),
}));

export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, { fields: [collectionProducts.collectionId], references: [collections.id] }),
  product: one(products, { fields: [collectionProducts.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, { fields: [couponRedemptions.couponId], references: [coupons.id] }),
  order: one(orders, { fields: [couponRedemptions.orderId], references: [orders.id] }),
  user: one(users, { fields: [couponRedemptions.userId], references: [users.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));

export const checkoutIntentsRelations = relations(checkoutIntents, ({ one, many }) => ({
  user: one(users, { fields: [checkoutIntents.userId], references: [users.id] }),
  order: one(orders, { fields: [checkoutIntents.orderId], references: [orders.id] }),
  reservations: many(stockReservations),
}));

export const stockReservationsRelations = relations(stockReservations, ({ one }) => ({
  intent: one(checkoutIntents, { fields: [stockReservations.intentId], references: [checkoutIntents.id] }),
  product: one(products, { fields: [stockReservations.productId], references: [products.id] }),
}));

export const brandFeedbackRelations = relations(brandFeedback, ({ one }) => ({
  user: one(users, { fields: [brandFeedback.userId], references: [users.id] }),
  order: one(orders, { fields: [brandFeedback.orderId], references: [orders.id] }),
}));
