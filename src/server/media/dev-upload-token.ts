import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

import { appSecret } from "@/lib/env"

type Payload = { k: string; t: string; b: number; e: number }

const b64 = (s: string) => Buffer.from(s).toString("base64url")

export function signDevUpload(key: string, contentType: string, bytes: number, ttlSeconds: number): string {
  const payload: Payload = { k: key, t: contentType, b: bytes, e: Math.floor(Date.now() / 1000) + ttlSeconds }
  const body = b64(JSON.stringify(payload))
  const sig = createHmac("sha256", appSecret()).update(body).digest("base64url")
  return `${body}.${sig}`
}

export function verifyDevUpload(token: string): Payload | null {
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const expected = createHmac("sha256", appSecret()).update(body).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload
    if (payload.e < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}
