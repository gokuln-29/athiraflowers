"use server"

import { and, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { categories, products } from "@/db/schema"
import { slugify } from "@/lib/slug"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"

const t = (n: number) => z.string().trim().max(n)
const schema = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().trim().max(120).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).or(z.literal("")),
  nameEn: t(140).min(2), nameAr: t(140).default(""), descriptionEn: t(1000).default(""), descriptionAr: t(1000).default(""),
  imageId: z.number().int().positive().nullable(), sort: z.number().int().min(0).max(100000), isActive: z.boolean(),
  seoTitleEn: t(160).default(""), seoTitleAr: t(160).default(""), seoDescriptionEn: t(320).default(""), seoDescriptionAr: t(320).default(""),
})

export const saveCategoryAction = adminAction("catalog:write", schema, async (v, ctx) => {
  const slug = v.slug || slugify(v.nameEn, `category-${Date.now()}`)
  const dup = await db.select({ id: categories.id }).from(categories).where(v.id ? and(eq(categories.slug, slug), ne(categories.id, v.id)) : eq(categories.slug, slug)).limit(1)
  if (dup.length) return fail("That web address is already used.", { slug: ["Already used"] })
  const values = { slug, nameEn: v.nameEn, nameAr: v.nameAr, descriptionEn: v.descriptionEn || null, descriptionAr: v.descriptionAr || null, imageId: v.imageId, sort: v.sort, isActive: v.isActive, seoTitleEn: v.seoTitleEn || null, seoTitleAr: v.seoTitleAr || null, seoDescriptionEn: v.seoDescriptionEn || null, seoDescriptionAr: v.seoDescriptionAr || null }
  let id = v.id
  if (id) await db.update(categories).set(values).where(eq(categories.id, id))
  else [{ id }] = await db.insert(categories).values(values).$returningId().then((r) => r.map((x) => ({ id: x.id })))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: v.id ? "category.updated" : "category.created", entity: "category", entityId: id, ipHash: ctx.ipHash })
  revalidatePath("/admin/categories")
  return { ok: true as const, data: undefined }
}, { name: "category.save" })

export const deleteCategoryAction = adminAction("catalog:write", z.object({ id: z.number().int().positive() }), async ({ id }, ctx) => {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(products).where(eq(products.categoryId, id))
  if (Number(n) > 0) return fail(`This category still has ${n} product(s). Move or hide them first, or hide the category instead.`)
  await db.delete(categories).where(eq(categories.id, id))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "category.deleted", entity: "category", entityId: id, ipHash: ctx.ipHash })
  revalidatePath("/admin/categories")
  return { ok: true as const, data: undefined }
}, { name: "category.delete" })
