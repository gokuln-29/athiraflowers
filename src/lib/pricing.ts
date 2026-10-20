/**
 * The ONLY place prices are computed. Server-side, from DB rows.
 * The client sends productId + quantity; it never sends (and the server never trusts) a price.
 *
 * Conventions:
 *  - All amounts are integer fils (AED minor units).
 *  - Catalogue prices, delivery fees and slot fees are VAT-inclusive.
 *  - The refundable deposit is outside the VAT base and is added after VAT.
 *  - VAT is extracted once from the taxable total: round(taxable * bps / (10000 + bps)).
 */

export type PricedProduct = {
  id: number
  sku: string
  priceMinor: number
  pricingType: "one_time" | "subscription" | "rental"
  depositMinor: number
  minQty: number
  maxQty: number
  trackStock: boolean
  stockQty: number
  isActive: boolean
}

export type LineIssue =
  | { code: "unavailable" }
  | { code: "below_min"; min: number }
  | { code: "above_max"; max: number }
  | { code: "insufficient_stock"; available: number }
  | { code: "invalid_quantity" }

export type PricedLine = {
  productId: number
  quantity: number
  unitPriceMinor: number
  lineTotalMinor: number
  depositUnitMinor: number
  depositMinor: number
  issues: LineIssue[]
}

/** Price a single line from the product row. Never reads anything client-supplied except the quantity. */
export function priceLine(product: PricedProduct, quantity: number): PricedLine {
  const issues: LineIssue[] = []
  if (!Number.isInteger(quantity) || quantity < 1) issues.push({ code: "invalid_quantity" })
  if (!product.isActive) issues.push({ code: "unavailable" })
  if (Number.isInteger(quantity) && quantity >= 1) {
    if (quantity < product.minQty) issues.push({ code: "below_min", min: product.minQty })
    if (quantity > product.maxQty) issues.push({ code: "above_max", max: product.maxQty })
    if (product.trackStock && quantity > product.stockQty) {
      issues.push(product.stockQty <= 0 ? { code: "unavailable" } : { code: "insufficient_stock", available: product.stockQty })
    }
  }
  const qty = Number.isInteger(quantity) && quantity > 0 ? quantity : 0
  return {
    productId: product.id,
    quantity: qty,
    unitPriceMinor: product.priceMinor,
    lineTotalMinor: product.priceMinor * qty,
    depositUnitMinor: product.depositMinor,
    depositMinor: product.depositMinor * qty,
    issues,
  }
}

export type PricingCoupon = {
  kind: "percent" | "fixed"
  value: number
  minOrderMinor: number
  maxDiscountMinor: number | null
}

export type PricingZone = { feeMinor: number; freeOverMinor: number | null; minOrderMinor: number }

export type OrderIssue =
  | { code: "empty" }
  | { code: "below_zone_minimum"; minMinor: number }
  | { code: "below_store_minimum"; minMinor: number }
  | { code: "coupon_min_order"; minMinor: number }

export type PricedOrder = {
  lines: PricedLine[]
  subtotalMinor: number
  discountMinor: number
  deliveryFeeMinor: number
  slotFeeMinor: number
  /** subtotal - discount + delivery + slot fee (VAT-inclusive). */
  taxableMinor: number
  vatMinor: number
  depositMinor: number
  totalMinor: number
  vatBps: number
  freeDelivery: boolean
  issues: OrderIssue[]
  hasLineIssues: boolean
}

export function discountFor(coupon: PricingCoupon | null | undefined, subtotalMinor: number): number {
  if (!coupon || subtotalMinor <= 0 || subtotalMinor < coupon.minOrderMinor) return 0
  const raw = coupon.kind === "percent" ? Math.round((subtotalMinor * coupon.value) / 100) : coupon.value
  const capped = coupon.maxDiscountMinor != null ? Math.min(raw, coupon.maxDiscountMinor) : raw
  return Math.max(0, Math.min(capped, subtotalMinor))
}

export const extractVat = (taxableMinor: number, vatBps: number) => Math.round((taxableMinor * vatBps) / (10_000 + vatBps))

export function priceOrder(input: {
  lines: PricedLine[]
  zone: PricingZone | null
  slotFeeMinor?: number
  coupon?: PricingCoupon | null
  storeMinOrderMinor?: number
  vatBps: number
}): PricedOrder {
  const { lines, zone, coupon, vatBps } = input
  const issues: OrderIssue[] = []
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotalMinor, 0)
  const deposit = lines.reduce((sum, l) => sum + l.depositMinor, 0)
  if (lines.length === 0 || subtotal === 0) issues.push({ code: "empty" })

  if (coupon && subtotal > 0 && subtotal < coupon.minOrderMinor) issues.push({ code: "coupon_min_order", minMinor: coupon.minOrderMinor })
  const discount = discountFor(coupon, subtotal)
  const afterDiscount = subtotal - discount

  const storeMin = input.storeMinOrderMinor ?? 0
  if (subtotal > 0 && storeMin > 0 && afterDiscount < storeMin) issues.push({ code: "below_store_minimum", minMinor: storeMin })
  if (zone && subtotal > 0 && zone.minOrderMinor > 0 && afterDiscount < zone.minOrderMinor) issues.push({ code: "below_zone_minimum", minMinor: zone.minOrderMinor })

  const freeDelivery = !!zone && zone.freeOverMinor != null && afterDiscount >= zone.freeOverMinor
  const delivery = zone ? (freeDelivery ? 0 : zone.feeMinor) : 0
  const slotFee = input.slotFeeMinor ?? 0
  const taxable = afterDiscount + delivery + slotFee
  const vat = extractVat(taxable, vatBps)

  return {
    lines,
    subtotalMinor: subtotal,
    discountMinor: discount,
    deliveryFeeMinor: delivery,
    slotFeeMinor: slotFee,
    taxableMinor: taxable,
    vatMinor: vat,
    depositMinor: deposit,
    totalMinor: taxable + deposit,
    vatBps,
    freeDelivery,
    issues,
    hasLineIssues: lines.some((l) => l.issues.length > 0),
  }
}
