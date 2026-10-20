import "server-only"
import { and, asc, desc, eq, inArray, isNotNull, lte, ne, sql } from "drizzle-orm"

import { db } from "@/db"
import { blogCategories, blogPosts, clientLogos, coupons, faqs, homeSections, pages, settings, testimonials } from "@/db/schema"
import { seedSettings } from "@/db/seed/content"
import { pickColumn } from "@/lib/i18n-text"
import type { MediaLite } from "@/lib/media"

import { getMediaMap } from "./media"

export type StoreSettings = typeof seedSettings

/** Settings are stored as JSON per group; missing keys fall back to defaults so the site never breaks. */
export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.select().from(settings)
  const out = structuredClone(seedSettings) as Record<string, Record<string, unknown>>
  for (const row of rows) out[row.key] = { ...(out[row.key] ?? {}), ...row.value }
  return out as StoreSettings
}

export async function getHomeSections() {
  return db.select().from(homeSections).where(eq(homeSections.isActive, true)).orderBy(asc(homeSections.sort), asc(homeSections.id))
}

export async function getPage(key: string) {
  const [row] = await db.select().from(pages).where(eq(pages.key, key)).limit(1)
  return row ?? null
}

export async function listFaqs(group: string, limit: number, locale: string) {
  const rows = await db
    .select()
    .from(faqs)
    .where(group === "all" ? eq(faqs.isActive, true) : and(eq(faqs.isActive, true), eq(faqs.group, group as "general")))
    .orderBy(asc(faqs.sort), asc(faqs.id))
    .limit(limit)
  return rows.map((f) => ({ id: f.id, question: pickColumn(f.questionEn, f.questionAr, locale), answer: pickColumn(f.answerEn, f.answerAr, locale), group: f.group }))
}

export async function listTestimonials(locale: string) {
  const rows = await db.select().from(testimonials).where(eq(testimonials.isActive, true)).orderBy(asc(testimonials.sort))
  return rows.map((t) => ({ id: t.id, author: t.authorName, role: t.authorRole, company: t.company, quote: pickColumn(t.quoteEn, t.quoteAr, locale) }))
}

export async function listLogos() {
  const rows = await db.select().from(clientLogos).where(eq(clientLogos.isActive, true)).orderBy(asc(clientLogos.sort))
  const mediaMap = await getMediaMap(rows.map((r) => r.mediaId))
  return rows.flatMap((r) => (r.mediaId && mediaMap.has(r.mediaId) ? [{ id: r.id, name: r.name, url: r.url, image: mediaMap.get(r.mediaId)! }] : []))
}

export async function listPublicOffers(locale: string) {
  const now = new Date()
  const rows = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.isActive, true), eq(coupons.isPublic, true)))
    .orderBy(desc(coupons.id))
  return rows
    .filter((c) => (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt >= now) && (c.maxUses == null || c.usedCount < c.maxUses))
    .map((c) => ({
      code: c.code,
      kind: c.kind,
      value: c.value,
      minOrderMinor: c.minOrderMinor,
      maxDiscountMinor: c.maxDiscountMinor,
      endsAt: c.endsAt,
      title: pickColumn(c.titleEn, c.titleAr, locale),
      description: pickColumn(c.descriptionEn, c.descriptionAr, locale),
    }))
}

export type PostCard = {
  id: number
  slug: string
  title: string
  excerpt: string
  publishedAt: Date
  readingMinutes: number
  authorName: string
  category: { slug: string; name: string } | null
  cover: MediaLite | null
}

const publicPost = () => and(ne(blogPosts.status, "draft"), isNotNull(blogPosts.publishedAt), lte(blogPosts.publishedAt, sql`UTC_TIMESTAMP(3)`))

async function toPostCards(rows: (typeof blogPosts.$inferSelect)[], locale: string): Promise<PostCard[]> {
  const cats = await db.select().from(blogCategories)
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const mediaMap = await getMediaMap(rows.map((r) => r.coverMediaId))
  return rows.map((p) => {
    const c = p.categoryId ? catMap.get(p.categoryId) : undefined
    return {
      id: p.id,
      slug: p.slug,
      title: pickColumn(p.titleEn, p.titleAr, locale),
      excerpt: pickColumn(p.excerptEn, p.excerptAr, locale),
      publishedAt: p.publishedAt!,
      readingMinutes: p.readingMinutes,
      authorName: p.authorName,
      category: c ? { slug: c.slug, name: pickColumn(c.nameEn, c.nameAr, locale) } : null,
      cover: p.coverMediaId ? (mediaMap.get(p.coverMediaId) ?? null) : null,
    }
  })
}

export async function listPosts(locale: string, opts: { categorySlug?: string; limit?: number; excludeId?: number } = {}): Promise<PostCard[]> {
  let categoryId: number | undefined
  if (opts.categorySlug) {
    const [c] = await db.select().from(blogCategories).where(eq(blogCategories.slug, opts.categorySlug)).limit(1)
    if (!c) return []
    categoryId = c.id
  }
  const rows = await db
    .select()
    .from(blogPosts)
    .where(and(publicPost(), categoryId ? eq(blogPosts.categoryId, categoryId) : undefined, opts.excludeId ? ne(blogPosts.id, opts.excludeId) : undefined))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(opts.limit ?? 50)
  return toPostCards(rows, locale)
}

export async function getPostBySlug(slug: string) {
  const [row] = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), publicPost())).limit(1)
  return row ?? null
}

export async function listBlogCategories(locale: string) {
  const rows = await db.select().from(blogCategories).orderBy(asc(blogCategories.sort))
  return rows.map((c) => ({ id: c.id, slug: c.slug, name: pickColumn(c.nameEn, c.nameAr, locale) }))
}

export async function getBlogCategory(slug: string) {
  const [row] = await db.select().from(blogCategories).where(eq(blogCategories.slug, slug)).limit(1)
  return row ?? null
}

export { inArray }

/** Hero image for a marketing page, configured in Store settings. */
export async function getHeroMedia(page: string): Promise<MediaLite | null> {
  const s = await getSettings()
  const id = (s.heroes as Record<string, number | null>)[page]
  if (!id) return null
  return (await getMediaMap([id])).get(id) ?? null
}

export async function getBlogCategoryById(id: number) {
  const [row] = await db.select().from(blogCategories).where(eq(blogCategories.id, id)).limit(1)
  return row ?? null
}
