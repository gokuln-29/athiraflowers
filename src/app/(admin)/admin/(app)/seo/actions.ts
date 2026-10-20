"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { seoOverrides } from "@/db/schema"
import { adminAction } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"

const t = (n: number) => z.string().trim().max(n)
export const saveSeoAction = adminAction("content:write", z.object({
  path: z.string().regex(/^\/[a-z0-9/-]*$/), titleEn: t(160), titleAr: t(160), descriptionEn: t(320), descriptionAr: t(320), noindex: z.boolean(), ogMediaId: z.number().int().positive().nullable(),
}), async (v, ctx) => {
  const values = { titleEn: v.titleEn || null, titleAr: v.titleAr || null, descriptionEn: v.descriptionEn || null, descriptionAr: v.descriptionAr || null, noindex: v.noindex, ogMediaId: v.ogMediaId }
  const [existing] = await db.select({ id: seoOverrides.id }).from(seoOverrides).where(eq(seoOverrides.path, v.path)).limit(1)
  if (existing) await db.update(seoOverrides).set(values).where(eq(seoOverrides.id, existing.id))
  else await db.insert(seoOverrides).values({ path: v.path, ...values })
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "seo.updated", entity: "seo", entityId: v.path, ipHash: ctx.ipHash })
  revalidatePath("/admin/seo")
  return { ok: true as const, data: undefined }
}, { name: "seo.save" })
