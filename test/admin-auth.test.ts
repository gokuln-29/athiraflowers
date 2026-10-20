import * as OTPAuth from "otpauth"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { db } from "@/db"
import { adminSessions, adminUsers } from "@/db/schema"
import { attemptLogin, beginMfaEnrollment, confirmMfaEnrollment, verifyMfaCode, changePassword } from "@/server/auth/admin-auth"
import { ADMIN_COOKIE, authorize, AuthorizationError, getAdminContext } from "@/server/auth/admin-session"
import { decryptSecret } from "@/server/security/crypto"

import { jar } from "./setup"
import { makeAdmin, resetJar, wipe } from "./helpers"

const codeFor = (secret: string, email: string, offsetSteps = 0) =>
  new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 }).generate({ timestamp: Date.now() + offsetSteps * 30_000 })

beforeEach(async () => {
  resetJar()
  await wipe("admin_recovery_codes", "admin_sessions", "admin_users", "rate_limits", "audit_log")
})

async function enrolled(role: "owner" | "manager" | "staff" = "owner") {
  const admin = await makeAdmin({ role })
  expect((await attemptLogin({ email: admin.email, password: admin.password })).ok).toBe(true)
  const begin = await beginMfaEnrollment()
  if (!begin.ok) throw new Error("enroll failed")
  const confirm = await confirmMfaEnrollment(codeFor(begin.secret, admin.email))
  if (!confirm.ok) throw new Error("confirm failed")
  return { admin, secret: begin.secret, recovery: confirm.recoveryCodes }
}

describe("admin login", () => {
  it("rejects unknown emails and wrong passwords with the same generic message", async () => {
    const admin = await makeAdmin()
    const unknown = await attemptLogin({ email: "nobody@example.test", password: "x".repeat(14) })
    const wrong = await attemptLogin({ email: admin.email, password: "definitely not the password" })
    expect(unknown).toEqual({ ok: false, error: "Email or password is incorrect." })
    expect(wrong).toEqual(unknown)
  })

  it("locks the account after 8 failures, even for the right password", async () => {
    const admin = await makeAdmin()
    for (let i = 0; i < 8; i++) await attemptLogin({ email: admin.email, password: "wrong password " + i })
    const res = await attemptLogin({ email: admin.email, password: admin.password })
    expect(res.ok).toBe(false)
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id))
    expect(row.lockedUntil).not.toBeNull()
  })

  it("a password-only session cannot authorize anything until MFA is verified", async () => {
    const admin = await makeAdmin()
    const res = await attemptLogin({ email: admin.email, password: admin.password })
    expect(res).toEqual({ ok: true, next: "enroll" })
    await expect(authorize("dashboard:view")).rejects.toMatchObject({ code: "mfa_required" })
  })

  it("enrols MFA, stores the secret encrypted, issues hashed recovery codes and upgrades the session", async () => {
    const { admin, secret, recovery } = await enrolled()
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id))
    expect(row.mfaSecretEnc).toBeTruthy()
    expect(row.mfaSecretEnc).not.toContain(secret)
    expect(decryptSecret(row.mfaSecretEnc!, "mfa")).toBe(secret)
    expect(recovery).toHaveLength(10)
    const ctx = await authorize("dashboard:view")
    expect(ctx.adminId).toBe(admin.id)
    expect(ctx.mfaVerified).toBe(true)
  })

  it("second factor on later logins: valid TOTP accepted once, replay and wrong codes rejected", async () => {
    const { admin, secret } = await enrolled()
    jar.clear()
    expect(await attemptLogin({ email: admin.email, password: admin.password })).toEqual({ ok: true, next: "verify" })
    expect((await verifyMfaCode("000000")).ok).toBe(false)
    // Enrolment consumed the current time-step, so log in with the next one (still inside the +/-1 window).
    const good = codeFor(secret, admin.email, 1)
    expect((await verifyMfaCode(good)).ok).toBe(true)
    jar.clear()
    await attemptLogin({ email: admin.email, password: admin.password })
    expect((await verifyMfaCode(good)).ok).toBe(false) // replay of the same time-step
  })

  it("recovery codes work exactly once", async () => {
    const { admin, recovery } = await enrolled()
    jar.clear()
    await attemptLogin({ email: admin.email, password: admin.password })
    expect((await verifyMfaCode(recovery[0])).ok).toBe(true)
    jar.clear()
    await attemptLogin({ email: admin.email, password: admin.password })
    expect((await verifyMfaCode(recovery[0])).ok).toBe(false)
  })

  it("rotates the session id on login and MFA, revoking the previous one", async () => {
    const admin = await makeAdmin()
    await attemptLogin({ email: admin.email, password: admin.password })
    const first = jar.get(ADMIN_COOKIE())!
    const begin = await beginMfaEnrollment()
    if (!begin.ok) throw new Error()
    await confirmMfaEnrollment(codeFor(begin.secret, admin.email))
    const second = jar.get(ADMIN_COOKIE())!
    expect(second).not.toBe(first)
    const rows = await db.select().from(adminSessions).where(eq(adminSessions.adminId, admin.id))
    expect(rows).toHaveLength(1)
  })

  it("rejects expired sessions", async () => {
    await enrolled()
    await db.update(adminSessions).set({ idleExpiresAt: new Date(Date.now() - 1000) })
    expect(await getAdminContext()).toBeNull()
    await expect(authorize("dashboard:view")).rejects.toBeInstanceOf(AuthorizationError)
  })

  it("enforces the role matrix through authorize()", async () => {
    await enrolled("staff")
    await expect(authorize("orders:write")).resolves.toBeTruthy()
    await expect(authorize("catalog:write")).rejects.toMatchObject({ code: "forbidden" })
    await expect(authorize("staff:write")).rejects.toMatchObject({ code: "forbidden" })
  })

  it("disabled admins cannot use an existing session", async () => {
    const { admin } = await enrolled()
    await db.update(adminUsers).set({ status: "disabled" }).where(eq(adminUsers.id, admin.id))
    expect(await getAdminContext()).toBeNull()
  })

  it("changing the password enforces policy, rotates, and revokes other sessions", async () => {
    const { admin } = await enrolled()
    const ctx = (await getAdminContext())!
    // a second session elsewhere
    await db.insert(adminSessions).values({ id: "f".repeat(64), adminId: admin.id, mfaVerifiedAt: new Date(), lastSeenAt: new Date(), idleExpiresAt: new Date(Date.now() + 1e6), absoluteExpiresAt: new Date(Date.now() + 1e6) })
    expect((await changePassword(ctx, { current: admin.password, next: "short" })).ok).toBe(false)
    expect((await changePassword(ctx, { current: "wrong password!!", next: "another long passphrase here" })).ok).toBe(false)
    expect((await changePassword(ctx, { current: admin.password, next: "another long passphrase here" })).ok).toBe(true)
    const rows = await db.select().from(adminSessions).where(eq(adminSessions.adminId, admin.id))
    expect(rows).toHaveLength(1)
    expect(rows[0].id).not.toBe("f".repeat(64))
  })
})
