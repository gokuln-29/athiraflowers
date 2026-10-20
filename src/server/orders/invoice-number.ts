import "server-only"
import { eq, sql } from "drizzle-orm"

import type { Tx } from "@/db"
import { counters, orders } from "@/db/schema"

/** Sequential, gap-tolerant tax invoice numbers per calendar year (UTC+4 year of issue): INV-2026-000123. */
export async function ensureInvoiceNumber(tx: Tx, orderId: number, now = new Date()): Promise<string> {
  const [order] = await tx.select({ invoiceNumber: orders.invoiceNumber }).from(orders).where(eq(orders.id, orderId)).for("update")
  if (order?.invoiceNumber) return order.invoiceNumber
  const year = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric" }).format(now)
  const name = `invoice:${year}`
  await tx.insert(counters).values({ name, value: 0 }).onDuplicateKeyUpdate({ set: { value: sql`${counters.value}` } })
  await tx.update(counters).set({ value: sql`LAST_INSERT_ID(${counters.value} + 1)` }).where(eq(counters.name, name))
  const [{ n }] = (await tx.execute(sql`SELECT LAST_INSERT_ID() AS n`)).at(0) as unknown as [{ n: number }]
  const number = `INV-${year}-${String(n).padStart(6, "0")}`
  await tx.update(orders).set({ invoiceNumber: number, invoiceIssuedAt: now }).where(eq(orders.id, orderId))
  return number
}
