import "server-only"
import { eq, sql } from "drizzle-orm"
import type Stripe from "stripe"

import { db } from "@/db"
import { orderItems, orders, orderStatusHistory, payments, stripeEvents } from "@/db/schema"
import { absoluteUrl } from "@/config/site"
import { env } from "@/lib/env"
import { flushOutbox, queueEmail } from "@/server/email/outbox"
import { orderPaidEmail, staffOrderEmail } from "@/server/email/order-emails"
import { cancelUnpaidOrder, emailData } from "@/server/orders/place"
import { ensureInvoiceNumber } from "@/server/orders/invoice-number"
import { audit } from "@/server/security/audit"

import { getStripe } from "./stripe"

export type WebhookResult = { status: number; body: string }

const TOLERANCE_SECONDS = 300

/**
 * Stripe webhook. Order of operations matters:
 *  1. verify the signature against the RAW body (and reject stale timestamps),
 *  2. de-duplicate on event id,
 *  3. match order/session/amount/currency before anything is marked paid.
 * This is the only code path that sets payment_status = paid.
 */
export async function handleStripeWebhook(rawBody: string, signature: string | null): Promise<WebhookResult> {
  const secret = env().STRIPE_WEBHOOK_SECRET
  if (!secret || !signature) return { status: 400, body: "Bad request" }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret, TOLERANCE_SECONDS)
  } catch {
    return { status: 400, body: "Invalid signature" }
  }

  const claimed = await claimEvent(event)
  if (claimed === "duplicate") return { status: 200, body: "Duplicate" }

  try {
    const outcome = await processEvent(event)
    await db.update(stripeEvents).set({ status: outcome.status, detail: outcome.detail?.slice(0, 300) ?? null, processedAt: new Date() }).where(eq(stripeEvents.id, event.id))
    if (outcome.status === "processed") void flushOutbox().catch((e) => console.error("[outbox]", e.message))
    return { status: 200, body: outcome.status }
  } catch (error) {
    console.error("[stripe-webhook] processing failed", event.type, (error as Error).message)
    await db.update(stripeEvents).set({ status: "failed", detail: String((error as Error).message).slice(0, 300) }).where(eq(stripeEvents.id, event.id))
    // 5xx makes Stripe retry with backoff.
    return { status: 500, body: "Processing error" }
  }
}

async function claimEvent(event: Stripe.Event): Promise<"new" | "retry" | "duplicate"> {
  try {
    await db.insert(stripeEvents).values({ id: event.id, type: event.type, status: "processing" })
    return "new"
  } catch (error) {
    if ((error as { code?: string; cause?: { code?: string } }).code !== "ER_DUP_ENTRY" && (error as { cause?: { code?: string } }).cause?.code !== "ER_DUP_ENTRY") throw error
    const [row] = await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id))
    return row && (row.status === "processed" || row.status === "ignored") ? "duplicate" : "retry"
  }
}

type Outcome = { status: "processed" | "ignored" | "failed"; detail?: string }

async function processEvent(event: Stripe.Event): Promise<Outcome> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status !== "paid") return { status: "ignored", detail: `payment_status=${session.payment_status}` }
      return markPaid(session)
    }
    case "checkout.session.async_payment_succeeded":
      return markPaid(event.data.object as Stripe.Checkout.Session)
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = Number(session.metadata?.order_id ?? session.client_reference_id)
      if (!Number.isInteger(orderId)) return { status: "ignored", detail: "no order reference" }
      const cancelled = await cancelUnpaidOrder(orderId, event.type === "checkout.session.expired" ? "Checkout session expired" : "Payment failed", { type: "webhook" })
      return { status: "processed", detail: cancelled ? "order cancelled and stock restored" : "nothing to cancel" }
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge
      return recordRefund(charge)
    }
    default:
      return { status: "ignored", detail: "unhandled type" }
  }
}

async function markPaid(session: Stripe.Checkout.Session): Promise<Outcome> {
  const orderId = Number(session.metadata?.order_id ?? session.client_reference_id)
  if (!Number.isInteger(orderId)) return { status: "failed", detail: "missing order reference" }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order) return { kind: "failed" as const, detail: "order not found" }
    if (order.stripeSessionId !== session.id) return { kind: "failed" as const, detail: "session does not belong to order" }
    // Amount and currency must match what WE stored. Never trust the event for what is owed.
    if (session.amount_total !== order.totalMinor || session.currency?.toLowerCase() !== order.currency.toLowerCase()) {
      await audit({ actorType: "webhook", action: "payment.amount_mismatch", entity: "order", entityId: order.id, meta: { expected: order.totalMinor, received: session.amount_total ?? -1, currency: session.currency ?? "" } }, tx)
      return { kind: "failed" as const, detail: "amount or currency mismatch" }
    }
    if (order.paymentStatus === "paid") return { kind: "already" as const }

    const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null
    const lateOnCancelled = order.status === "cancelled"
    await tx.update(orders).set({
      paymentStatus: "paid", paidAt: new Date(), stripePaymentIntentId: intent,
      status: order.status === "pending" ? "confirmed" : order.status,
    }).where(eq(orders.id, order.id))
    await tx.insert(payments).values({ orderId: order.id, provider: "stripe", kind: "charge", providerRef: intent ?? session.id, amountMinor: order.totalMinor, currency: order.currency, status: "succeeded" })
    if (order.status === "pending") await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: "pending", toStatus: "confirmed", actorType: "webhook", note: "Payment received" })
    if (order.invoiceRequested) await ensureInvoiceNumber(tx, order.id)

    const [fresh] = await tx.select().from(orders).where(eq(orders.id, order.id))
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id))
    const data = emailData(fresh, items)
    if (lateOnCancelled) {
      await audit({ actorType: "webhook", action: "payment.paid_on_cancelled_order", entity: "order", entityId: order.id }, tx)
      const notify = env().NOTIFY_EMAIL
      if (notify) await queueEmail(tx, staffOrderEmail(notify, data, "ACTION NEEDED: payment received for a cancelled order (refund or reinstate)", absoluteUrl(`/admin/orders/${order.id}`)))
    } else {
      await queueEmail(tx, orderPaidEmail(data))
      const notify = env().NOTIFY_EMAIL
      if (notify) await queueEmail(tx, staffOrderEmail(notify, data, "Paid order", absoluteUrl(`/admin/orders/${order.id}`)))
    }
    await audit({ actorType: "webhook", action: "payment.confirmed", entity: "order", entityId: order.id, meta: { amount: order.totalMinor } }, tx)
    return { kind: "paid" as const }
  })

  if (result.kind === "failed") return { status: "failed", detail: result.detail }
  return { status: "processed", detail: result.kind === "already" ? "already paid" : "marked paid" }
}

async function recordRefund(charge: Stripe.Charge): Promise<Outcome> {
  const orderId = Number(charge.metadata?.order_id)
  const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id
  let order: typeof orders.$inferSelect | undefined
  if (Number.isInteger(orderId)) [order] = await db.select().from(orders).where(eq(orders.id, orderId))
  if (!order && intent) [order] = await db.select().from(orders).where(eq(orders.stripePaymentIntentId, intent))
  if (!order) return { status: "ignored", detail: "no matching order" }
  const refunded = charge.amount_refunded
  const full = refunded >= order.totalMinor
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ paymentStatus: full ? "refunded" : "partially_refunded" }).where(eq(orders.id, order!.id))
    await tx
      .insert(payments)
      .values({ orderId: order!.id, provider: "stripe", kind: "refund", providerRef: `${charge.id}:${refunded}`, amountMinor: refunded, currency: order!.currency, status: "succeeded" })
      .onDuplicateKeyUpdate({ set: { amountMinor: sql`amount_minor` } })
    await audit({ actorType: "webhook", action: "payment.refunded", entity: "order", entityId: order!.id, meta: { refunded, full } }, tx)
  })
  return { status: "processed", detail: full ? "fully refunded" : "partially refunded" }
}
