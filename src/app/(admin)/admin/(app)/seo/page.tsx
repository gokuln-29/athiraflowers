import { PageHeader } from "@/components/admin/shell"
import { SeoManager, type SeoRow } from "@/components/admin/seo-manager"
import { db } from "@/db"
import { seoOverrides } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "SEO" }

const PAGES: [string, string][] = [["/", "Home"], ["/shop", "Shop"], ["/corporate", "Corporate"], ["/events", "Events"], ["/offers", "Offers"], ["/blog", "Journal"], ["/about", "About"], ["/contact", "Contact"], ["/privacy", "Privacy policy"], ["/terms", "Terms of sale"], ["/delivery", "Delivery policy"], ["/refund", "Refund policy"]]

export default async function SeoPage() {
  await requirePage("content:write")
  const existing = new Map((await db.select().from(seoOverrides)).map((r) => [r.path, r]))
  const rows: SeoRow[] = PAGES.map(([path, label]) => {
    const r = existing.get(path)
    return { path, label, titleEn: r?.titleEn ?? "", titleAr: r?.titleAr ?? "", descriptionEn: r?.descriptionEn ?? "", descriptionAr: r?.descriptionAr ?? "", noindex: r?.noindex ?? false, ogMediaId: r?.ogMediaId ?? null }
  })
  return (<><PageHeader title="SEO" description="Search titles, descriptions and indexing for the main pages, in English and Arabic." /><SeoManager rows={rows} /></>)
}
