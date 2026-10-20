import { sql } from "drizzle-orm"
import {
  boolean,
  char,
  check,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core"

import { adminUsers } from "./auth"
import { createdAt, fk, pk, updatedAt } from "./_helpers"

export type MediaVariant = { w: number; h: number; key: string; bytes: number }

export const media = mysqlTable(
  "media",
  {
    id: pk(),
    /** Random, non-guessable object key of the largest published derivative base, e.g. media/<uuid>. */
    key: varchar("key", { length: 120 }).notNull(),
    status: mysqlEnum("status", ["pending", "ready", "rejected"]).notNull().default("pending"),
    mime: varchar("mime", { length: 40 }),
    bytes: int("bytes"),
    width: int("width"),
    height: int("height"),
    /** sha256 of the original uploaded bytes. */
    checksum: char("checksum", { length: 64 }),
    altEn: varchar("alt_en", { length: 300 }).notNull().default(""),
    altAr: varchar("alt_ar", { length: 300 }).notNull().default(""),
    /** Responsive WebP derivatives. */
    variants: json("variants").$type<MediaVariant[]>(),
    /** Average colour for placeholders, hex. */
    dominant: varchar("dominant", { length: 7 }),
    credit: varchar("credit", { length: 200 }),
    createdBy: fk("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("media_key_uq").on(t.key), index("media_status_idx").on(t.status)]
)

export const categories = mysqlTable(
  "categories",
  {
    id: pk(),
    slug: varchar("slug", { length: 120 }).notNull(),
    parentId: fk("parent_id"),
    nameEn: varchar("name_en", { length: 140 }).notNull(),
    nameAr: varchar("name_ar", { length: 140 }).notNull().default(""),
    descriptionEn: text("description_en"),
    descriptionAr: text("description_ar"),
    imageId: fk("image_id").references(() => media.id, { onDelete: "set null" }),
    sort: int("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    seoTitleEn: varchar("seo_title_en", { length: 160 }),
    seoTitleAr: varchar("seo_title_ar", { length: 160 }),
    seoDescriptionEn: varchar("seo_description_en", { length: 320 }),
    seoDescriptionAr: varchar("seo_description_ar", { length: 320 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("categories_slug_uq").on(t.slug), index("categories_parent_idx").on(t.parentId), index("categories_active_sort_idx").on(t.isActive, t.sort)]
)

export const PRICING_TYPES = ["one_time", "subscription", "rental"] as const
export type PricingType = (typeof PRICING_TYPES)[number]

export const products = mysqlTable(
  "products",
  {
    id: pk(),
    slug: varchar("slug", { length: 140 }).notNull(),
    sku: varchar("sku", { length: 60 }).notNull(),
    categoryId: fk("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    nameEn: varchar("name_en", { length: 180 }).notNull(),
    nameAr: varchar("name_ar", { length: 180 }).notNull().default(""),
    shortEn: varchar("short_en", { length: 300 }).notNull().default(""),
    shortAr: varchar("short_ar", { length: 300 }).notNull().default(""),
    descriptionEn: text("description_en"),
    descriptionAr: text("description_ar"),
    /** What is included (stems, vase, card), one item per line. */
    includesEn: text("includes_en"),
    includesAr: text("includes_ar"),
    careEn: text("care_en"),
    careAr: text("care_ar"),
    deliveryNoteEn: text("delivery_note_en"),
    deliveryNoteAr: text("delivery_note_ar"),

    /** VAT-inclusive unit price in fils (per delivery for subscriptions, per rental period for rentals). */
    priceMinor: int("price_minor").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("AED"),
    /** Struck-through compare-at price, informational only. */
    compareAtMinor: int("compare_at_minor"),
    pricingType: mysqlEnum("pricing_type", PRICING_TYPES).notNull().default("one_time"),
    /** Subscriptions: billing/delivery cadence. */
    billingInterval: mysqlEnum("billing_interval", ["week", "month"]),
    /** Rentals: length of the rental period in days. */
    rentalDays: int("rental_days"),
    /** Refundable vase/glass deposit per unit, in fils. Outside the VAT base. */
    depositMinor: int("deposit_minor").notNull().default(0),
    minQty: int("min_qty").notNull().default(1),
    maxQty: int("max_qty").notNull().default(100),
    /** Minimum hours between order and delivery for this item (event decor needs more). */
    leadTimeHours: int("lead_time_hours").notNull().default(0),
    sameDayEligible: boolean("same_day_eligible").notNull().default(true),

    trackStock: boolean("track_stock").notNull().default(true),
    stockQty: int("stock_qty").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sort: int("sort").notNull().default(0),
    seoTitleEn: varchar("seo_title_en", { length: 160 }),
    seoTitleAr: varchar("seo_title_ar", { length: 160 }),
    seoDescriptionEn: varchar("seo_description_en", { length: 320 }),
    seoDescriptionAr: varchar("seo_description_ar", { length: 320 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    uniqueIndex("products_sku_uq").on(t.sku),
    index("products_category_active_idx").on(t.categoryId, t.isActive, t.sort),
    index("products_featured_idx").on(t.isActive, t.isFeatured),
    index("products_price_idx").on(t.priceMinor),
    check("products_price_nonneg", sql`${t.priceMinor} >= 0`),
    check("products_stock_nonneg", sql`${t.stockQty} >= 0`),
    check("products_qty_bounds", sql`${t.minQty} >= 1 AND ${t.maxQty} >= ${t.minQty}`),
  ]
)

export const productImages = mysqlTable(
  "product_images",
  {
    id: pk(),
    productId: fk("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: fk("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    sort: int("sort").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.sort), uniqueIndex("product_images_uq").on(t.productId, t.mediaId)]
)

/** Related products can be pinned manually; otherwise the same category is used. */
export const productRelations = mysqlTable(
  "product_relations",
  {
    productId: fk("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relatedId: fk("related_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sort: int("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("product_relations_uq").on(t.productId, t.relatedId)]
)

export const stockMovements = mysqlTable(
  "stock_movements",
  {
    id: pk(),
    productId: fk("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    delta: int("delta").notNull(),
    reason: mysqlEnum("reason", ["order", "cancel", "restock", "adjust", "expire"]).notNull(),
    orderId: fk("order_id"),
    adminId: fk("admin_id"),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId, t.createdAt), index("stock_movements_order_idx").on(t.orderId)]
)

