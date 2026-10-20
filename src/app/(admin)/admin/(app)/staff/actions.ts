"use server"

import { and, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { adminRecoveryCodes, adminSessions, adminUsers, ROLES } from "@/db/schema"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { revokeAllSessions } from "@/server/auth/admin-session"
import { hashPassword } from "@/server/auth/password"
import { audit } from "@/server/security/audit"
import { randomToken } from "@/server/security/crypto"

const id = z.object({ id: z.number().int().positive() })

async function otherActiveOwners(exceptId: number) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(adminUsers).where(and(eq(adminUsers.role, "owner"), eq(adminUsers.status, "active"), ne(adminUsers.id, exceptId)))
  return Number(n)
}

/** Creates a staff account with a one-time temporary password. The person must change it and enrol MFA at first sign-in. */
export const createStaffAction = adminAction("staff:write", z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email().max(254), role: z.enum(ROLES) }), async (v, ctx) => {
  const exists = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, v.email)).limit(1)
  if (exists.length) return fail("Someone with that email already has an account.", { email: ["Already in use"] })
  const temp = randomToken(12)
  const [row] = await db.insert(adminUsers).values({ name: v.name, email: v.email, role: v.role, passwordHash: await hashPassword(temp), mustChangePassword: true, createdBy: ctx.adminId }).$returningId()
  await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: "staff.created", entity: "admin_user", entityId: row.id, meta: { role: v.role, email: v.email }, ipHash: ctx.ipHash })
  revalidatePath("/admin/staff")
  return { ok: true as const, data: { temporaryPassword: temp } }
}, { name: "staff.create", rateLimit: { limit: 20, windowSeconds: 3600 } })

export const updateStaffAction = adminAction("staff:write", id.extend({ role: z.enum(ROLES), status: z.enum(["active", "disabled"]) }), async ({ id: uid, role, status }, ctx) => {
  const [u] = await db.select().from(adminUsers).where(eq(adminUsers.id, uid)).limit(1)
  if (!u) return fail("Account not found.")
  const losesOwner = u.role === "owner" && (role !== "owner" || status !== "active")
  if (losesOwner && (await otherActiveOwners(uid)) === 0) return fail("There must always be at least one active owner.")
  if (uid === ctx.adminId && (role !== u.role || status !== "active")) return fail("You cannot change your own role or disable yourself.")
  await db.update(adminUsers).set({ role, status }).where(eq(adminUsers.id, uid))
  if (status === "disabled" || role !== u.role) await revokeAllSessions(uid)
  await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: "staff.updated", entity: "admin_user", entityId: uid, meta: { role: `${u.role}->${role}`, status: `${u.status}->${status}` }, ipHash: ctx.ipHash })
  revalidatePath("/admin/staff")
  return { ok: true as const, data: undefined }
}, { name: "staff.update" })

/** For a lost phone: clears the authenticator and recovery codes and signs the person out everywhere. They re-enrol at next sign-in. */
export const resetMfaAction = adminAction("staff:write", id, async ({ id: uid }, ctx) => {
  await db.transaction(async (tx) => {
    await tx.update(adminUsers).set({ mfaSecretEnc: null, mfaEnabledAt: null }).where(eq(adminUsers.id, uid))
    await tx.delete(adminRecoveryCodes).where(eq(adminRecoveryCodes.adminId, uid))
    await tx.delete(adminSessions).where(eq(adminSessions.adminId, uid))
  })
  await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: "staff.mfa_reset", entity: "admin_user", entityId: uid, ipHash: ctx.ipHash })
  revalidatePath("/admin/staff")
  return { ok: true as const, data: undefined }
}, { name: "staff.mfa_reset" })

export const resetPasswordAction = adminAction("staff:write", id, async ({ id: uid }, ctx) => {
  if (uid === ctx.adminId) return fail("Change your own password from your account page.")
  const temp = randomToken(12)
  await db.update(adminUsers).set({ passwordHash: await hashPassword(temp), mustChangePassword: true, failedLogins: 0, lockedUntil: null }).where(eq(adminUsers.id, uid))
  await revokeAllSessions(uid)
  await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: "staff.password_reset", entity: "admin_user", entityId: uid, ipHash: ctx.ipHash })
  return { ok: true as const, data: { temporaryPassword: temp } }
}, { name: "staff.password_reset", rateLimit: { limit: 20, windowSeconds: 3600 } })
