import "server-only"
import { and, eq, inArray, ne, sql } from "drizzle-orm"
import { after } from "next/server"

import { db, type Tx } from "@/db"
import {
  counters, couponRedemptions, coupons, deliverySlots, orderItems, orders, orderStatusHistory, products, stockMovements,
} from "@/db/schema"
import { absoluteUrl, site } from "@/config/site"
import { env } from "@/lib/env"
import { priceLine, priceOrder, type PricedProduct } from "@/lib/pricing"
import { getCheckoutOptions } from "@/server/checkout/options"
import { getAvailability } from "@/server/delivery/availability"
import { flushOutbox, queueEmail } from "@/server/email/outbox"
import { orderReceivedEmail, staffOrderEmail, type OrderEmailData } from "@/server/email/order-emails"
import { getCustomer } from "@/server/auth/customer-session"
import { stripeConfigured, getStripe } from "@/server/payments/stripe"
import { audit } from "@/server/security/audit"
import { hmacHex, randomHex } from "@/server/security/crypto"
import { rateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"
import { loadCoupon } from "@/server/cart/quote"
import { getSettings } from "@/server/queries/content"

import { placeOrderSchema, type PlaceOrderInput } from "./schema"

export type PlaceOrderError =
  | "invalid" | "rate_limited" | "unavailable" | "prices_changed" | "delivery_unavailable" | "payment_unavailable" | "coupon" | "minimum" | "failed"

export type PlaceOrderResult =
  | { ok: true; redirectUrl: string; orderNumber: string }
  | { ok: false; error: PlaceOrderError; fieldErrors?: Record<string, string> }

class Rejected extends Error {
  constructor(public code: PlaceOrderError) {
    super(code)
  }
}

const FIELD_MAP: Record<string, string> = {
  "contact.name": "name", "contact.email": "email", "contact.phone": "phone", "recipient.name": "recipientName", "recipient.phone": "recipientPhone",
  "address.area": "area", "address.building": "building", "gift.message": "giftMessage", "corporate.company": "company", "corporate.trn": "trn",
  acceptTerms: "accept", deliveryDate: "date", slotId: "slot", zoneId: "zone",
}

const emailData = (o: typeof orders.$inferSelect, items: (typeof orderItems.$inferSelect)[]): OrderEmailData => ({
  locale: o.locale, orderNumber: o.orderNumber, publicToken: o.publicToken, contactName: o.contactName, contactEmail: o.contactEmail,
  paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, status: o.status, deliveryDate: o.deliveryDate, slotLabel: o.slotLabel,
  emirate: o.emirate, area: o.area, building: o.building, invoiceRequested: o.invoiceRequested,
  totals: { subtotalMinor: o.subtotalMinor, discountMinor: o.discountMinor, deliveryFeeMinor: o.deliveryFeeMinor, depositMinor: o.depositMinor, vatMinor: o.vatMinor, totalMinor: o.totalMinor },
  items: items.map((i) => ({ title: o.locale === "ar" && i.titleAr ? i.titleAr : i.titleEn, quantity: i.quantity, lineTotalMinor: i.lineTotalMinor })),
})
export { emailData }

/**
 * Creates an order. The server recomputes everything from the database; the client supplies ids and quantities only.
 * Product and slot rows are locked in a fixed order so two simultaneous checkouts can never oversell.
 */
export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = FIELD_MAP[issue.path.join(".")] ?? issue.path.join(".")
      fieldErrors[key] ??= issue.message === "phone" || issue.message === "trn" ? issue.message : "required"
    }
    return { ok: false, error: "invalid", fieldErrors }
  }
  const input = parsed.data
  const ctx = await requestContext()

  const byIp = await rateLimit(`checkout:ip:${ctx.ipHash}`, 12, 3600)
  const byEmail = await rateLimit(`checkout:email:${hmacHex(input.contact.email, "email")}`, 8, 3600)
  if (!byIp.allowed || !byEmail.allowed) return { ok: false, error: "rate_limited" }

  // Idempotency: a retry or double click returns the same order.
  const existing = await findByKey(input.idempotencyKey)
  if (existing) return { ok: true, redirectUrl: confirmationUrl(input.locale, existing.publicToken), orderNumber: existing.orderNumber }

  try {
    // 1. Price + delivery validation outside the transaction (cheap rejects).
    const options = await getCheckoutOptions({ items: input.items, zoneId: input.zoneId, slotId: input.slotId, couponCode: input.couponCode || null, email: input.contact.email, locale: input.locale, withAvailability: false })
    const quote = options.quote
    if (!quote.zone) throw new Rejected("delivery_unavailable")
    if (quote.order.hasLineIssues) throw new Rejected("unavailable")
    if (quote.order.issues.some((i) => i.code === "below_zone_minimum" || i.code === "below_store_minimum")) throw new Rejected("minimum")
    if (input.couponCode && !quote.coupon?.valid) throw new Rejected("coupon")

    const availability = await getAvailability({ cart: quote.cart, zone: { emirate: quote.zone.emirate, sameDayAvailable: quote.zone.sameDayAvailable }, days: 60 })
    const slotView = availability.find((d) => d.day === input.deliveryDate)?.slots.find((s) => s.slot.id === input.slotId)
    if (!slotView?.available) throw new Rejected("delivery_unavailable")
    const slotRow = slotView.slot

    const settings = await getSettings()
    if (input.paymentMethod === "cod" && (!settings.checkout.codEnabled || quote.order.totalMinor > settings.checkout.codMaxMinor)) throw new Rejected("payment_unavailable")
    if (input.paymentMethod === "stripe" && (!settings.checkout.stripeEnabled || !stripeConfigured())) throw new Rejected("payment_unavailable")

    const customer = await getCustomer()
    const loadedCoupon = input.couponCode ? await loadCoupon(input.couponCode, input.contact.email) : null

    // 2. The transaction: lock, re-check, decrement, insert.
    const created = await db.transaction(async (tx) => {
      const ids = [...new Set(input.items.map((i) => i.productId))].sort((a, b) => a - b)
      const locked = await tx.select().from(products).where(inArray(products.id, ids)).orderBy(products.id).for("update")
      const byId = new Map(locked.map((p) => [p.id, p]))

      // Re-price against the locked rows: if anything moved since the quote, stop.
      const merged = new Map<number, number>()
      for (const i of input.items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantity)
      const lines = []
      for (const [productId, qty] of merged) {
        const p = byId.get(productId)
        if (!p) throw new Rejected("unavailable")
        const priced = priceLine(toPriced(p), qty)
        if (priced.issues.length) throw new Rejected(priced.issues.some((x) => x.code === "insufficient_stock" || x.code === "unavailable") ? "unavailable" : "failed")
        lines.push({ p, priced })
      }
      const reprice = priceOrder({
        lines: lines.map((l) => l.priced),
        zone: { feeMinor: quote.zone!.feeMinor, freeOverMinor: quote.zone!.freeOverMinor, minOrderMinor: quote.zone!.minOrderMinor },
        slotFeeMinor: slotRow.extraFeeMinor,
        coupon: loadedCoupon?.coupon?.pricing ?? null,
        storeMinOrderMinor: quote.storeMinOrderMinor,
        vatBps: site.vatBps,
      })
      if (reprice.totalMinor !== quote.order.totalMinor) throw new Rejected("prices_changed")

      // Serialise bookings per slot, then check capacity.
      const [slot] = await tx.select().from(deliverySlots).where(eq(deliverySlots.id, slotRow.id)).for("update")
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)` })
        .from(orders)
        .where(and(eq(orders.deliveryDate, input.deliveryDate), eq(orders.slotId, slot.id), ne(orders.status, "cancelled"), ne(orders.status, "refunded")))
      if (Number(n) >= slot.capacityPerDay) throw new Rejected("delivery_unavailable")

      // Coupon limits under lock.
      let couponId: number | null = null
      if (loadedCoupon?.coupon) {
        const [c] = await tx.select().from(coupons).where(eq(coupons.id, loadedCoupon.coupon.row.id)).for("update")
        if (!c.isActive || (c.maxUses != null && c.usedCount >= c.maxUses)) throw new Rejected("coupon")
        couponId = c.id
      }

      // Decrement stock; the CHECK constraint and the WHERE guard both refuse to go negative.
      for (const { p, priced } of lines) {
        if (!p.trackStock) continue
        const [res] = await tx.update(products).set({ stockQty: sql`${products.stockQty} - ${priced.quantity}` }).where(and(eq(products.id, p.id), sql`${products.stockQty} >= ${priced.quantity}`))
        if (res.affectedRows !== 1) throw new Rejected("unavailable")
      }

      // Human-facing number from a gap-tolerant counter.
      await tx.update(counters).set({ value: sql`LAST_INSERT_ID(${counters.value} + 1)` }).where(eq(counters.name, "order"))
      const [{ n: seq }] = (await tx.execute(sql`SELECT LAST_INSERT_ID() AS n`)).at(0) as unknown as [{ n: number }]
      const orderNumber = `${site.orderPrefix}-${seq}`
      const publicToken = randomHex(32)

      const gift = input.gift.enabled
      const corp = input.corporate.enabled
      const [row] = await tx
        .insert(orders)
        .values({
          orderNumber, publicToken, idempotencyKey: input.idempotencyKey, customerId: customer?.id ?? null, locale: input.locale,
          status: "pending", paymentMethod: input.paymentMethod, paymentStatus: "unpaid",
          contactName: input.contact.name, contactEmail: input.contact.email, contactPhone: input.contact.phone,
          recipientName: input.recipient.name, recipientPhone: input.recipient.phone, emirate: quote.zone!.emirate, zoneId: quote.zone!.id, zoneName: quote.zone!.name,
          area: input.address.area, street: input.address.street || null, building: input.address.building, addressNotes: input.address.notes || null,
          deliveryDate: input.deliveryDate, slotId: slot.id, slotLabel: input.locale === "ar" && slot.labelAr ? slot.labelAr : slot.labelEn,
          isGift: gift, giftMessage: gift ? input.gift.message || null : null, giftFrom: gift ? input.gift.from || null : null, hideSender: gift ? input.gift.hideSender : false,
          companyName: corp ? input.corporate.company || null : null, companyTrn: corp ? input.corporate.trn || null : null, poNumber: corp ? input.corporate.poNumber || null : null,
          invoiceRequested: corp, billingAddress: corp ? input.corporate.billingAddress || null : null, customerNote: input.customerNote || null,
          currency: site.currency, subtotalMinor: reprice.subtotalMinor, discountMinor: reprice.discountMinor, deliveryFeeMinor: reprice.deliveryFeeMinor + reprice.slotFeeMinor,
          depositMinor: reprice.depositMinor, vatMinor: reprice.vatMinor, vatBps: site.vatBps, totalMinor: reprice.totalMinor,
          couponId, couponCode: loadedCoupon?.coupon ? loadedCoupon.coupon.row.code : null, ipHash: ctx.ipHash,
        })
        .$returningId()

      const itemRows = lines.map(({ p, priced }) => ({
        orderId: row.id, productId: p.id, sku: p.sku, titleEn: p.nameEn, titleAr: p.nameAr, pricingType: p.pricingType,
        unitPriceMinor: priced.unitPriceMinor, quantity: priced.quantity, lineTotalMinor: priced.lineTotalMinor, depositUnitMinor: priced.depositUnitMinor,
        meta: { billingInterval: p.billingInterval ?? undefined, rentalDays: p.rentalDays ?? undefined },
      }))
      await tx.insert(orderItems).values(itemRows)
      await tx.insert(orderStatusHistory).values({ orderId: row.id, fromStatus: null, toStatus: "pending", actorType: "customer", note: "Order placed" })
      for (const { p, priced } of lines) {
        if (p.trackStock) await tx.insert(stockMovements).values({ productId: p.id, delta: -priced.quantity, reason: "order", orderId: row.id })
      }
      if (couponId) {
        await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, couponId))
        await tx.insert(couponRedemptions).values({ couponId, orderId: row.id, email: input.contact.email, discountMinor: reprice.discountMinor })
      }

      const [order] = await tx.select().from(orders).where(eq(orders.id, row.id))
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, row.id))
      // Emails are queued inside the transaction: they exist only if the order was saved.
      const data = emailData(order, items)
      await queueEmail(tx, orderReceivedEmail(data))
      const notify = env().NOTIFY_EMAIL
      if (notify) await queueEmail(tx, staffOrderEmail(notify, data, "New order", absoluteUrl(`/admin/orders/${order.id}`)))
      return { order, items }
    })

    await audit({ actorType: "customer", actorId: customer?.id ?? null, action: "order.placed", entity: "order", entityId: created.order.id, meta: { orderNumber: created.order.orderNumber, method: input.paymentMethod }, ipHash: ctx.ipHash })
    after(() => flushOutbox().catch((e) => console.error("[outbox]", e.message)))

    if (input.paymentMethod === "cod") {
      return { ok: true, redirectUrl: confirmationUrl(input.locale, created.order.publicToken), orderNumber: created.order.orderNumber }
    }

    // 3. Card: hosted Stripe Checkout. The webhook, and only the webhook, marks the order paid.
    try {
      const url = await createCheckoutSession(created.order)
      return { ok: true, redirectUrl: url, orderNumber: created.order.orderNumber }
    } catch (error) {
      console.error("[stripe] could not create checkout session", (error as Error).message)
      await cancelUnpaidOrder(created.order.id, "Payment provider unavailable")
      return { ok: false, error: "payment_unavailable" }
    }
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, error: error.code }
    console.error("[place-order]", error)
    return { ok: false, error: "failed" }
  }
}

const toPriced = (p: typeof products.$inferSelect): PricedProduct => ({
  id: p.id, sku: p.sku, priceMinor: p.priceMinor, pricingType: p.pricingType, depositMinor: p.depositMinor, minQty: p.minQty, maxQty: p.maxQty,
  trackStock: p.trackStock, stockQty: p.stockQty, isActive: p.isActive,
})

async function findByKey(key: string) {
  const [row] = await db.select({ publicToken: orders.publicToken, orderNumber: orders.orderNumber }).from(orders).where(eq(orders.idempotencyKey, key)).limit(1)
  return row
}

export const confirmationUrl = (locale: string, token: string) => absoluteUrl(`/${locale}/order/${token}`)

/** One line item for the whole order: Stripe's amount is always exactly our total, in fils. */
export async function createCheckoutSession(order: typeof orders.$inferSelect): Promise<string> {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: String(order.id),
      customer_email: order.contactEmail,
      locale: order.locale === "ar" ? "ar" : "en",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: order.currency.toLowerCase(),
            unit_amount: order.totalMinor,
            product_data: { name: `${site.name} order ${order.orderNumber}` },
          },
        },
      ],
      metadata: { order_id: String(order.id), order_number: order.orderNumber },
      payment_intent_data: { metadata: { order_id: String(order.id), order_number: order.orderNumber } },
      success_url: `${confirmationUrl(order.locale, order.publicToken)}?paid=1`,
      cancel_url: `${confirmationUrl(order.locale, order.publicToken)}?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    },
    { idempotencyKey: `order-${order.id}-session-1` }
  )
  if (!session.url) throw new Error("Stripe returned no checkout URL")
  await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id))
  return session.url
}

/** Cancels an order that has not been paid and returns its stock. Safe to call twice. */
export async function cancelUnpaidOrder(orderId: number, reason: string, actor: { type: "system" | "webhook" } = { type: "system" }): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order || order.status !== "pending" || order.paymentStatus === "paid") return false
    await restock(tx, orderId)
    await tx.update(orders).set({ status: "cancelled", cancelledAt: new Date(), cancelReason: reason.slice(0, 300), paymentStatus: order.paymentStatus === "unpaid" ? "failed" : order.paymentStatus }).where(eq(orders.id, orderId))
    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: "pending", toStatus: "cancelled", actorType: actor.type, note: reason.slice(0, 300) })
    return true
  })
}

export async function restock(tx: Tx, orderId: number) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
  const moved = await tx.select().from(stockMovements).where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.reason, "cancel")))
  if (moved.length) return // already restocked
  const productIds = items.map((i) => i.productId).filter((v): v is number => v !== null).sort((a, b) => a - b)
  if (productIds.length) await tx.select({ id: products.id }).from(products).where(inArray(products.id, productIds)).orderBy(products.id).for("update")
  for (const item of items) {
    if (!item.productId) continue
    const [p] = await tx.select({ trackStock: products.trackStock }).from(products).where(eq(products.id, item.productId))
    if (!p?.trackStock) continue
    await tx.update(products).set({ stockQty: sql`${products.stockQty} + ${item.quantity}` }).where(eq(products.id, item.productId))
    await tx.insert(stockMovements).values({ productId: item.productId, delta: item.quantity, reason: "cancel", orderId })
  }
}
