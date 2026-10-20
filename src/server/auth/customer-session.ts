import "server-only"
import { and, eq, gt } from "drizzle-orm"
import { cookies } from "next/headers"
import { cache } from "react"

import { db } from "@/db"
import { customerSessions, customers } from "@/db/schema"
import { isProd } from "@/lib/env"
import { randomToken, sha256Hex } from "@/server/security/crypto"
import { requestContext } from "@/server/security/request"

export const CUSTOMER_COOKIE = () => (isProd() ? "__Host-athira_customer" : "athira_customer")
const ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000
const IDLE_MS = 14 * 24 * 60 * 60 * 1000
const TOUCH_EVERY_MS = 10 * 60 * 1000

export type CustomerContext = { id: number; email: string; name: string | null; phone: string | null; sessionId: string }

export async function createCustomerSession(customerId: number) {
  const ctx = await requestContext()
  const token = randomToken(32)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ABSOLUTE_MS)
  await db.insert(customerSessions).values({
    id: sha256Hex(token),
    customerId,
    lastSeenAt: now,
    expiresAt,
    ipHash: ctx.ipHash,
    userAgent: ctx.userAgent,
  })
  const jar = await cookies()
  jar.set(CUSTOMER_COOKIE(), token, { httpOnly: true, secure: isProd(), sameSite: "lax", path: "/", expires: expiresAt })
}

export async function destroyCustomerSession() {
  const jar = await cookies()
  const token = jar.get(CUSTOMER_COOKIE())?.value
  if (token) await db.delete(customerSessions).where(eq(customerSessions.id, sha256Hex(token)))
  jar.set(CUSTOMER_COOKIE(), "", { httpOnly: true, secure: isProd(), sameSite: "lax", path: "/", maxAge: 0 })
}

export const getCustomer = cache(async (): Promise<CustomerContext | null> => {
  const jar = await cookies()
  const token = jar.get(CUSTOMER_COOKIE())?.value
  if (!token || token.length < 32 || token.length > 128) return null
  const id = sha256Hex(token)
  const now = new Date()
  const [row] = await db
    .select({ session: customerSessions, customer: customers })
    .from(customerSessions)
    .innerJoin(customers, eq(customers.id, customerSessions.customerId))
    .where(and(eq(customerSessions.id, id), gt(customerSessions.expiresAt, now)))
    .limit(1)
  if (!row || row.customer.erasedAt) return null
  if (now.getTime() - row.session.lastSeenAt.getTime() > IDLE_MS) return null
  if (now.getTime() - row.session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    await db.update(customerSessions).set({ lastSeenAt: now }).where(eq(customerSessions.id, id))
  }
  return { id: row.customer.id, email: row.customer.email, name: row.customer.name, phone: row.customer.phone, sessionId: id }
})
