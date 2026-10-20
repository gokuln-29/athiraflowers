import { readFileSync } from "node:fs"
import * as OTPAuth from "otpauth"

export function devOwner() {
  const raw = readFileSync(".dev-credentials", "utf8")
  const get = (k: string) => raw.split("\n").find((l) => l.startsWith(`${k}=`))!.slice(k.length + 1)
  return { email: get("OWNER_EMAIL"), password: get("OWNER_PASSWORD") }
}

export const totpNow = (secret: string, stepOffset = 0) =>
  new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 }).generate({ timestamp: Date.now() + stepOffset * 30_000 })
