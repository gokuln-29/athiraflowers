import "server-only"
import { and, asc, desc, eq, gte, like, or, sql, type SQL } from "drizzle-orm"

import { db } from "@/db"
import { ORDER_STATUSES, orderItems, orders, orderStatusHistory, payments, type OrderStatus } from "@/db/schema"
import { dubaiNow } from "@/lib/time"

export type OrderFilters = { status?: OrderStatus | "open" | "all"; q?: string; pay?: string; when?: "upcoming" | "all"; page?: number }

export async function listOrders(f: OrderFilters, pageSize = 50) {
  const where: SQL[] = []
  if (f.status && f.status !== "all") {
    if (f.status === "open") where.push(sql`${orders.status} in ('pending','confirmed','preparing','dispatched')`)
    else if ((ORDER_STATUSES as readonly string[]).includes(f.status)) where.push(eq(orders.status, f.status as OrderStatus))
  }
  if (f.pay === "unpaid") where.push(eq(orders.paymentStatus, "unpaid"))
  if (f.pay === "paid") where.push(eq(orders.paymentStatus, "paid"))
  if (f.pay === "cod") where.push(eq(orders.paymentMethod, "cod"))
  if (f.when === "upcoming") where.push(gte(orders.deliveryDate, dubaiNow().day))
  if (f.q) {
    const like_ = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`
    where.push(or(like(orders.orderNumber, like_), like(orders.contactEmail, like_), like(orders.contactName, like_), like(orders.contactPhone, like_), like(orders.companyName, like_))!)
  }
  const page = Math.max(1, f.page ?? 1)
  const rows = await db
    .select()
    .from(orders)
    .where(and(...where))
    .orderBy(f.when === "upcoming" ? asc(orders.deliveryDate) : desc(orders.createdAt), asc(orders.slotId), desc(orders.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(orders).where(and(...where))
  return { rows, total: Number(total), page, pages: Math.max(1, Math.ceil(Number(total) / pageSize)) }
}

export async function orderCountsByStatus() {
  const rows = await db.select({ status: orders.status, n: sql<number>`count(*)` }).from(orders).groupBy(orders.status)
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Partial<Record<OrderStatus, number>>
}

export async function getOrderDetail(id: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) return null
  const [items, history, pays] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id)).orderBy(asc(orderStatusHistory.createdAt), asc(orderStatusHistory.id)),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(asc(payments.createdAt)),
  ])
  return { order, items, history, payments: pays }
}
