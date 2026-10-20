import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { db } from "@/db"
import { couponRedemptions, coupons, emailOutbox, orderItems, orders, orderStatusHistory, products, stockMovements } from "@/db/schema"
import { extractVat } from "@/lib/pricing"
import { cancelUnpaidOrder, placeOrder } from "@/server/orders/place"

import { baseFixtures, makeCoupon, orderInput, tomorrow, wipeAll } from "./fixtures"
import { resetJar } from "./helpers"

let fx: Awaited<ReturnType<typeof baseFixtures>>
const stock = async () => (await db.select().from(products).where(eq(products.id, fx.productId)))[0].stockQty

beforeEach(async () => {
  resetJar()
  await wipeAll()
})

describe("placing an order", () => {
  it("prices from the database, extracts VAT, snapshots items, moves stock, queues emails, writes history", async () => {
    fx = await baseFixtures({ price: 25000, deposit: 3000, stock: 5 })
    const res = await placeOrder(orderInput(fx, { items: [{ productId: fx.productId, quantity: 2 }] }))
    expect(res).toMatchObject({ ok: true })
    if (!res.ok) return
    expect(res.orderNumber).toMatch(/^AF-100001$/)

    const [o] = await db.select().from(orders)
    // 2 x 250.00 = 500.00 (>= 400 free delivery threshold), deposit 2 x 30.00 outside VAT
    expect(o.subtotalMinor).toBe(50000)
    expect(o.deliveryFeeMinor).toBe(0)
    expect(o.vatMinor).toBe(extractVat(50000, 500))
    expect(o.depositMinor).toBe(6000)
    expect(o.totalMinor).toBe(56000)
    expect(o.status).toBe("pending")
    expect(o.paymentStatus).toBe("unpaid")
    expect(o.publicToken).toMatch(/^[0-9a-f]{32}$/)

    const items = await db.select().from(orderItems)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ sku: "P1", titleEn: "Bouquet", unitPriceMinor: 25000, quantity: 2, lineTotalMinor: 50000 })

    expect(await stock()).toBe(3)
    expect(await db.select().from(stockMovements)).toHaveLength(1)
    expect((await db.select().from(orderStatusHistory)).map((h) => h.toStatus)).toEqual(["pending"])
    const mail = await db.select().from(emailOutbox)
    expect(mail.map((m) => m.kind).sort()).toEqual(["order.received", "order.staff"])
    expect(mail.every((m) => m.status === "pending")).toBe(true)
  })

  it("ignores any client-supplied price: the DB price is always used", async () => {
    fx = await baseFixtures({ price: 25000 })
    const tampered = orderInput(fx) as Record<string, unknown>
    ;(tampered.items as Record<string, unknown>[])[0].priceMinor = 1
    ;(tampered.items as Record<string, unknown>[])[0].unitPriceMinor = 1
    tampered.totalMinor = 1
    expect((await placeOrder(tampered)).ok).toBe(true)
    const [o] = await db.select().from(orders)
    expect(o.subtotalMinor).toBe(25000)
    expect((await db.select().from(orderItems))[0].unitPriceMinor).toBe(25000)
  })

  it("is idempotent: a retry with the same key returns the same order and moves stock once", async () => {
    fx = await baseFixtures({ stock: 5 })
    const input = orderInput(fx)
    const a = await placeOrder(input)
    const b = await placeOrder(input)
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) expect(b.orderNumber).toBe(a.orderNumber)
    expect(await db.select().from(orders)).toHaveLength(1)
    expect(await stock()).toBe(4)
  })

  it("two simultaneous checkouts for the last item: exactly one wins, stock never goes negative", async () => {
    fx = await baseFixtures({ stock: 1 })
    const results = await Promise.all([placeOrder(orderInput(fx)), placeOrder(orderInput(fx))])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.find((r) => !r.ok)).toMatchObject({ ok: false, error: "unavailable" })
    expect(await stock()).toBe(0)
    expect(await db.select().from(orders)).toHaveLength(1)
  })

  it("ten simultaneous checkouts against 3 units: exactly 3 orders, stock 0", async () => {
    fx = await baseFixtures({ stock: 3 })
    const results = await Promise.all(Array.from({ length: 10 }, () => placeOrder(orderInput(fx))))
    expect(results.filter((r) => r.ok)).toHaveLength(3)
    expect(await stock()).toBe(0)
    const movements = await db.select().from(stockMovements)
    expect(movements.reduce((n, m) => n + m.delta, 0)).toBe(-3)
  })

  it("a delivery slot cannot be booked past its capacity", async () => {
    fx = await baseFixtures({ stock: 50, slotCapacity: 2 })
    const results = await Promise.all(Array.from({ length: 5 }, () => placeOrder(orderInput(fx))))
    expect(results.filter((r) => r.ok)).toHaveLength(2)
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.error === "delivery_unavailable")).toBe(true)
  })

  it("a coupon with one use can be redeemed by only one of two simultaneous orders", async () => {
    fx = await baseFixtures({ stock: 10 })
    await makeCoupon({ maxUses: 1 })
    const results = await Promise.all([placeOrder(orderInput(fx, { couponCode: "TEST10" })), placeOrder(orderInput(fx, { couponCode: "TEST10" }))])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    const [c] = await db.select().from(coupons)
    expect(c.usedCount).toBe(1)
    expect(await db.select().from(couponRedemptions)).toHaveLength(1)
  })

  it("applies a percentage coupon before VAT and the delivery threshold", async () => {
    fx = await baseFixtures({ price: 25000, stock: 10 })
    await makeCoupon({ kind: "percent", value: 10 })
    expect((await placeOrder(orderInput(fx, { couponCode: "test10", items: [{ productId: fx.productId, quantity: 2 }] }))).ok).toBe(true)
    const [o] = await db.select().from(orders)
    expect(o.discountMinor).toBe(5000)
    expect(o.totalMinor).toBe(45000) // 500 - 50 = 450 >= 400 so delivery is free
  })

  it("rejects unknown coupons, below-minimum orders, below-min quantities and past dates", async () => {
    fx = await baseFixtures({ price: 25000, stock: 10, minQty: 1 })
    expect(await placeOrder(orderInput(fx, { couponCode: "NOPE" }))).toMatchObject({ ok: false, error: "coupon" })
    await db.update(products).set({ priceMinor: 5000 })
    expect(await placeOrder(orderInput(fx))).toMatchObject({ ok: false, error: "minimum" }) // 50.00 < 150.00 minimum
    await db.update(products).set({ priceMinor: 25000 })
    expect(await placeOrder(orderInput(fx, { deliveryDate: "2020-01-01" }))).toMatchObject({ ok: false, error: "delivery_unavailable" })
  })

  it("rejects invalid input with field errors and never touches stock", async () => {
    fx = await baseFixtures({ stock: 5 })
    const bad = orderInput(fx, { corporate: { enabled: true, company: "Acme", trn: "123", poNumber: "", billingAddress: "" } })
    const res = await placeOrder(bad)
    expect(res).toMatchObject({ ok: false, error: "invalid", fieldErrors: { trn: "trn" } })
    expect(await stock()).toBe(5)
  })

  it("cash on delivery above the cap is refused", async () => {
    fx = await baseFixtures({ price: 200000, stock: 5 })
    expect(await placeOrder(orderInput(fx))).toMatchObject({ ok: false, error: "payment_unavailable" })
  })

  it("cancelling an unpaid order returns stock exactly once", async () => {
    fx = await baseFixtures({ stock: 5 })
    await placeOrder(orderInput(fx, { items: [{ productId: fx.productId, quantity: 2 }] }))
    const [o] = await db.select().from(orders)
    expect(await stock()).toBe(3)
    expect(await cancelUnpaidOrder(o.id, "test")).toBe(true)
    expect(await stock()).toBe(5)
    expect(await cancelUnpaidOrder(o.id, "test")).toBe(false)
    expect(await stock()).toBe(5)
    expect((await db.select().from(orders))[0].status).toBe("cancelled")
  })

  it("order numbers are sequential and unique under concurrency", async () => {
    fx = await baseFixtures({ stock: 20 })
    const results = await Promise.all(Array.from({ length: 6 }, () => placeOrder(orderInput(fx))))
    const numbers = results.flatMap((r) => (r.ok ? [r.orderNumber] : []))
    expect(new Set(numbers).size).toBe(6)
    expect(numbers.sort()[0]).toBe("AF-100001")
  })

  it("delivery date in the DB is the one chosen", async () => {
    fx = await baseFixtures()
    await placeOrder(orderInput(fx))
    const [row] = (await db.execute(sql`SELECT delivery_date FROM orders`))[0] as unknown as { delivery_date: string }[]
    expect(String(row.delivery_date)).toContain(tomorrow())
  })
})
