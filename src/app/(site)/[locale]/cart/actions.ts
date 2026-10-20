"use server"

import { quoteCart, quoteInputSchema, type Quote } from "@/server/cart/quote"
import { rateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: "invalid" | "rate_limited" | "failed" }

/** Server-priced cart. Accepts product ids and quantities only. */
export async function quoteCartAction(input: unknown): Promise<QuoteResult> {
  const parsed = quoteInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid" }
  const ctx = await requestContext()
  const limited = await rateLimit(`quote:${ctx.ipHash}`, 240, 60)
  if (!limited.allowed) return { ok: false, error: "rate_limited" }
  try {
    return { ok: true, quote: await quoteCart(parsed.data) }
  } catch (error) {
    console.error("[quote]", error)
    return { ok: false, error: "failed" }
  }
}
