import { desc, eq } from "drizzle-orm"

import { BlogManager, type PostRow } from "@/components/admin/blog-manager"
import { PageHeader } from "@/components/admin/shell"
import { db } from "@/db"
import { blogCategories, blogPosts, media } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Blog" }

/** Dubai wall-clock "YYYY-MM-DDTHH:mm" for a datetime-local input. */
const dubaiLocal = (d: Date | null) => (d ? new Date(d.getTime() + 4 * 3600_000).toISOString().slice(0, 16) : "")

export default async function BlogPage() {
  const ctx = await requirePage("blog:write")
  const [rows, cats] = await Promise.all([
    db.select({ p: blogPosts, m: media }).from(blogPosts).leftJoin(media, eq(media.id, blogPosts.coverMediaId)).orderBy(desc(blogPosts.id)).limit(300),
    db.select({ id: blogCategories.id, nameEn: blogCategories.nameEn }).from(blogCategories),
  ])
  const data: PostRow[] = rows.map(({ p, m }) => ({
    id: p.id, slug: p.slug, titleEn: p.titleEn, titleAr: p.titleAr, excerptEn: p.excerptEn, excerptAr: p.excerptAr, bodyEn: p.bodyEn, bodyAr: p.bodyAr ?? "",
    cover: m ? { id: m.id, key: m.key, width: m.width, height: m.height, altEn: m.altEn, altAr: m.altAr, credit: m.credit, variants: (m.variants ?? []).map((v) => ({ w: v.w, h: v.h, key: v.key })) } : null,
    categoryId: p.categoryId, authorName: p.authorName, status: p.status, publishAt: dubaiLocal(p.publishedAt), publishedAt: p.publishedAt?.toISOString() ?? null,
    seoTitleEn: p.seoTitleEn ?? "", seoTitleAr: p.seoTitleAr ?? "", seoDescriptionEn: p.seoDescriptionEn ?? "", seoDescriptionAr: p.seoDescriptionAr ?? "",
  }))
  return (<><PageHeader title="Blog" description="Guides and news. Scheduled articles go live automatically at the chosen Dubai time." /><BlogManager rows={data} cats={cats} author={ctx.name ?? "Athira flowers"} /></>)
}
