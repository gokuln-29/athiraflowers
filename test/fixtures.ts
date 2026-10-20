import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"

import { db } from "@/db"
import { categories, counters, coupons, deliverySlots, deliveryZones, products } from "@/db/schema"
import { addDays, dubaiNow } from "@/lib/time"
import type { PlaceOrderInput } from "@/server/orders/schema"

export const ALL_TABLES = [
  "order_status_history", "order_items", "payments", "coupon_redemptions", "orders", "stripe_events", "payment_links", "stock_movements",
  "product_images", "products", "categories", "delivery_blackouts", "delivery_slots", "delivery_zones", "coupons", "email_outbox", "counters",
  "settings", "audit_log", "rate_limits", "customer_sessions", "customers", "otp_codes",
]

export async function wipeAll() {
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`)
  for (const t of ALL_TABLES) await db.execute(sql.raw(`DELETE FROM \`${t}\``))
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`)
}

export async function baseFixtures(opts: { stock?: number; slotCapacity?: number; price?: number; deposit?: number; minQty?: number } = {}) {
  await db.insert(counters).values({ name: "order", value: 100000 })
  const [cat] = await db.insert(categories).values({ slug: "c", nameEn: "Category", nameAr: "فئة" }).$returningId()
  const [p] = await db
    .insert(products)
    .values({ slug: "p1", sku: "P1", categoryId: cat.id, nameEn: "Bouquet", nameAr: "باقة", priceMinor: opts.price ?? 25000, depositMinor: opts.deposit ?? 0, minQty: opts.minQty ?? 1, trackStock: true, stockQty: opts.stock ?? 5, maxQty: 100 })
    .$returningId()
  const [zone] = await db.insert(deliveryZones).values({ emirate: "dubai", nameEn: "Dubai", nameAr: "دبي", feeMinor: 2500, freeOverMinor: 40000, minOrderMinor: 15000, sameDayAvailable: true }).$returningId()
  const [slot] = await db.insert(deliverySlots).values({ labelEn: "Morning", labelAr: "الصباح", startTime: "10:00", endTime: "13:00", sameDayCutoff: null, capacityPerDay: opts.slotCapacity ?? 20, daysMask: 127 }).$returningId()
  return { productId: p.id, zoneId: zone.id, slotId: slot.id, categoryId: cat.id }
}

export const tomorrow = () => addDays(dubaiNow().day, 1)

export function orderInput(fx: { productId: number; zoneId: number; slotId: number }, over: Partial<PlaceOrderInput> & { email?: string } = {}): PlaceOrderInput {
  const { email = `buyer-${randomUUID().slice(0, 8)}@example.test`, ...rest } = over
  return {
    items: [{ productId: fx.productId, quantity: 1 }],
    zoneId: fx.zoneId,
    slotId: fx.slotId,
    deliveryDate: tomorrow(),
    contact: { name: "Test Buyer", email, phone: "+971501112222" },
    recipient: { name: "Test Buyer", phone: "+971501112222" },
    address: { area: "Business Bay", street: "", building: "Tower 5", notes: "" },
    gift: { enabled: false, message: "", from: "", hideSender: false },
    corporate: { enabled: false, company: "", trn: "", poNumber: "", billingAddress: "" },
    couponCode: "",
    paymentMethod: "cod",
    customerNote: "",
    locale: "en",
    idempotencyKey: randomUUID(),
    acceptTerms: true,
    ...rest,
  }
}

export async function makeCoupon(over: Partial<typeof coupons.$inferInsert> = {}) {
  const [c] = await db.insert(coupons).values({ code: "TEST10", kind: "percent", value: 10, minOrderMinor: 0, ...over }).$returningId()
  return c.id
}
