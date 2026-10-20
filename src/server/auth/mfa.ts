import "server-only"
import * as OTPAuth from "otpauth"
import QRCode from "qrcode"

import { site } from "@/config/site"
import { rateLimit } from "@/server/security/rate-limit"

const PERIOD = 30

function totp(secretBase32: string, label: string) {
  return new OTPAuth.TOTP({
    issuer: site.name,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  })
}

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32
}

export async function enrollmentQr(secretBase32: string, email: string): Promise<{ uri: string; qrDataUrl: string }> {
  const uri = totp(secretBase32, email).toString()
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220, errorCorrectionLevel: "M" })
  return { uri, qrDataUrl }
}

/**
 * Verifies a 6-digit code with +/-1 step tolerance and rejects replays
 * (each time-step may be used once per admin).
 */
export async function verifyTotp(adminId: number, secretBase32: string, email: string, token: string, now = Date.now()): Promise<boolean> {
  if (!/^\d{6}$/.test(token)) return false
  const delta = totp(secretBase32, email).validate({ token, timestamp: now, window: 1 })
  if (delta === null) return false
  const step = Math.floor(now / 1000 / PERIOD) + delta
  const replay = await rateLimit(`totp-used:${adminId}:${step}`, 1, PERIOD * 4)
  return replay.allowed
}

export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(count * 10))
  return Array.from({ length: count }, (_, i) => {
    const chars = Array.from(bytes.slice(i * 10, i * 10 + 10), (b) => alphabet[b % alphabet.length]).join("")
    return `${chars.slice(0, 5)}-${chars.slice(5)}`
  })
}

export const normaliseRecoveryCode = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "")
