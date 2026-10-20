"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { paymentLinks } from "@/db/schema"
import { absoluteUrl } from "@/config/site"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"
import { randomHex } from "@/server/security/crypto"

export const createPaymentLinkAction = adminAction("payment-links:write", z.object({
  title: z.string().trim().min(3).max(160), description: z.string().trim().max(400).default(""), amount: z.number().min(1).max(500_000),
  customerName: z.string().trim().max(120).default(""), customerEmail: z.string().trim().email().max(254).or(z.literal("")).default(""), expiresInDays: z.number().int().min(1).max(60),
}), async (v, ctx) => {
  const token = randomHex(32)
  const [row] = await db.insert(paymentLinks).values({ token, title: v.title, description: v.description || null, amountMinor: Math.round(v.amount * 100), customerName: v.customerName || null, customerEmail: v.customerEmail || null, expiresAt: new Date(Date.now() + v.expiresInDays * 86_400_000), createdBy: ctx.adminId }).$returningId()
  await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: "payment_link.created", entity: "payment_link", entityId: row.id, meta: { amountMinor: Math.round(v.amount * 100) }, ipHash: ctx.ipHash })
  revalidatePath("/admin/payment-links")
  return { ok: true as const, data: { url: absoluteUrl(`/en/pay/${token}`) } }
}, { name: "paylink.create", rateLimit: { limit: 30, windowSeconds: 3600 } })

export const cancelPaymentLinkAction = adminAction("payment-links:write", z.object({ id: z.number().int().positive() }), async ({ id }, ctx) => {
  const [l] = await db.select().from(paymentLinks).where(eq(paymentLinks.id, id)).limit(1)
  if (!l) return fail("Link not found.")
  if (l.status !== "active") return fail("Only an active link can be cancelled.")
  await db.update(paymentLinks).set({ status: "cancelled" }).where(eq(paymentLinks.id, id))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "payment_link.cancelled", entity: "payment_link", entityId: id, ipHash: ctx.ipHash })
  revalidatePath("/admin/payment-links")
  return { ok: true as const, data: undefined }
}, { name: "paylink.cancel" })

