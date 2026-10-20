import { eq, and, ne, isNotNull, lte, sql } from "drizzle-orm"
import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/config/site"
import { db } from "@/db"
import { blogPosts, categories, products, seoOverrides } from "@/db/schema"

export const dynamic = "force-dynamic"

const STATIC = ["/", "/shop", "/corporate", "/events", "/offers", "/about", "/contact", "/delivery", "/blog", "/flowers/dubai", "/flowers/abu-dhabi", "/flowers/sharjah", "/privacy", "/terms", "/refund"]

/** Every public URL in both languages, each with hreflang alternates. Pages marked noindex in the admin are left out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cats, prods, posts, hidden] = await Promise.all([
    db.select({ slug: categories.slug, at: categories.updatedAt }).from(categories).where(eq(categories.isActive, true)),
    db.select({ slug: products.slug, at: products.updatedAt }).from(products).where(eq(products.isActive, true)),
    db.select({ slug: blogPosts.slug, at: blogPosts.updatedAt }).from(blogPosts).where(and(ne(blogPosts.status, "draft"), isNotNull(blogPosts.publishedAt), lte(blogPosts.publishedAt, sql`UTC_TIMESTAMP(3)`))),
    db.select({ path: seoOverrides.path }).from(seoOverrides).where(eq(seoOverrides.noindex, true)),
  ])
  const noindex = new Set(hidden.map((h) => h.path))
  const entry = (path: string, lastModified?: Date, priority = 0.6): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(`/en${path === "/" ? "" : path}`),
    lastModified,
    priority,
    alternates: { languages: { en: absoluteUrl(`/en${path === "/" ? "" : path}`), ar: absoluteUrl(`/ar${path === "/" ? "" : path}`) } },
  })
  const all = [
    ...STATIC.map((p) => entry(p, undefined, p === "/" ? 1 : 0.8)),
    ...cats.map((c) => entry(`/shop/${c.slug}`, c.at, 0.8)),
    ...prods.map((p) => entry(`/product/${p.slug}`, p.at, 0.7)),
    ...posts.map((p) => entry(`/blog/${p.slug}`, p.at, 0.5)),
  ]
  // One entry per page lists both languages through hreflang; Arabic URLs are also listed so each is discoverable on its own.
  const out: MetadataRoute.Sitemap = []
  for (const e of all) {
    const path = new URL(e.url).pathname.replace(/^\/en/, "") || "/"
    if (noindex.has(path)) continue
    out.push(e)
    out.push({ ...e, url: absoluteUrl(`/ar${path === "/" ? "" : path}`) })
  }
  return out
}
