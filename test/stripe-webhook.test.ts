import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "@/db"
import { auditLog, emailOutbox, orders, paymentLinks, payments, products, stripeEvents } from "@/db/schema"
import { placeOrder } from "@/server/orders/place"
import { getStripe } from "@/server/payments/stripe"
import { handleStripeWebhook } from "@/server/payments/webhook"

import { baseFixtures, orderInput, wipeAll } from "./fixtures"
import { resetJar } from "./helpers"

const SECRET = "whsec_test_secret_for_unit_tests"

/** A signed event exactly as Stripe would deliver it. */
function signed(event: Record<string, unknown>, opts: { secret?: string; timestamp?: number } = {}) {
  const payload = JSON.stringify(event)
  const header = getStripe().webhooks.generateTestHeaderString({ payload, secret: opts.secret ?? SECRET, timestamp: opts.timestamp })
  return { payload, header }
}

const sessionEvent = (id: string, type: string, session: Record<string, unknown>) => ({ id, object: "event", type, data: { object: { object: "checkout.session", ...session } } })

async function stripeOrder(stock = 5) {
  const fx = await baseFixtures({ stock, price: 25000 })
  // Stub the network call to Stripe; everything else is real.
  vi.spyOn(getStripe().checkout.sessions, "create").mockImplementation((async () => ({ id: "cs_test_1", url: "https://checkout.stripe.test/pay" })) as never)
  const res = await placeOrder(orderInput(fx, { paymentMethod: "stripe", corporate: { enabled: true, company: "Acme LLC", trn: "100123456700003", poNumber: "PO-77", billingAddress: "" } }))
  expect(res).toMatchObject({ ok: true, redirectUrl: "https://checkout.stripe.test/pay" })
  const [o] = await db.select().from(orders)
  return { fx, order: o }
}

const paidSession = (o: typeof orders.$inferSelect, over: Record<string, unknown> = {}) => ({
  id: o.stripeSessionId, payment_status: "paid", amount_total: o.totalMinor, currency: "aed", payment_intent: "pi_test_1",
  client_reference_id: String(o.id), metadata: { order_id: String(o.id), order_number: o.orderNumber }, ...over,
})

beforeEach(async () => {
  resetJar()
  vi.restoreAllMocks()
  await wipeAll()
})

describe("Stripe checkout session", () => {
  it("creates one session whose amount is exactly the stored order total, and the order stays unpaid", async () => {
    const fx = await baseFixtures({ price: 25000 })
    const spy = vi.spyOn(getStripe().checkout.sessions, "create").mockImplementation((async () => ({ id: "cs_test_1", url: "https://checkout.stripe.test/pay" })) as never)
    await placeOrder(orderInput(fx, { paymentMethod: "stripe" }))
    const [o] = await db.select().from(orders)
    const args = spy.mock.calls[0][0] as { line_items: { price_data: { unit_amount: number; currency: string } }[]; metadata: Record<string, string> }
    expect(args.line_items[0].price_data.unit_amount).toBe(o.totalMinor)
    expect(args.line_items[0].price_data.currency).toBe("aed")
    expect(args.metadata.order_id).toBe(String(o.id))
    expect(o.stripeSessionId).toBe("cs_test_1")
    expect(o.paymentStatus).toBe("unpaid") // the redirect alone never marks an order paid
    expect(o.status).toBe("pending")
  })

  it("if Stripe is down the order is cancelled, stock restored, and the customer is told nothing was charged", async () => {
    const fx = await baseFixtures({ stock: 5 })
    vi.spyOn(getStripe().checkout.sessions, "create").mockRejectedValue(new Error("network"))
    const res = await placeOrder(orderInput(fx, { paymentMethod: "stripe" }))
    expect(res).toMatchObject({ ok: false, error: "payment_unavailable" })
    expect((await db.select().from(orders))[0].status).toBe("cancelled")
    expect((await db.select().from(products))[0].stockQty).toBe(5)
  })
})

describe("Stripe webhook", () => {
  it("rejects missing, wrong and stale signatures", async () => {
    const { order } = await stripeOrder()
    const evt = sessionEvent("evt_1", "checkout.session.completed", paidSession(order))
    expect((await handleStripeWebhook(JSON.stringify(evt), null)).status).toBe(400)
    const wrong = signed(evt, { secret: "whsec_wrong" })
    expect((await handleStripeWebhook(wrong.payload, wrong.header)).status).toBe(400)
    const stale = signed(evt, { timestamp: Math.floor(Date.now() / 1000) - 3600 })
    expect((await handleStripeWebhook(stale.payload, stale.header)).status).toBe(400)
    const tampered = signed(evt)
    expect((await handleStripeWebhook(tampered.payload.replace("paid", "pAid"), tampered.header)).status).toBe(400)
    expect((await db.select().from(orders))[0].paymentStatus).toBe("unpaid")
    expect(await db.select().from(stripeEvents)).toHaveLength(0)
  })

  it("a verified payment marks the order paid and confirmed, records the payment, issues an invoice number, and queues emails", async () => {
    const { order } = await stripeOrder()
    const { payload, header } = signed(sessionEvent("evt_paid", "checkout.session.completed", paidSession(order)))
    expect(await handleStripeWebhook(payload, header)).toEqual({ status: 200, body: "processed" })
    const [o] = await db.select().from(orders)
    expect(o.paymentStatus).toBe("paid")
    expect(o.status).toBe("confirmed")
    expect(o.stripePaymentIntentId).toBe("pi_test_1")
    expect(o.paidAt).not.toBeNull()
    expect(o.invoiceNumber).toMatch(/^INV-\d{4}-000001$/)
    const pay = await db.select().from(payments)
    expect(pay).toHaveLength(1)
    expect(pay[0]).toMatchObject({ provider: "stripe", kind: "charge", amountMinor: o.totalMinor, status: "succeeded" })
    const mail = await db.select().from(emailOutbox)
    expect(mail.map((m) => m.kind)).toContain("order.paid")
    expect((await db.select().from(stripeEvents))[0]).toMatchObject({ id: "evt_paid", status: "processed" })
  })

  it("a duplicate delivery of the same event changes nothing", async () => {
    const { order } = await stripeOrder()
    const { payload, header } = signed(sessionEvent("evt_dup", "checkout.session.completed", paidSession(order)))
    expect((await handleStripeWebhook(payload, header)).body).toBe("processed")
    const second = signed(sessionEvent("evt_dup", "checkout.session.completed", paidSession(order)))
    expect(await handleStripeWebhook(second.payload, second.header)).toEqual({ status: 200, body: "Duplicate" })
    expect(await db.select().from(payments)).toHaveLength(1)
    expect((await db.select().from(emailOutbox)).filter((m) => m.kind === "order.paid")).toHaveLength(1)
  })

  it("two simultaneous deliveries of one event still pay the order once", async () => {
    const { order } = await stripeOrder()
    const mk = () => signed(sessionEvent("evt_race", "checkout.session.completed", paidSession(order)))
    const [a, b] = [mk(), mk()]
    const results = await Promise.all([handleStripeWebhook(a.payload, a.header), handleStripeWebhook(b.payload, b.header)])
    expect(results.every((r) => r.status === 200)).toBe(true)
    expect(await db.select().from(payments)).toHaveLength(1)
    expect((await db.select().from(orders))[0].paymentStatus).toBe("paid")
  })

  it("never marks paid when the amount, currency or session does not match what we stored", async () => {
    const { order } = await stripeOrder()
    for (const [id, over] of [["evt_amt", { amount_total: 100 }], ["evt_cur", { currency: "usd" }], ["evt_sess", { id: "cs_someone_elses" }]] as const) {
      const { payload, header } = signed(sessionEvent(id, "checkout.session.completed", paidSession(order, over)))
      expect((await handleStripeWebhook(payload, header)).body).toBe("failed")
    }
    expect((await db.select().from(orders))[0].paymentStatus).toBe("unpaid")
    expect(await db.select().from(payments)).toHaveLength(0)
    expect((await db.select().from(stripeEvents)).every((e) => e.status === "failed")).toBe(true)
  })

  it("ignores sessions that are not paid yet (async methods) and unrelated event types", async () => {
    const { order } = await stripeOrder()
    const a = signed(sessionEvent("evt_unpaid", "checkout.session.completed", paidSession(order, { payment_status: "unpaid" })))
    expect((await handleStripeWebhook(a.payload, a.header)).body).toBe("ignored")
    const b = signed({ id: "evt_other", object: "event", type: "customer.created", data: { object: {} } })
    expect((await handleStripeWebhook(b.payload, b.header)).body).toBe("ignored")
    expect((await db.select().from(orders))[0].paymentStatus).toBe("unpaid")
  })

  it("an expired checkout session cancels the unpaid order and restores stock", async () => {
    const { order } = await stripeOrder(5)
    expect((await db.select().from(products))[0].stockQty).toBe(4)
    const { payload, header } = signed(sessionEvent("evt_exp", "checkout.session.expired", paidSession(order, { payment_status: "unpaid" })))
    expect((await handleStripeWebhook(payload, header)).body).toBe("processed")
    expect((await db.select().from(orders))[0].status).toBe("cancelled")
    expect((await db.select().from(products))[0].stockQty).toBe(5)
  })

  it("a payment that arrives after the order was cancelled is recorded, kept cancelled, and flagged for staff", async () => {
    const { order } = await stripeOrder()
    const exp = signed(sessionEvent("evt_exp2", "checkout.session.expired", paidSession(order, { payment_status: "unpaid" })))
    await handleStripeWebhook(exp.payload, exp.header)
    const late = signed(sessionEvent("evt_late", "checkout.session.completed", paidSession(order)))
    expect((await handleStripeWebhook(late.payload, late.header)).body).toBe("processed")
    const [o] = await db.select().from(orders)
    expect(o.status).toBe("cancelled")
    expect(o.paymentStatus).toBe("paid")
    expect((await db.select().from(auditLog)).map((a) => a.action)).toContain("payment.paid_on_cancelled_order")
    expect((await db.select().from(emailOutbox)).some((m) => m.subject.includes("ACTION NEEDED"))).toBe(true)
  })

  it("refunds are recorded and update the payment status", async () => {
    const { order } = await stripeOrder()
    const pay = signed(sessionEvent("evt_p", "checkout.session.completed", paidSession(order)))
    await handleStripeWebhook(pay.payload, pay.header)
    const refund = signed({ id: "evt_r", object: "event", type: "charge.refunded", data: { object: { object: "charge", id: "ch_1", payment_intent: "pi_test_1", amount_refunded: 10000, metadata: { order_id: String(order.id) } } } })
    expect((await handleStripeWebhook(refund.payload, refund.header)).body).toBe("processed")
    expect((await db.select().from(orders))[0].paymentStatus).toBe("partially_refunded")
    expect((await db.select().from(payments).where(eq(payments.kind, "refund")))[0].amountMinor).toBe(10000)
  })
})

describe("Payment links", () => {
  async function link() {
    const [row] = await db.insert(paymentLinks).values({ token: "a".repeat(32), title: "Event deposit", amountMinor: 150000, status: "active" }).$returningId()
    return row.id
  }
  const paid = (id: number, over: Record<string, unknown> = {}) => sessionEvent("evt_pl_1", "checkout.session.completed", { id: "cs_pl_1", payment_status: "paid", amount_total: 150000, currency: "aed", payment_intent: "pi_pl_1", metadata: { payment_link_id: String(id) }, ...over })

  it("marks the link paid once, records one payment, and a replayed event changes nothing", async () => {
    const id = await link()
    const a = signed(paid(id))
    expect((await handleStripeWebhook(a.payload, a.header)).status).toBe(200)
    const [l] = await db.select().from(paymentLinks)
    expect(l.status).toBe("paid")
    expect(l.paidAt).not.toBeNull()
    const again = signed(paid(id))
    expect((await handleStripeWebhook(again.payload, again.header)).status).toBe(200)
    expect(await db.select().from(payments)).toHaveLength(1)
  })

  it("refuses an amount that does not match the link, leaving it unpaid", async () => {
    const id = await link()
    const a = signed(paid(id, { amount_total: 100 }))
    await handleStripeWebhook(a.payload, a.header)
    const [l] = await db.select().from(paymentLinks)
    expect(l.status).toBe("active")
    expect(await db.select().from(payments)).toHaveLength(0)
  })
})

describe("Maintenance job", () => {
  it("cancels an unpaid card order after the grace period and restores stock; leaves fresh ones alone", async () => {
    const { fx, order } = await stripeOrder(5)
    const { runMaintenance } = await import("@/server/maintenance")
    expect((await runMaintenance()).unpaid_card_orders_cancelled).toBe(0)
    expect((await db.select().from(orders))[0].status).toBe("pending")
    await db.update(orders).set({ createdAt: new Date(Date.now() - 3 * 3_600_000) }).where(eq(orders.id, order.id))
    expect((await runMaintenance()).unpaid_card_orders_cancelled).toBe(1)
    const [after] = await db.select().from(orders)
    expect(after.status).toBe("cancelled")
    const [p] = await db.select().from(products).where(eq(products.id, fx.productId))
    expect(p.stockQty).toBe(5)
  })
})
