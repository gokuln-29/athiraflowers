import { asc, eq, sql } from "drizzle-orm"

import { CategoriesManager, type CategoryRow } from "@/components/admin/categories-manager"
import { PageHeader } from "@/components/admin/shell"
import { db } from "@/db"
import { categories, media } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"
import { can } from "@/server/auth/permissions"

export const metadata = { title: "Categories" }

export default async function CategoriesPage() {
  const ctx = await requirePage("catalog:read")
  const rows = await db.select({ c: categories, m: media, n: sql<number>`(select count(*) from products p where p.category_id = categories.id)` }).from(categories).leftJoin(media, eq(media.id, categories.imageId)).orderBy(asc(categories.sort), asc(categories.id))
  const data: CategoryRow[] = rows.map(({ c, m, n }) => ({
    id: c.id, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, descriptionEn: c.descriptionEn ?? "", descriptionAr: c.descriptionAr ?? "", sort: c.sort, isActive: c.isActive,
    seoTitleEn: c.seoTitleEn ?? "", seoTitleAr: c.seoTitleAr ?? "", seoDescriptionEn: c.seoDescriptionEn ?? "", seoDescriptionAr: c.seoDescriptionAr ?? "", products: Number(n),
    image: m ? { id: m.id, key: m.key, width: m.width, height: m.height, altEn: m.altEn, altAr: m.altAr, credit: m.credit, variants: (m.variants ?? []).map((v) => ({ w: v.w, h: v.h, key: v.key })) } : null,
  }))
  return (<><PageHeader title="Categories" description="Groups shown in the shop and the footer." /><CategoriesManager rows={data} canWrite={can(ctx.role, "catalog:write")} /></>)
}
