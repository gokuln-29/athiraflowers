"use server"

import { eq, ne, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { coupons } from "@/db/schema"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"

const t = (n: number) => z.string().trim().max(n)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""))

/** Dates are Dubai calendar days: start at 00:00 and end at 23:59:59 local time (UTC+4). */
const startOfDay = (d: string) => (d ? new Date(`${d}T00:00:00+04:00`) : null)
const endOfDay = (d: string) => (d ? new Date(`${d}T23:59:59+04:00`) : null)

export const saveCouponAction = adminAction("offers:write", z.object({
  id: z.number().int().positive().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, "3 to 40 letters, numbers, dash or underscore"),
  kind: z.enum(["percent", "fixed"]), value: z.number().positive().max(1_000_000),
  minOrder: z.number().min(0).max(1_000_000), maxDiscount: z.number().min(0).max(1_000_000).nullable(),
  startsOn: day, endsOn: day, maxUses: z.number().int().min(1).max(1_000_000).nullable(), perCustomerLimit: z.number().int().min(0).max(1000),
  isActive: z.boolean(), isPublic: z.boolean(), titleEn: t(160), titleAr: t(160), descriptionEn: t(1000), descriptionAr: t(1000),
}).superRefine((v, ctx) => {
  if (v.kind === "percent" && (v.value < 1 || v.value > 100)) ctx.addIssue({ code: "custom", path: ["value"], message: "Percent must be between 1 and 100" })
  if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) ctx.addIssue({ code: "custom", path: ["endsOn"], message: "End date is before the start date" })
}), async (v, ctx) => {
  const dup = await db.select({ id: coupons.id }).from(coupons).where(v.id ? and(eq(coupons.code, v.code), ne(coupons.id, v.id)) : eq(coupons.code, v.code)).limit(1)
  if (dup.length) return fail("That code already exists.", { code: ["Already used"] })
  const values = {
    code: v.code, kind: v.kind, value: v.kind === "percent" ? Math.round(v.value) : Math.round(v.value * 100), minOrderMinor: Math.round(v.minOrder * 100),
    maxDiscountMinor: v.maxDiscount ? Math.round(v.maxDiscount * 100) : null, startsAt: startOfDay(v.startsOn), endsAt: endOfDay(v.endsOn), maxUses: v.maxUses,
    perCustomerLimit: v.perCustomerLimit, isActive: v.isActive, isPublic: v.isPublic, titleEn: v.titleEn, titleAr: v.titleAr, descriptionEn: v.descriptionEn || null, descriptionAr: v.descriptionAr || null,
  }
  let id = v.id
  if (id) await db.update(coupons).set(values).where(eq(coupons.id, id))
  else id = (await db.insert(coupons).values(values).$returningId())[0].id
  await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: v.id ? "coupon.updated" : "coupon.created", entity: "coupon", entityId: id, meta: { code: v.code }, ipHash: ctx.ipHash })
  revalidatePath("/admin/offers")
  return { ok: true as const, data: undefined }
}, { name: "coupon.save" })
