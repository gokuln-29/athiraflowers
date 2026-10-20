import { handleStripeWebhook } from "@/server/payments/webhook"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Needs the RAW body: signature verification is computed over the exact bytes Stripe sent. */
export async function POST(request: Request) {
  const raw = await request.text()
  const result = await handleStripeWebhook(raw, request.headers.get("stripe-signature"))
  return new Response(result.body, { status: result.status })
}
