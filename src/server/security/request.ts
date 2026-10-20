import "server-only"
import { headers } from "next/headers"

import { hmacHex } from "./crypto"

/**
 * Client IP as seen by Nginx. The app only listens on 127.0.0.1, so these headers are
 * set by our own proxy (X-Real-IP = $remote_addr; with Cloudflare in front, Nginx maps CF-Connecting-IP).
 */
export function clientIpFrom(h: Headers): string {
  const real = h.get("x-real-ip")?.trim()
  if (real) return real
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || "0.0.0.0"
}

export async function clientIp(): Promise<string> {
  return clientIpFrom(await headers())
}

/** Pseudonymised IP for rate limits, sessions and audit trails (PII minimisation). */
export const hashIp = (ip: string) => hmacHex(ip, "ip")

export async function requestContext() {
  const h = await headers()
  const ip = clientIpFrom(h)
  return { ip, ipHash: hashIp(ip), userAgent: (h.get("user-agent") ?? "").slice(0, 255) }
}
