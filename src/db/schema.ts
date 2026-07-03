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
    material: text("material").notNull().default(""),
    fit: text("fit").notNull().default(""),
    origin: text("origin").notNull().default(""),
    image: text("image").notNull().default("/images/product-jacket.png"),
    thumbnailImage: text("thumbnail_image"),
    priceInr: integer("price_inr").notNull(),
    stock: integer("stock").notNull().default(0),
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
  },
  (t) => [primaryKey({ columns: [t.productId, t.size] })]
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
    orderId: varchar("order_id", { length: 20 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ip: varchar("ip", { length: 45 }), // IPv6-safe; null when unknown
    discountInr: integer("discount_inr").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("coupon_redemptions_coupon_user_idx").on(t.couponId, t.userId),
    index("coupon_redemptions_coupon_ip_idx").on(t.couponId, t.ip),
    index("coupon_redemptions_order_idx").on(t.orderId),
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
  (t) => [index("abandoned_carts_email_idx").on(t.email)]
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
  collectionProducts: many(collectionProducts),
  orderItems: many(orderItems),
  wishlists: many(wishlists),
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
