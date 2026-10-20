"use server"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { paymentLinks } from "@/db/schema"
import { absoluteUrl, site } from "@/config/site"
import { getStripe, stripeConfigured } from "@/server/payments/stripe"
import { rateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"

export async function startPayLinkAction(token: string, locale: string): Promise<{ ok: true; url: string } | { ok: false }> {
  if (!/^[0-9a-f]{32}$/.test(token) || !stripeConfigured()) return { ok: false }
  const ctx = await requestContext()
  if (!(await rateLimit(`paylink:${ctx.ipHash}`, 20, 3600)).allowed) return { ok: false }
  const [link] = await db.select().from(paymentLinks).where(eq(paymentLinks.token, token)).limit(1)
  if (!link || link.status !== "active" || (link.expiresAt && link.expiresAt.getTime() < Date.now())) return { ok: false }
  try {
    const loc = locale === "ar" ? "ar" : "en"
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: link.customerEmail ?? undefined,
      locale: loc,
      line_items: [{ quantity: 1, price_data: { currency: link.currency.toLowerCase(), unit_amount: link.amountMinor, product_data: { name: `${site.name}: ${link.title}` } } }],
      metadata: { payment_link_id: String(link.id) },
      payment_intent_data: { metadata: { payment_link_id: String(link.id) } },
      success_url: `${absoluteUrl(`/${loc}/pay/${token}`)}?paid=1`,
      cancel_url: `${absoluteUrl(`/${loc}/pay/${token}`)}?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    })
    if (!session.url) return { ok: false }
    await db.update(paymentLinks).set({ stripeSessionId: session.id }).where(eq(paymentLinks.id, link.id))
    return { ok: true, url: session.url }
  } catch (error) {
    console.error("[paylink]", (error as Error).message)
    return { ok: false }
  }
}
