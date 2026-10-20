import "server-only"
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from "node:crypto"

import { appSecret } from "@/lib/env"

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex")

export const hmacHex = (value: string, purpose: string) =>
  createHmac("sha256", `${appSecret()}:${purpose}`).update(value).digest("hex")

/** URL-safe random token with `bytes` of entropy. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url")

/** Lowercase hex token, e.g. public order tokens (32 chars = 128 bits). */
export const randomHex = (chars = 32) => randomBytes(Math.ceil(chars / 2)).toString("hex").slice(0, chars)

export const randomDigits = (length = 6) => Array.from({ length }, () => randomInt(0, 10)).join("")

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function encryptionKey(purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", appSecret(), "athira-salt", `athira:${purpose}`, 32))
}

/** AES-256-GCM. Output: iv.tag.ciphertext (base64url). */
export function encryptSecret(plain: string, purpose: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(purpose), iv)
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".")
}

export function decryptSecret(payload: string, purpose: string): string {
  const [iv, tag, ct] = payload.split(".").map((p) => Buffer.from(p, "base64url"))
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(purpose), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8")
}
