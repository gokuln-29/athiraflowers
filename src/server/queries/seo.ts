import "server-only"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { seoOverrides } from "@/db/schema"
import { pickColumn } from "@/lib/i18n-text"

/** Per-page SEO managed in the admin (SEO screen). Empty fields fall back to page defaults. */
export async function getSeoOverride(path: string, locale: string) {
  const [row] = await db.select().from(seoOverrides).where(eq(seoOverrides.path, path)).limit(1)
  const title = row ? pickColumn(row.titleEn, row.titleAr, locale) : ""
  const description = row ? pickColumn(row.descriptionEn, row.descriptionAr, locale) : ""
  return { title: title || undefined, description: description || undefined, noindex: row?.noindex ?? false, ogMediaId: row?.ogMediaId ?? null }
}
