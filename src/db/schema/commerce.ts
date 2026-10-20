import { sql } from "drizzle-orm"
import {
  boolean,
  char,
  check,
  date,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core"

import { adminUsers, customers } from "./auth"
import { products } from "./catalog"
import { createdAt, EMIRATES, fk, pk, ts, updatedAt } from "./_helpers"

export const deliveryZones = mysqlTable(
  "delivery_zones",
  {
    id: pk(),
    emirate: mysqlEnum("emirate", EMIRATES).notNull(),
    nameEn: varchar("name_en", { length: 140 }).notNull(),
    nameAr: varchar("name_ar", { length: 140 }).notNull().default(""),
    feeMinor: int("fee_minor").notNull().default(0),
    /** Delivery is free when the goods subtotal reaches this amount. */
    freeOverMinor: int("free_over_minor"),
    minOrderMinor: int("min_order_minor").notNull().default(0),
    sameDayAvailable: boolean("same_day_available").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    sort: int("sort").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("delivery_zones_emirate_idx").on(t.emirate, t.isActive)]
)

export const deliverySlots = mysqlTable("delivery_slots", {
  id: pk(),
  labelEn: varchar("label_en", { length: 80 }).notNull(),
  labelAr: varchar("label_ar", { length: 80 }).notNull().default(""),
  /** "HH:MM" local (Asia/Dubai). */
  startTime: char("start_time", { length: 5 }).notNull(),
  endTime: char("end_time", { length: 5 }).notNull(),
  /** Latest local time on the delivery day to order for this slot ("HH:MM"). Null = day before only. */
  sameDayCutoff: char("same_day_cutoff", { length: 5 }),
  extraFeeMinor: int("extra_fee_minor").notNull().default(0),
  capacityPerDay: int("capacity_per_day").notNull().default(20),
  /** Bitmask of weekdays, bit 0 = Sunday. 127 = every day. */
  daysMask: int("days_mask").notNull().default(127),
  isActive: boolean("is_active").notNull().default(true),
  sort: int("sort").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const deliveryBlackouts = mysqlTable(
  "delivery_blackouts",
  {
    id: pk(),
    day: date("day", { mode: "string" }).notNull(),
    emirate: mysqlEnum("emirate", EMIRATES),
    reasonEn: varchar("reason_en", { length: 160 }).notNull(),
    reasonAr: varchar("reason_ar", { length: 160 }).notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("delivery_blackouts_day_idx").on(t.day)]
)

export const coupons = mysqlTable(
  "coupons",
  {
    id: pk(),
    code: varchar("code", { length: 40 }).notNull(),
    kind: mysqlEnum("kind", ["percent", "fixed"]).notNull(),
    /** Percent (1-100) or fils for fixed. */
    value: int("value").notNull(),
    minOrderMinor: int("min_order_minor").notNull().default(0),
    maxDiscountMinor: int("max_discount_minor"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    maxUses: int("max_uses"),
    usedCount: int("used_count").notNull().default(0),
    perCustomerLimit: int("per_customer_limit").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    /** Shown on the public Offers page. */
    isPublic: boolean("is_public").notNull().default(false),
    titleEn: varchar("title_en", { length: 160 }).notNull().default(""),
    titleAr: varchar("title_ar", { length: 160 }).notNull().default(""),
    descriptionEn: text("description_en"),
    descriptionAr: text("description_ar"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("coupons_code_uq").on(t.code), check("coupons_value_pos", sql`${t.value} > 0`)]
)

export const ORDER_STATUSES = ["pending", "confirmed", "preparing", "dispatched", "delivered", "cancelled", "refunded"] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export const PAYMENT_METHODS = ["stripe", "cod", "tabby", "tamara"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded", "partially_refunded"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const orders = mysqlTable(
  "orders",
  {
    id: pk(),
    /** Internal, human-facing reference (AF-100001). Never used as a public URL key. */
    orderNumber: varchar("order_number", { length: 20 }).notNull(),
    /** Random 32-char token used in the public confirmation URL. */
    publicToken: char("public_token", { length: 32 }).notNull(),
    idempotencyKey: char("idempotency_key", { length: 64 }).notNull(),
    customerId: fk("customer_id").references(() => customers.id, { onDelete: "set null" }),
    locale: mysqlEnum("locale", ["en", "ar"]).notNull().default("en"),

    status: mysqlEnum("status", ORDER_STATUSES).notNull().default("pending"),
    paymentMethod: mysqlEnum("payment_method", PAYMENT_METHODS).notNull(),
    paymentStatus: mysqlEnum("payment_status", PAYMENT_STATUSES).notNull().default("unpaid"),

    contactName: varchar("contact_name", { length: 120 }).notNull(),
    contactEmail: varchar("contact_email", { length: 254 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 32 }).notNull(),

    // Delivery
    recipientName: varchar("recipient_name", { length: 120 }).notNull(),
    recipientPhone: varchar("recipient_phone", { length: 32 }).notNull(),
    emirate: mysqlEnum("emirate", EMIRATES).notNull(),
    zoneId: fk("zone_id").references(() => deliveryZones.id, { onDelete: "set null" }),
    zoneName: varchar("zone_name", { length: 140 }).notNull(),
    area: varchar("area", { length: 120 }).notNull(),
    street: varchar("street", { length: 160 }),
    building: varchar("building", { length: 160 }).notNull(),
    addressNotes: varchar("address_notes", { length: 300 }),
    deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
    slotId: fk("slot_id").references(() => deliverySlots.id, { onDelete: "set null" }),
    slotLabel: varchar("slot_label", { length: 80 }).notNull(),

    // Gift card
    isGift: boolean("is_gift").notNull().default(false),
    giftMessage: varchar("gift_message", { length: 400 }),
    giftFrom: varchar("gift_from", { length: 120 }),
    hideSender: boolean("hide_sender").notNull().default(false),

    // Corporate
    companyName: varchar("company_name", { length: 160 }),
    companyTrn: varchar("company_trn", { length: 20 }),
    poNumber: varchar("po_number", { length: 60 }),
    invoiceRequested: boolean("invoice_requested").notNull().default(false),
    billingAddress: varchar("billing_address", { length: 300 }),

    customerNote: varchar("customer_note", { length: 500 }),
    staffNote: text("staff_note"),

    // Money (fils). total = subtotal - discount + delivery + slot fee (all VAT-inclusive) + deposit.
    currency: char("currency", { length: 3 }).notNull().default("AED"),
    subtotalMinor: int("subtotal_minor").notNull(),
    discountMinor: int("discount_minor").notNull().default(0),
    deliveryFeeMinor: int("delivery_fee_minor").notNull().default(0),
    depositMinor: int("deposit_minor").notNull().default(0),
    /** VAT contained in (subtotal - discount + delivery). */
    vatMinor: int("vat_minor").notNull(),
    vatBps: int("vat_bps").notNull().default(500),
    totalMinor: int("total_minor").notNull(),
    couponId: fk("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    couponCode: varchar("coupon_code", { length: 40 }),

    stripeSessionId: varchar("stripe_session_id", { length: 120 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 120 }),
    paidAt: ts("paid_at"),
    cancelledAt: ts("cancelled_at"),
    cancelReason: varchar("cancel_reason", { length: 300 }),
    invoiceNumber: varchar("invoice_number", { length: 24 }),
    invoiceIssuedAt: ts("invoice_issued_at"),
    ipHash: char("ip_hash", { length: 64 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.orderNumber),
    uniqueIndex("orders_public_token_uq").on(t.publicToken),
    uniqueIndex("orders_idempotency_uq").on(t.idempotencyKey),
    uniqueIndex("orders_stripe_session_uq").on(t.stripeSessionId),
    uniqueIndex("orders_invoice_uq").on(t.invoiceNumber),
    index("orders_status_created_idx").on(t.status, t.createdAt),
    index("orders_customer_idx").on(t.customerId),
    index("orders_email_idx").on(t.contactEmail),
    index("orders_delivery_idx").on(t.deliveryDate, t.slotId),
    index("orders_payment_idx").on(t.paymentStatus, t.paymentMethod),
    check("orders_total_nonneg", sql`${t.totalMinor} >= 0`),
  ]
)

export const orderItems = mysqlTable(
  "order_items",
  {
    id: pk(),
    orderId: fk("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: fk("product_id").references(() => products.id, { onDelete: "set null" }),
    /** Snapshots so later catalogue edits never rewrite a past order. */
    sku: varchar("sku", { length: 60 }).notNull(),
    titleEn: varchar("title_en", { length: 180 }).notNull(),
    titleAr: varchar("title_ar", { length: 180 }).notNull().default(""),
    imageKey: varchar("image_key", { length: 160 }),
    pricingType: mysqlEnum("pricing_type", ["one_time", "subscription", "rental"]).notNull().default("one_time"),
    unitPriceMinor: int("unit_price_minor").notNull(),
    quantity: int("quantity").notNull(),
    lineTotalMinor: int("line_total_minor").notNull(),
    depositUnitMinor: int("deposit_unit_minor").notNull().default(0),
    meta: json("meta").$type<{ billingInterval?: string; rentalDays?: number }>(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_product_idx").on(t.productId), check("order_items_qty_pos", sql`${t.quantity} > 0`)]
)

export const orderStatusHistory = mysqlTable(
  "order_status_history",
  {
    id: pk(),
    orderId: fk("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: mysqlEnum("from_status", ORDER_STATUSES),
    toStatus: mysqlEnum("to_status", ORDER_STATUSES).notNull(),
    actorType: mysqlEnum("actor_type", ["admin", "customer", "system", "webhook"]).notNull(),
    actorId: fk("actor_id"),
    note: varchar("note", { length: 300 }),
    createdAt: createdAt(),
  },
  (t) => [index("order_history_order_idx").on(t.orderId, t.createdAt)]
)

export const payments = mysqlTable(
  "payments",
  {
    id: pk(),
    orderId: fk("order_id").references(() => orders.id, { onDelete: "cascade" }),
    paymentLinkId: fk("payment_link_id"),
    provider: mysqlEnum("provider", ["stripe", "cod", "tabby", "tamara", "manual"]).notNull(),
    kind: mysqlEnum("kind", ["charge", "refund"]).notNull().default("charge"),
    providerRef: varchar("provider_ref", { length: 120 }),
    amountMinor: int("amount_minor").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    status: mysqlEnum("status", ["succeeded", "failed", "pending"]).notNull(),
    recordedBy: fk("recorded_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("payments_order_idx").on(t.orderId), uniqueIndex("payments_provider_ref_uq").on(t.provider, t.kind, t.providerRef)]
)

/** One row per Stripe event id: webhook deduplication. */
export const stripeEvents = mysqlTable(
  "stripe_events",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    type: varchar("type", { length: 80 }).notNull(),
    status: mysqlEnum("status", ["processing", "processed", "ignored", "failed"]).notNull().default("processing"),
    detail: varchar("detail", { length: 300 }),
    receivedAt: createdAt(),
    processedAt: ts("processed_at"),
  },
  (t) => [index("stripe_events_type_idx").on(t.type, t.status)]
)

export const paymentLinks = mysqlTable(
  "payment_links",
  {
    id: pk(),
    token: char("token", { length: 32 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: varchar("description", { length: 400 }),
    amountMinor: int("amount_minor").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("AED"),
    customerName: varchar("customer_name", { length: 120 }),
    customerEmail: varchar("customer_email", { length: 254 }),
    orderId: fk("order_id").references(() => orders.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["active", "paid", "expired", "cancelled"]).notNull().default("active"),
    expiresAt: ts("expires_at"),
    stripeSessionId: varchar("stripe_session_id", { length: 120 }),
    paidAt: ts("paid_at"),
    createdBy: fk("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("payment_links_token_uq").on(t.token), index("payment_links_status_idx").on(t.status), uniqueIndex("payment_links_session_uq").on(t.stripeSessionId), check("payment_links_amount_pos", sql`${t.amountMinor} > 0`)]
)

export const couponRedemptions = mysqlTable(
  "coupon_redemptions",
  {
    id: pk(),
    couponId: fk("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: fk("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 254 }).notNull(),
    discountMinor: int("discount_minor").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("coupon_redemptions_order_uq").on(t.orderId), index("coupon_redemptions_coupon_email_idx").on(t.couponId, t.email)]
)

/** Gap-tolerant sequences (order numbers, invoice numbers per year). */
export const counters = mysqlTable("counters", {
  name: varchar("name", { length: 40 }).primaryKey(),
  value: int("value").notNull().default(0),
})
