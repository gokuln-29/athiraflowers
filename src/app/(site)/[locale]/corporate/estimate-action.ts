"use server"

import { z } from "zod"

import { quoteCart } from "@/server/cart/quote"
import { rateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"

const schema = z.object({
  productId: z.number().int().positive(),
  locations: z.number().int().min(1).max(4),
  weeks: z.number().int().min(4).max(12),
  locale: z.enum(["en", "ar"]),
})

export type Estimate =
  | { ok: true; name: string; deliveries: number; perDeliveryMinor: number; vatIncludedTotalMinor: number; vatMinor: number; depositMinor: number; grandTotalMinor: number; productId: number; quantity: number; issues: string[] }
  | { ok: false }

/** Program estimate priced by the same server pricing used at checkout. */
export async function estimateProgramAction(input: unknown): Promise<Estimate> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const ctx = await requestContext()
  if (!(await rateLimit(`estimate:${ctx.ipHash}`, 60, 60)).allowed) return { ok: false }
  const quantity = parsed.data.locations * parsed.data.weeks
  const quote = await quoteCart({ items: [{ productId: parsed.data.productId, quantity }], locale: parsed.data.locale })
  const line = quote.lines[0]
  if (!line || line.pricingType !== "subscription") return { ok: false }
  return {
    ok: true,
    name: line.name,
    deliveries: quantity,
    perDeliveryMinor: line.unitPriceMinor,
    vatIncludedTotalMinor: quote.order.subtotalMinor,
    vatMinor: quote.order.vatMinor,
    depositMinor: quote.order.depositMinor,
    grandTotalMinor: quote.order.subtotalMinor + quote.order.depositMinor,
    productId: line.productId,
    quantity,
    issues: line.issues.map((i) => i.code),
  }
}
