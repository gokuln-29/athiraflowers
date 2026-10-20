import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { adminRecoveryCodes, adminUsers } from "@/db/schema"
import { audit } from "@/server/security/audit"
import { decryptSecret, encryptSecret, hmacHex, sha256Hex } from "@/server/security/crypto"
import { rateLimit, resetRateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"

import {
  getAdminContext,
  revokeOtherSessions,
  rotateAdminSession,
  type AdminContext,
} from "./admin-session"
import { generateRecoveryCodes, generateTotpSecret, normaliseRecoveryCode, verifyTotp } from "./mfa"
import { checkPasswordPolicy, hashPassword, verifyPassword } from "./password"

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
})

const MAX_FAILED = 8
const LOCK_MS = 15 * 60 * 1000

export type LoginResult =
  | { ok: true; next: "verify" | "enroll" }
  | { ok: false; error: string }

const GENERIC = "Email or password is incorrect."

let dummyHash: Promise<string> | undefined
/** Verifying against a real hash keeps timing equal for unknown emails. */
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-" + Math.random()))

export async function attemptLogin(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: GENERIC }
  const { email, password } = parsed.data
  const ctx = await requestContext()

  const byIp = await rateLimit(`admin-login:ip:${ctx.ipHash}`, 20, 15 * 60)
  const byEmail = await rateLimit(`admin-login:email:${hmacHex(email, "email")}`, 10, 15 * 60)
  if (!byIp.allowed || !byEmail.allowed) return { ok: false, error: "Too many attempts. Try again in a few minutes." }

  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
  const now = new Date()

  if (!admin) {
    await verifyPassword(await getDummyHash(), password)
    await audit({ actorType: "system", action: "admin.login.unknown_email", ipHash: ctx.ipHash })
    return { ok: false, error: GENERIC }
  }
  if (admin.status !== "active") {
    await verifyPassword(await getDummyHash(), password)
    return { ok: false, error: GENERIC }
  }
  if (admin.lockedUntil && admin.lockedUntil > now) {
    await audit({ actorType: "admin", actorId: admin.id, action: "admin.login.locked", ipHash: ctx.ipHash })
    return { ok: false, error: "This account is temporarily locked. Try again in 15 minutes." }
  }

  const valid = await verifyPassword(admin.passwordHash, password)
  if (!valid) {
    const failed = admin.failedLogins + 1
    await db
      .update(adminUsers)
      .set({ failedLogins: failed, lockedUntil: failed >= MAX_FAILED ? new Date(now.getTime() + LOCK_MS) : null })
      .where(eq(adminUsers.id, admin.id))
    await audit({ actorType: "admin", actorId: admin.id, action: "admin.login.failed", meta: { failed }, ipHash: ctx.ipHash })
    return { ok: false, error: GENERIC }
  }

  await db.update(adminUsers).set({ failedLogins: 0, lockedUntil: null }).where(eq(adminUsers.id, admin.id))
  // Password-only session: cannot reach anything until the second factor is verified.
  await rotateAdminSession(admin.id, { mfaVerified: false })
  await audit({ actorType: "admin", actorId: admin.id, action: "admin.login.password_ok", ipHash: ctx.ipHash })
  return { ok: true, next: admin.mfaEnabledAt ? "verify" : "enroll" }
}

async function loadAdmin(ctx: AdminContext) {
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, ctx.adminId)).limit(1)
  return admin
}

export type MfaResult = { ok: true } | { ok: false; error: string }

/** Second step of login: a TOTP code or a one-time recovery code. */
export async function verifyMfaCode(rawCode: string): Promise<MfaResult> {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: "Your session has ended. Sign in again." }
  const req = await requestContext()
  const limited = await rateLimit(`admin-mfa:${ctx.adminId}`, 8, 10 * 60)
  if (!limited.allowed) return { ok: false, error: "Too many attempts. Sign in again in a few minutes." }

  const admin = await loadAdmin(ctx)
  if (!admin?.mfaSecretEnc || !admin.mfaEnabledAt) return { ok: false, error: "Set up two-step verification first." }

  const code = rawCode.trim()
  let ok = false
  let used: "totp" | "recovery" = "totp"
  if (/^\d{6}$/.test(code)) {
    ok = await verifyTotp(admin.id, decryptSecret(admin.mfaSecretEnc, "mfa"), admin.email, code)
  } else {
    const hash = sha256Hex(normaliseRecoveryCode(code))
    const [row] = await db
      .select()
      .from(adminRecoveryCodes)
      .where(and(eq(adminRecoveryCodes.adminId, admin.id), eq(adminRecoveryCodes.codeHash, hash), isNull(adminRecoveryCodes.usedAt)))
      .limit(1)
    if (row) {
      await db.update(adminRecoveryCodes).set({ usedAt: new Date() }).where(eq(adminRecoveryCodes.id, row.id))
      ok = true
      used = "recovery"
    }
  }
  if (!ok) {
    await audit({ actorType: "admin", actorId: admin.id, action: "admin.mfa.failed", ipHash: req.ipHash })
    return { ok: false, error: "That code is not valid. Check the code and try again." }
  }
  await resetRateLimit(`admin-mfa:${admin.id}`)
  await rotateAdminSession(admin.id, { mfaVerified: true })
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id))
  await audit({ actorType: "admin", actorId: admin.id, actorLabel: admin.email, action: "admin.login.success", meta: { factor: used }, ipHash: req.ipHash })
  return { ok: true }
}

/** Starts (or restarts) enrolment for the signed-in password-verified admin. Returns the secret to show once. */
export async function beginMfaEnrollment(): Promise<{ ok: true; secret: string; email: string } | { ok: false; error: string }> {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: "Your session has ended. Sign in again." }
  const admin = await loadAdmin(ctx)
  if (!admin) return { ok: false, error: "Account not found." }
  if (admin.mfaEnabledAt) return { ok: false, error: "Two-step verification is already enabled." }
  // Idempotent: a page refresh must not invalidate a secret the admin has already scanned.
  if (admin.mfaSecretEnc) return { ok: true, secret: decryptSecret(admin.mfaSecretEnc, "mfa"), email: admin.email }
  const secret = generateTotpSecret()
  await db.update(adminUsers).set({ mfaSecretEnc: encryptSecret(secret, "mfa") }).where(eq(adminUsers.id, admin.id))
  return { ok: true, secret, email: admin.email }
}

/** Confirms enrolment with a first code, issues recovery codes (shown once) and upgrades the session. */
export async function confirmMfaEnrollment(code: string): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: "Your session has ended. Sign in again." }
  const limited = await rateLimit(`admin-mfa:${ctx.adminId}`, 8, 10 * 60)
  if (!limited.allowed) return { ok: false, error: "Too many attempts. Sign in again in a few minutes." }
  const admin = await loadAdmin(ctx)
  if (!admin?.mfaSecretEnc || admin.mfaEnabledAt) return { ok: false, error: "Start setup again." }
  if (!(await verifyTotp(admin.id, decryptSecret(admin.mfaSecretEnc, "mfa"), admin.email, code.trim()))) {
    return { ok: false, error: "That code is not valid. Check the code and try again." }
  }
  const codes = generateRecoveryCodes(10)
  await db.transaction(async (tx) => {
    await tx.update(adminUsers).set({ mfaEnabledAt: new Date() }).where(eq(adminUsers.id, admin.id))
    await tx.delete(adminRecoveryCodes).where(eq(adminRecoveryCodes.adminId, admin.id))
    await tx.insert(adminRecoveryCodes).values(codes.map((c) => ({ adminId: admin.id, codeHash: sha256Hex(normaliseRecoveryCode(c)) })))
  })
  await rotateAdminSession(admin.id, { mfaVerified: true })
  await audit({ actorType: "admin", actorId: admin.id, actorLabel: admin.email, action: "admin.mfa.enrolled", ipHash: ctx.ipHash })
  return { ok: true, recoveryCodes: codes }
}

export const changePasswordSchema = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(1).max(200),
})

/** Changing the password rotates the current session and revokes every other session. */
export async function changePassword(ctx: AdminContext, input: unknown): Promise<MfaResult> {
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Enter your current and new password." }
  const limited = await rateLimit(`admin-pw:${ctx.adminId}`, 6, 15 * 60)
  if (!limited.allowed) return { ok: false, error: "Too many attempts. Try again later." }
  const admin = await loadAdmin(ctx)
  if (!admin || !(await verifyPassword(admin.passwordHash, parsed.data.current))) return { ok: false, error: "Your current password is not correct." }
  const policy = checkPasswordPolicy(parsed.data.next, { email: admin.email, name: admin.name })
  if (!policy.ok) return { ok: false, error: policy.reason }
  await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(parsed.data.next), passwordChangedAt: new Date(), mustChangePassword: false })
    .where(eq(adminUsers.id, admin.id))
  const sessionId = await rotateAdminSession(admin.id, { mfaVerified: true })
  await revokeOtherSessions(admin.id, sessionId)
  await audit({ actorType: "admin", actorId: admin.id, actorLabel: admin.email, action: "admin.password.changed", ipHash: ctx.ipHash })
  return { ok: true }
}
