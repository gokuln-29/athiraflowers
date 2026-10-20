"use server"

import { and, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { blogCategories, blogPosts } from "@/db/schema"
import { slugify } from "@/lib/slug"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"

const t = (n: number) => z.string().trim().max(n)
const readingMinutes = (md: string) => Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 200))

const postSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().trim().max(160).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).or(z.literal("")),
  titleEn: t(200).min(3), titleAr: t(200).default(""), excerptEn: t(400).default(""), excerptAr: t(400).default(""),
  bodyEn: z.string().trim().min(20, "Write at least a few sentences").max(60000), bodyAr: z.string().trim().max(60000).default(""),
  coverMediaId: z.number().int().positive().nullable(), categoryId: z.number().int().positive().nullable(),
  authorName: t(120).min(2),
  status: z.enum(["draft", "scheduled", "published"]),
  /** Dubai local "YYYY-MM-DDTHH:mm"; required when scheduled. */
  publishAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).or(z.literal("")),
  seoTitleEn: t(160).default(""), seoTitleAr: t(160).default(""), seoDescriptionEn: t(320).default(""), seoDescriptionAr: t(320).default(""),
})

export const savePostAction = adminAction("blog:write", postSchema, async (v, ctx) => {
  const slug = v.slug || slugify(v.titleEn, `post-${Date.now()}`)
  const dup = await db.select({ id: blogPosts.id }).from(blogPosts).where(v.id ? and(eq(blogPosts.slug, slug), ne(blogPosts.id, v.id)) : eq(blogPosts.slug, slug)).limit(1)
  if (dup.length) return fail("That web address is already used.", { slug: ["Already used"] })

  let publishedAt: Date | null = null
  if (v.status === "scheduled") {
    if (!v.publishAt) return fail("Choose when to publish.", { publishAt: ["Required"] })
    publishedAt = new Date(`${v.publishAt}:00+04:00`)
    if (publishedAt.getTime() <= Date.now()) return fail("A scheduled time must be in the future.", { publishAt: ["Must be in the future"] })
  } else if (v.status === "published") {
    const prev = v.id ? (await db.select({ p: blogPosts.publishedAt }).from(blogPosts).where(eq(blogPosts.id, v.id)).limit(1))[0]?.p : null
    publishedAt = v.publishAt ? new Date(`${v.publishAt}:00+04:00`) : prev ?? new Date()
    if (publishedAt.getTime() > Date.now()) publishedAt = new Date()
  }
  const values = {
    slug, titleEn: v.titleEn, titleAr: v.titleAr, excerptEn: v.excerptEn, excerptAr: v.excerptAr, bodyEn: v.bodyEn, bodyAr: v.bodyAr || null,
    coverMediaId: v.coverMediaId, categoryId: v.categoryId, authorName: v.authorName, authorId: ctx.adminId, status: v.status, publishedAt,
    readingMinutes: readingMinutes(v.bodyEn), seoTitleEn: v.seoTitleEn || null, seoTitleAr: v.seoTitleAr || null, seoDescriptionEn: v.seoDescriptionEn || null, seoDescriptionAr: v.seoDescriptionAr || null,
  }
  let id = v.id
  if (id) await db.update(blogPosts).set(values).where(eq(blogPosts.id, id))
  else id = (await db.insert(blogPosts).values(values).$returningId())[0].id
  await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: v.id ? "blog.updated" : "blog.created", entity: "blog_post", entityId: id, meta: { status: v.status }, ipHash: ctx.ipHash })
  revalidatePath("/admin/blog")
  revalidatePath("/[locale]/blog", "page")
  return { ok: true as const, data: { id } }
}, { name: "blog.save" })

export const deletePostAction = adminAction("blog:write", z.object({ id: z.number().int().positive() }), async ({ id }, ctx) => {
  await db.delete(blogPosts).where(eq(blogPosts.id, id))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "blog.deleted", entity: "blog_post", entityId: id, ipHash: ctx.ipHash })
  revalidatePath("/admin/blog")
  revalidatePath("/[locale]/blog", "page")
  return { ok: true as const, data: undefined }
}, { name: "blog.delete" })

export const saveBlogCategoryAction = adminAction("blog:write", z.object({ nameEn: t(120).min(2), nameAr: t(120).default("") }), async (v, ctx) => {
  const slug = slugify(v.nameEn, `topic-${Date.now()}`)
  if ((await db.select({ id: blogCategories.id }).from(blogCategories).where(eq(blogCategories.slug, slug)).limit(1)).length) return fail("That topic already exists.")
  const [row] = await db.insert(blogCategories).values({ slug, nameEn: v.nameEn, nameAr: v.nameAr }).$returningId()
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "blog_category.created", entity: "blog_category", entityId: row.id, ipHash: ctx.ipHash })
  revalidatePath("/admin/blog")
  return { ok: true as const, data: { id: row.id, nameEn: v.nameEn } }
}, { name: "blog.category" })
