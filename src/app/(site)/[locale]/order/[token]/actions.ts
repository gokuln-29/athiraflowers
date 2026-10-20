"use server"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { orders } from "@/db/schema"
import { createCheckoutSession } from "@/server/orders/place"
import { getStripe, stripeConfigured } from "@/server/payments/stripe"
import { rateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"

/** Lets a customer finish paying for a pending card order. Never creates a second order. */
export async function retryPaymentAction(token: string): Promise<{ ok: true; url: string } | { ok: false }> {
  if (!/^[0-9a-f]{32}$/.test(token) || !stripeConfigured()) return { ok: false }
  const ctx = await requestContext()
  if (!(await rateLimit(`retry-pay:${ctx.ipHash}`, 10, 3600)).allowed) return { ok: false }
  const [order] = await db.select().from(orders).where(eq(orders.publicToken, token)).limit(1)
  if (!order || order.paymentMethod !== "stripe" || order.status !== "pending" || order.paymentStatus === "paid") return { ok: false }
  try {
    if (order.stripeSessionId) {
      const existing = await getStripe().checkout.sessions.retrieve(order.stripeSessionId)
      if (existing.status === "open" && existing.url) return { ok: true, url: existing.url }
    }
    return { ok: true, url: await createCheckoutSession(order) }
  } catch (error) {
    console.error("[retry-payment]", (error as Error).message)
    return { ok: false }
  }
}
