import "server-only"
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { customers, otpCodes } from "@/db/schema"
import { audit } from "@/server/security/audit"
import { hmacHex, randomDigits, safeEqual } from "@/server/security/crypto"
import { rateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"
import { otpEmail } from "@/server/email/auth-emails"
import { sendEmail } from "@/server/email/brevo"

import { createCustomerSession } from "./customer-session"

export const emailSchema = z.string().trim().toLowerCase().email().max(254)
export const requestCodeSchema = z.object({ email: emailSchema, locale: z.enum(["en", "ar"]).default("en") })
export const verifyCodeSchema = z.object({ email: emailSchema, code: z.string().trim().regex(/^\d{6}$/) })

export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
const codeHash = (email: string, code: string) => hmacHex(`${email}:${code}`, "otp")

export type CodeResult = { ok: true } | { ok: false; error: "invalid_input" | "rate_limited" | "cooldown" | "send_failed" | "invalid_code"; retryAfterSeconds?: number }

/** Sends a one-time code. Always behaves the same whether or not the customer already exists. */
export async function requestLoginCode(input: unknown): Promise<CodeResult> {
  const parsed = requestCodeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid_input" }
  const { email, locale } = parsed.data
  const ctx = await requestContext()

  const cooldown = await rateLimit(`otp:cool:${hmacHex(email, "email")}`, 1, 30)
  if (!cooldown.allowed) return { ok: false, error: "cooldown", retryAfterSeconds: cooldown.retryAfterSeconds }
  const byIp = await rateLimit(`otp:req:ip:${ctx.ipHash}`, 15, 3600)
  const byEmail = await rateLimit(`otp:req:email:${hmacHex(email, "email")}`, 5, 3600)
  if (!byIp.allowed || !byEmail.allowed) return { ok: false, error: "rate_limited", retryAfterSeconds: Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds) }

  const code = randomDigits(6)
  const now = new Date()
  const id = await db.transaction(async (tx) => {
    await tx.update(otpCodes).set({ consumedAt: now }).where(and(eq(otpCodes.email, email), isNull(otpCodes.consumedAt)))
    const [row] = await tx
      .insert(otpCodes)
      .values({ email, codeHash: codeHash(email, code), expiresAt: new Date(now.getTime() + OTP_TTL_MS), ipHash: ctx.ipHash })
      .$returningId()
    return row.id
  })

  const sent = await sendEmail(otpEmail(locale, email, code))
  if (!sent.ok) {
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, id))
    return { ok: false, error: "send_failed" }
  }
  return { ok: true }
}

/** Verifies a code, creates the customer on first sign-in and starts a session. */
export async function verifyLoginCode(input: unknown): Promise<CodeResult> {
  const parsed = verifyCodeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid_code" }
  const { email, code } = parsed.data
  const ctx = await requestContext()

  const byIp = await rateLimit(`otp:verify:ip:${ctx.ipHash}`, 30, 3600)
  const byEmail = await rateLimit(`otp:verify:email:${hmacHex(email, "email")}`, 12, 3600)
  if (!byIp.allowed || !byEmail.allowed) return { ok: false, error: "rate_limited", retryAfterSeconds: Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds) }

  const now = new Date()
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, now)))
    .orderBy(desc(otpCodes.id))
    .limit(1)
  if (!row || row.attempts >= row.maxAttempts) return { ok: false, error: "invalid_code" }

  if (!safeEqual(row.codeHash, codeHash(email, code))) {
    await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1`, consumedAt: sql`IF(${otpCodes.attempts} + 1 >= ${otpCodes.maxAttempts}, UTC_TIMESTAMP(3), NULL)` })
      .where(eq(otpCodes.id, row.id))
    return { ok: false, error: "invalid_code" }
  }

  // Single use: only one concurrent verification can consume the row.
  const [consumed] = await db.update(otpCodes).set({ consumedAt: now }).where(and(eq(otpCodes.id, row.id), isNull(otpCodes.consumedAt)))
  if (consumed.affectedRows !== 1) return { ok: false, error: "invalid_code" }

  await db
    .insert(customers)
    .values({ email, lastLoginAt: now })
    .onDuplicateKeyUpdate({ set: { lastLoginAt: now } })
  const [customer] = await db.select().from(customers).where(eq(customers.email, email)).limit(1)
  if (customer.erasedAt) return { ok: false, error: "invalid_code" }
  await createCustomerSession(customer.id)
  await audit({ actorType: "customer", actorId: customer.id, action: "customer.login", ipHash: ctx.ipHash })
  return { ok: true }
}
