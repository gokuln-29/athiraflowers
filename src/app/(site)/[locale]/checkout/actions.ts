"use server"

import { getCheckoutOptions, type CheckoutOptions } from "@/server/checkout/options"
import { rateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"

export async function checkoutOptionsAction(input: unknown): Promise<{ ok: true; options: CheckoutOptions } | { ok: false }> {
  const ctx = await requestContext()
  if (!(await rateLimit(`checkout-options:${ctx.ipHash}`, 180, 60)).allowed) return { ok: false }
  try {
    return { ok: true, options: await getCheckoutOptions(input) }
  } catch (error) {
    console.error("[checkout-options]", (error as Error).message)
    return { ok: false }
  }
}
