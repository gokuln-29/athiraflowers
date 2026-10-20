import "server-only"
import { desc, eq, or, sql } from "drizzle-orm"

import { db } from "@/db"
import { customerAddresses, customers, orderItems, orders } from "@/db/schema"

/** Orders linked to the customer id, or placed as a guest with the same (now verified) email. */
export async function listCustomerOrders(customerId: number, email: string, limit = 50) {
  const rows = await db
    .select()
    .from(orders)
    .where(or(eq(orders.customerId, customerId), eq(orders.contactEmail, email)))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
  if (rows.length === 0) return []
  const items = await db.select().from(orderItems).where(sql`${orderItems.orderId} in (${sql.join(rows.map((r) => sql`${r.id}`), sql`, `)})`)
  return rows.map((o) => ({ order: o, items: items.filter((i) => i.orderId === o.id) }))
}

export const listAddresses = (customerId: number) => db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId)).orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.id))

export async function getCustomerRow(id: number) {
  const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  return row
}
