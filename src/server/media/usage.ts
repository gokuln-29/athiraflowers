import "server-only"
import { eq, like, sql } from "drizzle-orm"

import { db } from "@/db"
import { blogPosts, categories, clientLogos, homeSections, productImages, seoOverrides, settings } from "@/db/schema"

/** Where an image is used. A media item can only be deleted when this is empty. */
export async function mediaUsage(id: number): Promise<string[]> {
  const out: string[] = []
  const count = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0)
  if (await count(db.select({ n: sql<number>`count(*)` }).from(productImages).where(eq(productImages.mediaId, id)))) out.push("a product")
  if (await count(db.select({ n: sql<number>`count(*)` }).from(categories).where(eq(categories.imageId, id)))) out.push("a category")
  if (await count(db.select({ n: sql<number>`count(*)` }).from(blogPosts).where(eq(blogPosts.coverMediaId, id)))) out.push("a blog post")
  if (await count(db.select({ n: sql<number>`count(*)` }).from(clientLogos).where(eq(clientLogos.mediaId, id)))) out.push("a client logo")
  if (await count(db.select({ n: sql<number>`count(*)` }).from(seoOverrides).where(eq(seoOverrides.ogMediaId, id)))) out.push("a social preview")
  if (await count(db.select({ n: sql<number>`count(*)` }).from(homeSections).where(like(sql`CAST(${homeSections.data} AS CHAR)`, `%"imageMediaId": ${id}%`)))) out.push("the homepage")
  const [heroes] = await db.select().from(settings).where(eq(settings.key, "heroes")).limit(1)
  if (heroes && Object.values(heroes.value).includes(id)) out.push("a page image")
  return out
}
