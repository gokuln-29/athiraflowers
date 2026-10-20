import "server-only"
import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { coupons, couponRedemptions, deliveryZones } from "@/db/schema"
import { site } from "@/config/site"
import { priceLine, priceOrder, type LineIssue, type OrderIssue, type PricedOrder, type PricingCoupon } from "@/lib/pricing"
import type { MediaLite } from "@/lib/media"
import { getProductsForCart } from "@/server/queries/catalog"
import { getSettings } from "@/server/queries/content"

export const cartItemSchema = z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(1000) })
export const quoteInputSchema = z.object({
  items: z.array(cartItemSchema).max(40),
  zoneId: z.number().int().positive().nullish(),
  slotFeeMinor: z.never().optional(), // prices are never accepted from the client
  slotId: z.number().int().positive().nullish(),
  couponCode: z.string().trim().max(40).nullish(),
  email: z.string().trim().toLowerCase().email().max(254).nullish(),
  locale: z.enum(["en", "ar"]).default("en"),
})
export type QuoteInput = z.infer<typeof quoteInputSchema>

export type QuoteLine = {
  productId: number
  slug: string
  sku: string
  name: string
  nameEn: string
  nameAr: string
  image: MediaLite | null
  pricingType: "one_time" | "subscription" | "rental"
  billingInterval: "week" | "month" | null
  rentalDays: number | null
  quantity: number
  minQty: number
  unitPriceMinor: number
  lineTotalMinor: number
  depositUnitMinor: number
  depositMinor: number
  leadTimeHours: number
  sameDayEligible: boolean
  issues: LineIssue[]
}

export type CouponStatus = { code: string; valid: boolean; reason?: "unknown" | "inactive" | "expired" | "not_started" | "used_up" | "already_used" | "min_order" }

export type Quote = {
  lines: QuoteLine[]
  order: PricedOrder
  zone: { id: number; emirate: "dubai" | "abu_dhabi" | "sharjah"; name: string; feeMinor: number; freeOverMinor: number | null; minOrderMinor: number; sameDayAvailable: boolean } | null
  slotFeeMinor: number
  coupon: CouponStatus | null
  storeMinOrderMinor: number
  /** Constraints used by delivery availability. */
  cart: { maxLeadHours: number; sameDayOk: boolean }
  issues: OrderIssue[]
}

export type LoadedCoupon = { row: typeof coupons.$inferSelect; pricing: PricingCoupon }

/** Validate a coupon code against the DB. `email` enables the per-customer limit. */
export async function loadCoupon(code: string, email?: string | null, now = new Date()): Promise<{ status: CouponStatus; coupon?: LoadedCoupon }> {
  const normalised = code.trim().toUpperCase()
  const [row] = await db.select().from(coupons).where(eq(coupons.code, normalised)).limit(1)
  if (!row) return { status: { code: normalised, valid: false, reason: "unknown" } }
  if (!row.isActive) return { status: { code: normalised, valid: false, reason: "inactive" } }
  if (row.startsAt && row.startsAt > now) return { status: { code: normalised, valid: false, reason: "not_started" } }
  if (row.endsAt && row.endsAt < now) return { status: { code: normalised, valid: false, reason: "expired" } }
  if (row.maxUses != null && row.usedCount >= row.maxUses) return { status: { code: normalised, valid: false, reason: "used_up" } }
  if (email && row.perCustomerLimit > 0) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)` })
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, row.id), eq(couponRedemptions.email, email)))
    if (Number(n) >= row.perCustomerLimit) return { status: { code: normalised, valid: false, reason: "already_used" } }
  }
  return {
    status: { code: normalised, valid: true },
    coupon: { row, pricing: { kind: row.kind, value: row.value, minOrderMinor: row.minOrderMinor, maxDiscountMinor: row.maxDiscountMinor } },
  }
}

/**
 * Prices a cart entirely from the database. Duplicate product ids are merged.
 * The same function backs the cart UI, the checkout summary and order placement.
 */
export async function quoteCart(raw: QuoteInput, opts: { slotFeeMinor?: number } = {}): Promise<Quote> {
  const input = quoteInputSchema.parse(raw)
  const merged = new Map<number, number>()
  for (const i of input.items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantity)

  const rows = await getProductsForCart([...merged.keys()], input.locale)
  const byId = new Map(rows.map((r) => [r.id, r]))
  const lines: QuoteLine[] = []
  for (const [productId, quantity] of merged) {
    const p = byId.get(productId)
    if (!p) {
      lines.push({
        productId, slug: "", sku: "", name: "", nameEn: "", nameAr: "", image: null, pricingType: "one_time", billingInterval: null, rentalDays: null,
        quantity, minQty: 1, unitPriceMinor: 0, lineTotalMinor: 0, depositUnitMinor: 0, depositMinor: 0, leadTimeHours: 0, sameDayEligible: false,
        issues: [{ code: "unavailable" }],
      })
      continue
    }
    const priced = priceLine(
      { id: p.id, sku: p.sku, priceMinor: p.priceMinor, pricingType: p.pricingType, depositMinor: p.depositMinor, minQty: p.minQty, maxQty: p.maxQty, trackStock: p.trackStock, stockQty: p.stockQty, isActive: p.isActive },
      quantity
    )
    lines.push({
      productId: p.id, slug: p.slug, sku: p.sku, name: p.name, nameEn: p.nameEn, nameAr: p.nameAr, image: p.image, pricingType: p.pricingType,
      billingInterval: p.billingInterval, rentalDays: p.rentalDays, quantity: priced.quantity, minQty: p.minQty, unitPriceMinor: priced.unitPriceMinor,
      lineTotalMinor: priced.lineTotalMinor, depositUnitMinor: priced.depositUnitMinor, depositMinor: priced.depositMinor, leadTimeHours: p.leadTimeHours,
      sameDayEligible: p.sameDayEligible, issues: priced.issues,
    })
  }

  let zone: Quote["zone"] = null
  if (input.zoneId) {
    const [z] = await db.select().from(deliveryZones).where(and(eq(deliveryZones.id, input.zoneId), eq(deliveryZones.isActive, true))).limit(1)
    if (z) zone = { id: z.id, emirate: z.emirate, name: input.locale === "ar" && z.nameAr ? z.nameAr : z.nameEn, feeMinor: z.feeMinor, freeOverMinor: z.freeOverMinor, minOrderMinor: z.minOrderMinor, sameDayAvailable: z.sameDayAvailable }
  }

  let couponStatus: CouponStatus | null = null
  let pricingCoupon: PricingCoupon | null = null
  if (input.couponCode) {
    const loaded = await loadCoupon(input.couponCode, input.email)
    couponStatus = loaded.status
    pricingCoupon = loaded.coupon?.pricing ?? null
  }

  const settings = await getSettings()
  const storeMin = Number((settings.checkout as { minOrderMinor?: number }).minOrderMinor ?? 0)
  const order = priceOrder({
    lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPriceMinor: l.unitPriceMinor, lineTotalMinor: l.lineTotalMinor, depositUnitMinor: l.depositUnitMinor, depositMinor: l.depositMinor, issues: l.issues })),
    zone,
    slotFeeMinor: opts.slotFeeMinor ?? 0,
    coupon: pricingCoupon,
    storeMinOrderMinor: storeMin,
    vatBps: site.vatBps,
  })
  if (couponStatus?.valid && order.issues.some((i) => i.code === "coupon_min_order")) couponStatus = { ...couponStatus, valid: false, reason: "min_order" }

  return {
    lines, order, zone, slotFeeMinor: opts.slotFeeMinor ?? 0, coupon: couponStatus, storeMinOrderMinor: storeMin,
    cart: { maxLeadHours: Math.max(0, ...lines.map((l) => l.leadTimeHours)), sameDayOk: lines.every((l) => l.sameDayEligible && l.leadTimeHours < 24) },
    issues: order.issues,
  }
}
