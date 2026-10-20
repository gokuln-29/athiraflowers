import { describe, expect, it } from "vitest"

import { discountFor, extractVat, priceLine, priceOrder, type PricedProduct } from "@/lib/pricing"
import { slotRule } from "@/server/delivery/availability"
import { addDays, dubaiNow } from "@/lib/time"

const product = (over: Partial<PricedProduct> = {}): PricedProduct => ({
  id: 1, sku: "X", priceMinor: 29500, pricingType: "one_time", depositMinor: 0, minQty: 1, maxQty: 100,
  trackStock: true, stockQty: 10, isActive: true, ...over,
})

describe("priceLine", () => {
  it("multiplies the DB price by the quantity and ignores everything else", () => {
    const l = priceLine(product(), 3)
    expect(l.unitPriceMinor).toBe(29500)
    expect(l.lineTotalMinor).toBe(88500)
    expect(l.issues).toEqual([])
  })
  it("flags quantity problems instead of silently clamping", () => {
    expect(priceLine(product({ minQty: 5 }), 2).issues).toEqual([{ code: "below_min", min: 5 }])
    expect(priceLine(product({ maxQty: 4 }), 9).issues).toEqual([{ code: "above_max", max: 4 }])
    expect(priceLine(product({ stockQty: 2 }), 3).issues).toEqual([{ code: "insufficient_stock", available: 2 }])
    expect(priceLine(product({ stockQty: 0 }), 1).issues).toEqual([{ code: "unavailable" }])
    expect(priceLine(product(), 0).issues).toEqual([{ code: "invalid_quantity" }])
    expect(priceLine(product(), 1.5).issues).toEqual([{ code: "invalid_quantity" }])
    expect(priceLine(product({ isActive: false }), 1).issues).toContainEqual({ code: "unavailable" })
  })
  it("does not track stock for untracked items (programs)", () => {
    expect(priceLine(product({ trackStock: false, stockQty: 0, pricingType: "subscription", minQty: 4 }), 4).issues).toEqual([])
  })
  it("deposit is per unit and separate from the line total", () => {
    const l = priceLine(product({ depositMinor: 15000, pricingType: "subscription" }), 4)
    expect(l.depositMinor).toBe(60000)
    expect(l.lineTotalMinor).toBe(118000)
  })
})

describe("VAT", () => {
  it("extracts 5% from a VAT-inclusive amount", () => {
    expect(extractVat(10500, 500)).toBe(500)
    expect(extractVat(29500, 500)).toBe(Math.round(29500 * 5 / 105))
    expect(extractVat(0, 500)).toBe(0)
  })
})

describe("coupons", () => {
  it("percent with cap, fixed, minimum order, never exceeding the subtotal", () => {
    const pct = { kind: "percent" as const, value: 10, minOrderMinor: 20000, maxDiscountMinor: 10000 }
    expect(discountFor(pct, 50000)).toBe(5000)
    expect(discountFor(pct, 200000)).toBe(10000)
    expect(discountFor(pct, 19999)).toBe(0)
    expect(discountFor({ kind: "fixed", value: 99999, minOrderMinor: 0, maxDiscountMinor: null }, 5000)).toBe(5000)
    expect(discountFor(null, 5000)).toBe(0)
  })
})

describe("priceOrder", () => {
  const zone = { feeMinor: 2500, freeOverMinor: 40000, minOrderMinor: 15000 }
  const lines = (n: number) => [priceLine(product(), n)]

  it("adds delivery, extracts VAT from the taxable total, and adds the deposit outside VAT", () => {
    const l = [priceLine(product({ depositMinor: 15000 }), 2)]
    const o = priceOrder({ lines: l, zone, slotFeeMinor: 2000, vatBps: 500 })
    expect(o.subtotalMinor).toBe(59000)
    expect(o.freeDelivery).toBe(true) // 590 >= 400
    expect(o.deliveryFeeMinor).toBe(0)
    expect(o.taxableMinor).toBe(61000)
    expect(o.vatMinor).toBe(extractVat(61000, 500))
    expect(o.depositMinor).toBe(30000)
    expect(o.totalMinor).toBe(91000)
  })
  it("charges the delivery fee below the free threshold", () => {
    const o = priceOrder({ lines: [priceLine(product({ priceMinor: 20000 }), 1)], zone, vatBps: 500 })
    expect(o.deliveryFeeMinor).toBe(2500)
    expect(o.totalMinor).toBe(22500)
  })
  it("applies the coupon before the delivery threshold and VAT", () => {
    const o = priceOrder({ lines: lines(2), zone, coupon: { kind: "percent", value: 10, minOrderMinor: 0, maxDiscountMinor: null }, vatBps: 500 })
    expect(o.discountMinor).toBe(5900)
    expect(o.taxableMinor).toBe(59000 - 5900)
  })
  it("reports zone and store minimums", () => {
    const o = priceOrder({ lines: [priceLine(product({ priceMinor: 9000 }), 1)], zone, storeMinOrderMinor: 12000, vatBps: 500 })
    expect(o.issues).toContainEqual({ code: "below_zone_minimum", minMinor: 15000 })
    expect(o.issues).toContainEqual({ code: "below_store_minimum", minMinor: 12000 })
  })
  it("empty carts are an issue", () => {
    expect(priceOrder({ lines: [], zone, vatBps: 500 }).issues).toEqual([{ code: "empty" }])
  })
  it("total always equals taxable + deposit and is an integer", () => {
    for (let q = 1; q <= 40; q++) {
      const o = priceOrder({ lines: [priceLine(product({ priceMinor: 12345 + q, depositMinor: q * 7 }), q)], zone, coupon: { kind: "percent", value: 7, minOrderMinor: 0, maxDiscountMinor: null }, slotFeeMinor: q % 2 ? 2000 : 0, vatBps: 500 })
      expect(Number.isInteger(o.totalMinor)).toBe(true)
      expect(o.totalMinor).toBe(o.taxableMinor + o.depositMinor)
      expect(o.vatMinor).toBeLessThanOrEqual(o.taxableMinor)
    }
  })
})

describe("delivery slot rules (Asia/Dubai)", () => {
  const slot = { startTime: "16:00", sameDayCutoff: "14:00", daysMask: 127 }
  const cart = { maxLeadHours: 0, sameDayOk: true }
  const zone = { emirate: "dubai" as const, sameDayAvailable: true }
  // 2026-10-20 12:00 UTC = 16:00 in Dubai
  const at = (utc: string) => dubaiNow(new Date(utc))
  const base = { slot, cart, zone, blackout: false, booked: 0, capacity: 20 }

  it("computes Dubai local time from UTC", () => {
    expect(at("2026-10-20T20:30:00Z")).toMatchObject({ day: "2026-10-21", minutes: 30 })
  })
  it("same day is open before the cut-off and closed after it", () => {
    expect(slotRule({ ...base, now: at("2026-10-20T08:00:00Z"), day: "2026-10-20" }).available).toBe(true) // 12:00 Dubai
    expect(slotRule({ ...base, now: at("2026-10-20T10:30:00Z"), day: "2026-10-20" })).toEqual({ available: false, reason: "cutoff" }) // 14:30 Dubai
  })
  it("same day is refused for items that cannot be delivered same day, or zones without it", () => {
    const now = at("2026-10-20T04:00:00Z")
    expect(slotRule({ ...base, now, day: "2026-10-20", cart: { ...cart, sameDayOk: false } }).reason).toBe("same_day_not_allowed")
    expect(slotRule({ ...base, now, day: "2026-10-20", zone: { ...zone, sameDayAvailable: false } }).reason).toBe("same_day_not_allowed")
  })
  it("lead time blocks near days for event decor", () => {
    const now = at("2026-10-20T04:00:00Z") // 08:00 Dubai
    const decor = { maxLeadHours: 96, sameDayOk: false }
    expect(slotRule({ ...base, now, day: addDays("2026-10-20", 2), cart: decor }).reason).toBe("lead_time")
    expect(slotRule({ ...base, now, day: addDays("2026-10-20", 5), cart: decor }).available).toBe(true)
  })
  it("blackouts, weekday masks, capacity and the past", () => {
    const now = at("2026-10-20T04:00:00Z")
    expect(slotRule({ ...base, now, day: "2026-10-22", blackout: true }).reason).toBe("blackout")
    expect(slotRule({ ...base, now, day: "2026-10-23", slot: { ...slot, daysMask: 127 & ~(1 << 5) } }).reason).toBe("weekday") // 2026-10-23 is a Friday
    expect(slotRule({ ...base, now, day: "2026-10-22", booked: 20 }).reason).toBe("full")
    expect(slotRule({ ...base, now, day: "2026-10-19" }).reason).toBe("past")
  })
})
