"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { clientLogos, faqs, homeSections, pages, testimonials } from "@/db/schema"
import { homeSectionSchemas } from "@/lib/home-sections"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"

const t = (n: number) => z.string().trim().max(n)
const id = z.number().int().positive()
const refresh = () => { revalidatePath("/admin/pages"); revalidatePath("/[locale]", "layout") }
const done = { ok: true as const, data: undefined }

export const savePageAction = adminAction("content:write", z.object({
  key: z.string().regex(/^[a-z0-9-]{2,60}$/), titleEn: t(160).min(2), titleAr: t(160).default(""), bodyEn: z.string().trim().min(10).max(80000), bodyAr: z.string().trim().max(80000).default(""),
  seoTitleEn: t(160).default(""), seoTitleAr: t(160).default(""), seoDescriptionEn: t(320).default(""), seoDescriptionAr: t(320).default(""), markReviewed: z.boolean(),
}), async (v, ctx) => {
  const [p] = await db.select().from(pages).where(eq(pages.key, v.key)).limit(1)
  if (!p) return fail("Page not found.")
  await db.update(pages).set({ titleEn: v.titleEn, titleAr: v.titleAr, bodyEn: v.bodyEn, bodyAr: v.bodyAr || null, seoTitleEn: v.seoTitleEn || null, seoTitleAr: v.seoTitleAr || null, seoDescriptionEn: v.seoDescriptionEn || null, seoDescriptionAr: v.seoDescriptionAr || null, ...(v.markReviewed ? { reviewedAt: new Date() } : {}) }).where(eq(pages.id, p.id))
  await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: "page.updated", entity: "page", entityId: p.id, meta: { key: v.key, reviewed: v.markReviewed }, ipHash: ctx.ipHash })
  refresh()
  return done
}, { name: "page.save" })

export const saveHomeSectionAction = adminAction("content:write", z.object({ id, data: z.record(z.string(), z.unknown()), isActive: z.boolean() }), async (v, ctx) => {
  const [row] = await db.select().from(homeSections).where(eq(homeSections.id, v.id)).limit(1)
  if (!row) return fail("Section not found.")
  const parsed = homeSectionSchemas[row.type].safeParse(v.data)
  if (!parsed.success) return fail(`Check the fields: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`)
  await db.update(homeSections).set({ data: parsed.data as Record<string, unknown>, isActive: v.isActive }).where(eq(homeSections.id, v.id))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "home_section.updated", entity: "home_section", entityId: v.id, meta: { type: row.type }, ipHash: ctx.ipHash })
  refresh()
  return done
}, { name: "home.save" })

export const moveHomeSectionAction = adminAction("content:write", z.object({ id, dir: z.enum(["up", "down"]) }), async ({ id: sid, dir }, ctx) => {
  const rows = await db.select({ id: homeSections.id }).from(homeSections).orderBy(homeSections.sort, homeSections.id)
  const i = rows.findIndex((r) => r.id === sid)
  const j = dir === "up" ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= rows.length) return done
  const order = rows.map((r) => r.id)
  ;[order[i], order[j]] = [order[j], order[i]]
  await db.transaction(async (tx) => { for (const [n, rid] of order.entries()) await tx.update(homeSections).set({ sort: (n + 1) * 10 }).where(eq(homeSections.id, rid)) })
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "home_section.moved", entity: "home_section", entityId: sid, meta: { dir }, ipHash: ctx.ipHash })
  refresh()
  return done
}, { name: "home.move" })

const faqSchema = z.object({ id: id.optional(), group: z.enum(["general", "delivery", "corporate", "events", "payment"]), questionEn: t(300).min(3), questionAr: t(300).default(""), answerEn: z.string().trim().min(3).max(4000), answerAr: z.string().trim().max(4000).default(""), sort: z.number().int().min(0).max(100000), isActive: z.boolean() })
export const saveFaqAction = adminAction("content:write", faqSchema, async (v, ctx) => {
  const values = { group: v.group, questionEn: v.questionEn, questionAr: v.questionAr, answerEn: v.answerEn, answerAr: v.answerAr || null, sort: v.sort, isActive: v.isActive }
  const fid = v.id ?? (await db.insert(faqs).values(values).$returningId())[0].id
  if (v.id) await db.update(faqs).set(values).where(eq(faqs.id, v.id))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: v.id ? "faq.updated" : "faq.created", entity: "faq", entityId: fid, ipHash: ctx.ipHash })
  refresh()
  return done
}, { name: "faq.save" })
export const deleteFaqAction = adminAction("content:write", z.object({ id }), async ({ id: fid }, ctx) => {
  await db.delete(faqs).where(eq(faqs.id, fid))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "faq.deleted", entity: "faq", entityId: fid, ipHash: ctx.ipHash })
  refresh()
  return done
}, { name: "faq.delete" })

const testimonialSchema = z.object({ id: id.optional(), authorName: t(120).min(2), authorRole: t(120).default(""), company: t(160).default(""), quoteEn: z.string().trim().min(5).max(1000), quoteAr: z.string().trim().max(1000).default(""), isSample: z.boolean(), sort: z.number().int().min(0).max(100000), isActive: z.boolean() })
export const saveTestimonialAction = adminAction("content:write", testimonialSchema, async (v, ctx) => {
  const values = { authorName: v.authorName, authorRole: v.authorRole || null, company: v.company || null, quoteEn: v.quoteEn, quoteAr: v.quoteAr || null, isSample: v.isSample, sort: v.sort, isActive: v.isActive }
  const tid = v.id ?? (await db.insert(testimonials).values(values).$returningId())[0].id
  if (v.id) await db.update(testimonials).set(values).where(eq(testimonials.id, v.id))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: v.id ? "testimonial.updated" : "testimonial.created", entity: "testimonial", entityId: tid, ipHash: ctx.ipHash })
  refresh()
  return done
}, { name: "testimonial.save" })
export const deleteTestimonialAction = adminAction("content:write", z.object({ id }), async ({ id: tid }, ctx) => {
  await db.delete(testimonials).where(eq(testimonials.id, tid))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "testimonial.deleted", entity: "testimonial", entityId: tid, ipHash: ctx.ipHash })
  refresh()
  return done
}, { name: "testimonial.delete" })

const logoSchema = z.object({ id: id.optional(), name: t(120).min(2), mediaId: id.nullable(), url: t(300).refine((u) => u === "" || /^https:\/\//.test(u), "Must start with https://").default(""), sort: z.number().int().min(0).max(100000), isActive: z.boolean() })
export const saveLogoAction = adminAction("content:write", logoSchema, async (v, ctx) => {
  const values = { name: v.name, mediaId: v.mediaId, url: v.url || null, sort: v.sort, isActive: v.isActive }
  const lid = v.id ?? (await db.insert(clientLogos).values(values).$returningId())[0].id
  if (v.id) await db.update(clientLogos).set(values).where(eq(clientLogos.id, v.id))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: v.id ? "logo.updated" : "logo.created", entity: "client_logo", entityId: lid, ipHash: ctx.ipHash })
  refresh()
  return done
}, { name: "logo.save" })
export const deleteLogoAction = adminAction("content:write", z.object({ id }), async ({ id: lid }, ctx) => {
  await db.delete(clientLogos).where(eq(clientLogos.id, lid))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "logo.deleted", entity: "client_logo", entityId: lid, ipHash: ctx.ipHash })
  refresh()
  return done
}, { name: "logo.delete" })
