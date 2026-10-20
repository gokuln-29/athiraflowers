import "server-only"
import { hash, verify } from "@node-rs/argon2"

/** Argon2id parameters (OWASP guidance: >= 19 MiB memory, >= 2 iterations). Algorithm 2 = Argon2id. */
const OPTIONS = { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1, outputLen: 32 } as const

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

/** A hash of a random string, used to equalise timing when the account does not exist. */
export const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHRzb21lc2FsdA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

export type PasswordCheck = { ok: true } | { ok: false; reason: string }

const COMMON = new Set(["password", "password1", "123456789012", "qwertyuiop12", "athiraflowers", "welcome12345"])

/** Admin password policy: length over composition rules (NIST 800-63B). */
export function checkPasswordPolicy(password: string, context: { email?: string; name?: string } = {}): PasswordCheck {
  if (password.length < 12) return { ok: false, reason: "Use at least 12 characters." }
  if (password.length > 128) return { ok: false, reason: "Use at most 128 characters." }
  const lower = password.toLowerCase()
  if (COMMON.has(lower)) return { ok: false, reason: "This password is too common." }
  if (context.email && lower.includes(context.email.split("@")[0].toLowerCase()) && context.email.split("@")[0].length > 3)
    return { ok: false, reason: "Do not include your email name in the password." }
  if (new Set(password).size < 6) return { ok: false, reason: "Use a less repetitive password." }
  return { ok: true }
}
