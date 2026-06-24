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
import { relations } from "drizzle-orm";

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

// ─── 1. users ─────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    name: text("name"),
    role: roleEnum("role").notNull().default("customer"),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)]
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
    priceInr: integer("price_inr").notNull(),
    stock: integer("stock").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_published_idx").on(t.isPublished),
    index("products_category_idx").on(t.categoryId),
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

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  tag: varchar("tag", { length: 100 }).notNull().default(""),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default("/images/product-jacket.png"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 6. collection_products ───────────────────────────────────────────────────

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] })]
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
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
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
    couponId: integer("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
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

// ─── Drizzle relations ────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  sizes: many(productSizes),
  collectionProducts: many(collectionProducts),
  orderItems: many(orderItems),
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
