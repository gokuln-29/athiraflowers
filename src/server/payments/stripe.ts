import "server-only"
import Stripe from "stripe"

import { env } from "@/lib/env"

let client: Stripe | undefined

export const stripeConfigured = () => !!env().STRIPE_SECRET_KEY

export function getStripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY
  if (!key) throw new Error("Stripe is not configured")
  client ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 15_000, appInfo: { name: "athira-flowers" } })
  return client
}
