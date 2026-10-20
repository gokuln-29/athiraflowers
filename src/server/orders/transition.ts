import "server-only"
import { eq, sql } from "drizzle-orm"
import { after } from "next/server"

import { db } from "@/db"
import { orderItems, orders, orderStatusHistory, payments, type OrderStatus } from "@/db/schema"
import type { AdminContext } from "@/server/auth/admin-session"
import { flushOutbox, queueEmail } from "@/server/email/outbox"
import { orderStatusEmail } from "@/server/email/order-emails"
import { ensureInvoiceNumber } from "@/server/orders/invoice-number"
import { emailData, restock } from "@/server/orders/place"
import { getStripe, stripeConfigured } from "@/server/payments/stripe"
import { audit } from "@/server/security/audit"

import { canTransition } from "./state"

export type TransitionResult = { ok: true } | { ok: false; error: string }

/** The only way an order's status changes after placement. Enforces the state machine, restocks, audits and notifies. */
export async function transitionOrder(admin: AdminContext, orderId: number, to: OrderStatus, note?: string): Promise<TransitionResult> {
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order) return { ok: false as const, error: "Order not found." }
    if (!canTransition(order.status, to)) return { ok: false as const, error: `An order that is ${order.status} cannot become ${to}.` }
    if (to === "refunded" && order.paymentStatus !== "refunded" && order.paymentStatus !== "partially_refunded" && order.paymentStatus !== "paid")
      return { ok: false as const, error: "Only a paid order can be refunded." }

    if (to === "cancelled") await restock(tx, orderId)
    await tx
      .update(orders)
      .set({ status: to, ...(to === "cancelled" ? { cancelledAt: new Date(), cancelReason: (note ?? "").slice(0, 300) || null } : {}) })
      .where(eq(orders.id, orderId))
    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: order.status, toStatus: to, actorType: "admin", actorId: admin.adminId, note: note?.slice(0, 300) ?? null })

    // A delivered, invoiced order gets its tax invoice number.
    if (to === "delivered" && order.invoiceRequested && (order.paymentStatus === "paid" || order.paymentMethod === "cod")) await ensureInvoiceNumber(tx, orderId)

    const [fresh] = await tx.select().from(orders).where(eq(orders.id, orderId))
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    const mail = orderStatusEmail(emailData(fresh, items), to)
    if (mail) await queueEmail(tx, mail)
    await audit({ actorType: "admin", actorId: admin.adminId, actorLabel: admin.email, action: "order.status", entity: "order", entityId: orderId, meta: { from: order.status, to, note: note ?? "" }, ipHash: admin.ipHash }, tx)
    return { ok: true as const }
  })
  if (result.ok) after(() => flushOutbox().catch(() => undefined))
  return result
}

/** Cash on delivery: staff record that the driver handed over the cash. Never automatic. */
export async function markCodCollected(admin: AdminContext, orderId: number): Promise<TransitionResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order) return { ok: false as const, error: "Order not found." }
    if (order.paymentMethod !== "cod") return { ok: false as const, error: "Only cash-on-delivery orders are collected by the driver." }
    if (order.paymentStatus === "paid") return { ok: false as const, error: "Already marked as paid." }
    if (order.status === "cancelled" || order.status === "refunded") return { ok: false as const, error: "This order is not active." }
    await tx.update(orders).set({ paymentStatus: "paid", paidAt: new Date() }).where(eq(orders.id, orderId))
    await tx.insert(payments).values({ orderId, provider: "cod", kind: "charge", providerRef: `cod:${orderId}`, amountMinor: order.totalMinor, currency: order.currency, status: "succeeded", recordedBy: admin.adminId })
    if (order.invoiceRequested) await ensureInvoiceNumber(tx, orderId)
    await audit({ actorType: "admin", actorId: admin.adminId, actorLabel: admin.email, action: "order.cod_collected", entity: "order", entityId: orderId, meta: { amount: order.totalMinor }, ipHash: admin.ipHash }, tx)
    return { ok: true as const }
  })
}

/**
 * Refund. Card orders are refunded through Stripe (the charge.refunded webhook then records it);
 * cash orders are refunded manually (bank transfer) and recorded here.
 */
export async function refundOrder(admin: AdminContext, orderId: number, amountMinor: number, reason: string): Promise<TransitionResult> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) return { ok: false, error: "Order not found." }
  if (order.paymentStatus !== "paid" && order.paymentStatus !== "partially_refunded") return { ok: false, error: "Only a paid order can be refunded." }
  const [{ refunded }] = await db.select({ refunded: sql<number>`coalesce(sum(amount_minor), 0)` }).from(payments).where(sql`${payments.orderId} = ${orderId} and ${payments.kind} = 'refund' and ${payments.status} = 'succeeded'`)
  const remaining = order.totalMinor - Number(refunded)
  if (amountMinor < 1 || amountMinor > remaining) return { ok: false, error: `Refund must be between 0.01 and ${(remaining / 100).toFixed(2)} AED.` }

  if (order.paymentMethod === "stripe") {
    if (!order.stripePaymentIntentId || !stripeConfigured()) return { ok: false, error: "Stripe is not available for this refund." }
    try {
      await getStripe().refunds.create({ payment_intent: order.stripePaymentIntentId, amount: amountMinor, metadata: { order_id: String(orderId), reason: reason.slice(0, 200) } }, { idempotencyKey: `refund-${orderId}-${Number(refunded)}-${amountMinor}` })
    } catch (error) {
      console.error("[refund]", (error as Error).message)
      return { ok: false, error: "Stripe could not process the refund. Nothing was changed." }
    }
    await audit({ actorType: "admin", actorId: admin.adminId, actorLabel: admin.email, action: "order.refund_requested", entity: "order", entityId: orderId, meta: { amount: amountMinor, reason }, ipHash: admin.ipHash })
    return { ok: true }
  }

  await db.transaction(async (tx) => {
    const total = Number(refunded) + amountMinor
    await tx.insert(payments).values({ orderId, provider: "manual", kind: "refund", providerRef: `manual:${orderId}:${total}`, amountMinor, currency: order.currency, status: "succeeded", recordedBy: admin.adminId })
    await tx.update(orders).set({ paymentStatus: total >= order.totalMinor ? "refunded" : "partially_refunded" }).where(eq(orders.id, orderId))
    await audit({ actorType: "admin", actorId: admin.adminId, actorLabel: admin.email, action: "order.refund_recorded", entity: "order", entityId: orderId, meta: { amount: amountMinor, reason }, ipHash: admin.ipHash }, tx)
  })
  return { ok: true }
}
