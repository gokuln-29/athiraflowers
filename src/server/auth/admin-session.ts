import "server-only"
import { and, eq, gt, ne } from "drizzle-orm"
import { cookies } from "next/headers"
import { cache } from "react"

import { db } from "@/db"
import { adminSessions, adminUsers, type Role } from "@/db/schema"
import { isProd } from "@/lib/env"
import { randomToken, sha256Hex } from "@/server/security/crypto"
import { requestContext } from "@/server/security/request"

import { can, type Permission } from "./permissions"

export const ADMIN_COOKIE = () => (isProd() ? "__Host-athira_admin" : "athira_admin")
const IDLE_MS = 2 * 60 * 60 * 1000
const ABSOLUTE_MS = 12 * 60 * 60 * 1000
/** A password-only (not yet MFA-verified) session must be completed quickly. */
const PENDING_MS = 10 * 60 * 1000
const TOUCH_EVERY_MS = 60 * 1000

export type AdminContext = {
  adminId: number
  email: string
  name: string
  role: Role
  sessionId: string
  mfaVerified: boolean
  mfaEnabled: boolean
  mustChangePassword: boolean
  ipHash: string
}

export class AuthorizationError extends Error {
  constructor(public code: "unauthenticated" | "mfa_required" | "forbidden") {
    super(code)
  }
}

async function setCookie(token: string, expires: Date) {
  const jar = await cookies()
  jar.set(ADMIN_COOKIE(), token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires,
  })
}

export async function clearAdminCookie() {
  const jar = await cookies()
  jar.set(ADMIN_COOKIE(), "", { httpOnly: true, secure: isProd(), sameSite: "lax", path: "/", maxAge: 0 })
}

/** Create a fresh session (new random id: this is the session rotation primitive). */
export async function createAdminSession(adminId: number, opts: { mfaVerified: boolean }): Promise<string> {
  const ctx = await requestContext()
  const token = randomToken(32)
  const now = new Date()
  const absolute = new Date(now.getTime() + (opts.mfaVerified ? ABSOLUTE_MS : PENDING_MS))
  await db.insert(adminSessions).values({
    id: sha256Hex(token),
    adminId,
    mfaVerifiedAt: opts.mfaVerified ? now : null,
    lastSeenAt: now,
    idleExpiresAt: new Date(now.getTime() + (opts.mfaVerified ? IDLE_MS : PENDING_MS)),
    absoluteExpiresAt: absolute,
    ipHash: ctx.ipHash,
    userAgent: ctx.userAgent,
  })
  await setCookie(token, absolute)
  return sha256Hex(token)
}

/** Replace the current session with a new one (after login, MFA, password change). Old id is revoked. */
export async function rotateAdminSession(adminId: number, opts: { mfaVerified: boolean }): Promise<string> {
  const jar = await cookies()
  const old = jar.get(ADMIN_COOKIE())?.value
  if (old) await db.delete(adminSessions).where(eq(adminSessions.id, sha256Hex(old)))
  return createAdminSession(adminId, opts)
}

export async function destroyAdminSession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(ADMIN_COOKIE())?.value
  if (token) await db.delete(adminSessions).where(eq(adminSessions.id, sha256Hex(token)))
  await clearAdminCookie()
}

export async function revokeOtherSessions(adminId: number, keepSessionId: string) {
  await db.delete(adminSessions).where(and(eq(adminSessions.adminId, adminId), ne(adminSessions.id, keepSessionId)))
}

export async function revokeAllSessions(adminId: number) {
  await db.delete(adminSessions).where(eq(adminSessions.adminId, adminId))
}

/** Loads the session for this request (memoised per request). Does not enforce MFA. */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const jar = await cookies()
  const token = jar.get(ADMIN_COOKIE())?.value
  if (!token || token.length < 32 || token.length > 128) return null
  const id = sha256Hex(token)
  const now = new Date()
  const [row] = await db
    .select({
      session: adminSessions,
      admin: adminUsers,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminId))
    .where(and(eq(adminSessions.id, id), gt(adminSessions.idleExpiresAt, now), gt(adminSessions.absoluteExpiresAt, now)))
    .limit(1)
  if (!row || row.admin.status !== "active") return null

  // Sliding idle expiry, written at most once a minute.
  if (row.session.mfaVerifiedAt && now.getTime() - row.session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    const idle = new Date(Math.min(now.getTime() + IDLE_MS, row.session.absoluteExpiresAt.getTime()))
    await db.update(adminSessions).set({ lastSeenAt: now, idleExpiresAt: idle }).where(eq(adminSessions.id, id))
  }

  const ctx = await requestContext()
  return {
    adminId: row.admin.id,
    email: row.admin.email,
    name: row.admin.name,
    role: row.admin.role,
    sessionId: id,
    mfaVerified: row.session.mfaVerifiedAt !== null,
    mfaEnabled: row.admin.mfaEnabledAt !== null,
    mustChangePassword: row.admin.mustChangePassword,
    ipHash: ctx.ipHash,
  }
})

/**
 * Every admin server action and route handler starts here.
 * Throws AuthorizationError; use adminAction / adminRoute / requirePage to translate it.
 */
export async function authorize(permission: Permission): Promise<AdminContext> {
  const ctx = await getAdminContext()
  if (!ctx) throw new AuthorizationError("unauthenticated")
  if (!ctx.mfaVerified) throw new AuthorizationError("mfa_required")
  if (!can(ctx.role, permission)) throw new AuthorizationError("forbidden")
  return ctx
}
