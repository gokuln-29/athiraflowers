"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { ORDER_STATUSES, orderItems, orders } from "@/db/schema"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { flushOutbox, queueEmail } from "@/server/email/outbox"
import { orderPaidEmail, orderReceivedEmail } from "@/server/email/order-emails"
import { emailData } from "@/server/orders/place"
import { ensureInvoiceNumber } from "@/server/orders/invoice-number"
import { markCodCollected, refundOrder, transitionOrder } from "@/server/orders/transition"
import { audit } from "@/server/security/audit"

const idSchema = z.object({ id: z.number().int().positive() })
const done = (id: number) => {
  revalidatePath(`/admin/orders/${id}`)
  revalidatePath("/admin/orders")
  return { ok: true as const, data: undefined }
}

export const changeStatusAction = adminAction(
  "orders:write",
  idSchema.extend({ to: z.enum(ORDER_STATUSES), note: z.string().trim().max(300).optional() }),
  async ({ id, to, note }, ctx) => {
    const r = await transitionOrder(ctx, id, to, note)
    return r.ok ? done(id) : fail(r.error)
  },
  { name: "order.status", rateLimit: { limit: 120, windowSeconds: 60 } }
)

export const markCodCollectedAction = adminAction(
  "orders:write",
  idSchema,
  async ({ id }, ctx) => {
    const r = await markCodCollected(ctx, id)
    return r.ok ? done(id) : fail(r.error)
  },
  { name: "order.cod" }
)

export const refundAction = adminAction(
  "orders:write",
  idSchema.extend({ amountMinor: z.number().int().positive(), reason: z.string().trim().min(3).max(200) }),
  async ({ id, amountMinor, reason }, ctx) => {
    const r = await refundOrder(ctx, id, amountMinor, reason)
    return r.ok ? done(id) : fail(r.error)
  },
  { name: "order.refund", rateLimit: { limit: 20, windowSeconds: 60 } }
)

export const saveStaffNoteAction = adminAction(
  "orders:write",
  idSchema.extend({ note: z.string().trim().max(2000) }),
  async ({ id, note }, ctx) => {
    await db.update(orders).set({ staffNote: note || null }).where(eq(orders.id, id))
    await audit({ actorType: "admin", actorId: ctx.adminId, action: "order.note", entity: "order", entityId: id, ipHash: ctx.ipHash })
    return done(id)
  },
  { name: "order.note" }
)

export const issueInvoiceAction = adminAction(
  "orders:write",
  idSchema,
  async ({ id }, ctx) => {
    const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
    if (!o) return fail("Order not found.")
    if (o.status === "cancelled") return fail("A cancelled order has no tax invoice.")
    await db.transaction(async (tx) => {
      await ensureInvoiceNumber(tx, id)
      await tx.update(orders).set({ invoiceRequested: true }).where(eq(orders.id, id))
    })
    await audit({ actorType: "admin", actorId: ctx.adminId, action: "order.invoice_issued", entity: "order", entityId: id, ipHash: ctx.ipHash })
    return done(id)
  },
  { name: "order.invoice" }
)

export const resendEmailAction = adminAction(
  "orders:write",
  idSchema,
  async ({ id }, ctx) => {
    const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
    if (!o) return fail("Order not found.")
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
    const data = emailData(o, items)
    const mail = o.paymentStatus === "paid" ? orderPaidEmail(data) : orderReceivedEmail(data)
    await queueEmail(db, { ...mail, dedupeKey: `${mail.dedupeKey}:resend:${Date.now()}` })
    await flushOutbox()
    await audit({ actorType: "admin", actorId: ctx.adminId, action: "order.email_resent", entity: "order", entityId: id, ipHash: ctx.ipHash })
    return done(id)
  },
  { name: "order.resend", rateLimit: { limit: 20, windowSeconds: 60 } }
)
