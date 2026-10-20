import "server-only"
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm"

import { db } from "@/db"
import { leads, orderItems, orders } from "@/db/schema"
import { addDays, dubaiNow } from "@/lib/time"

const live = sql`${orders.status} <> 'cancelled'`

export async function getDashboard() {
  const today = dubaiNow().day
  const from = addDays(today, -29)
  const since = new Date(`${from}T00:00:00+04:00`)
  const dayExpr = sql<string>`date(convert_tz(${orders.createdAt}, '+00:00', '+04:00'))`

  const [series, docket, top, newLeads, pending, todays] = await Promise.all([
    db.select({ d: dayExpr, n: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(${orders.totalMinor}),0)` }).from(orders).where(and(gte(orders.createdAt, since), live)).groupBy(sql`1`).orderBy(sql`1`),
    db.select().from(orders).where(and(eq(orders.deliveryDate, today), inArray(orders.status, ["confirmed", "preparing", "dispatched", "delivered"]))).orderBy(asc(orders.slotLabel), asc(orders.id)).limit(60),
    db.select({ title: orderItems.titleEn, qty: sql<number>`sum(${orderItems.quantity})`, revenue: sql<number>`sum(${orderItems.lineTotalMinor})` }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(gte(orders.createdAt, since), live)).groupBy(orderItems.titleEn).orderBy(desc(sql`sum(${orderItems.lineTotalMinor})`)).limit(5),
    db.select({ id: leads.id, name: leads.name, company: leads.company, createdAt: leads.createdAt }).from(leads).where(eq(leads.status, "new")).orderBy(desc(leads.id)).limit(6),
    db.select({ n: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "pending")),
    db.select({ n: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(${orders.totalMinor}),0)` }).from(orders).where(and(gte(orders.createdAt, new Date(`${today}T00:00:00+04:00`)), live)),
  ])

  const byDay = new Map(series.map((r) => [String(r.d).slice(0, 10), r]))
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(from, i)
    const r = byDay.get(d)
    return { d, label: d.slice(5), revenue: Math.round(Number(r?.revenue ?? 0) / 100), orders: Number(r?.n ?? 0) }
  })
  const total30 = series.reduce((s, r) => s + Number(r.revenue), 0)
  const orders30 = series.reduce((s, r) => s + Number(r.n), 0)
  return {
    today,
    days,
    kpi: { todayOrders: Number(todays[0].n), todayRevenue: Number(todays[0].revenue), pending: Number(pending[0].n), revenue30: total30, orders30, aov30: orders30 ? Math.round(total30 / orders30) : 0 },
    docket,
    top: top.map((t) => ({ title: t.title, qty: Number(t.qty), revenue: Number(t.revenue) })),
    newLeads,
  }
}
