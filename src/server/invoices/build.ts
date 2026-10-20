import "server-only"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { orderItems, orders } from "@/db/schema"
import { getSettings } from "@/server/queries/content"

import { renderInvoicePdf } from "./render"

/** Builds the PDF for an order that already has an invoice number. Returns null otherwise. */
export async function buildInvoice(where: { id: number } | { token: string }): Promise<{ pdf: Buffer; filename: string } | null> {
  const [order] = await db.select().from(orders).where("id" in where ? eq(orders.id, where.id) : eq(orders.publicToken, where.token)).limit(1)
  if (!order || !order.invoiceNumber || order.status === "cancelled") return null
  const [items, settings] = await Promise.all([db.select().from(orderItems).where(eq(orderItems.orderId, order.id)), getSettings()])
  const b = settings.business
  const c = settings.contact
  const pdf = await renderInvoicePdf(
    { ...order, invoiceNumber: order.invoiceNumber, items },
    { legalName: b.legalName, trn: b.trn, licenceNo: b.licenceNo, address: b.invoiceAddress || c.addressEn, email: c.email, phone: c.phone }
  )
  return { pdf, filename: `${order.invoiceNumber}.pdf` }
}
