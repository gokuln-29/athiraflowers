import { asc, eq } from "drizzle-orm"

import { ContentManager } from "@/components/admin/content-manager"
import { PageHeader } from "@/components/admin/shell"
import { db } from "@/db"
import { clientLogos, faqs, homeSections, media, pages, testimonials } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Pages and homepage" }

export default async function PagesAdmin() {
  await requirePage("content:write")
  const [pageRows, sections, faqRows, tRows, logoRows] = await Promise.all([
    db.select().from(pages).orderBy(asc(pages.id)),
    db.select().from(homeSections).orderBy(asc(homeSections.sort), asc(homeSections.id)),
    db.select().from(faqs).orderBy(asc(faqs.sort), asc(faqs.id)),
    db.select().from(testimonials).orderBy(asc(testimonials.sort), asc(testimonials.id)),
    db.select({ l: clientLogos, m: media }).from(clientLogos).leftJoin(media, eq(media.id, clientLogos.mediaId)).orderBy(asc(clientLogos.sort), asc(clientLogos.id)),
  ])
  return (
    <>
      <PageHeader title="Pages and homepage" description="Edit what visitors read. Arabic falls back to English when left empty." />
      <ContentManager
        pages={pageRows.map((p) => ({ key: p.key, titleEn: p.titleEn, titleAr: p.titleAr, bodyEn: p.bodyEn, bodyAr: p.bodyAr ?? "", seoTitleEn: p.seoTitleEn ?? "", seoTitleAr: p.seoTitleAr ?? "", seoDescriptionEn: p.seoDescriptionEn ?? "", seoDescriptionAr: p.seoDescriptionAr ?? "", reviewedAt: p.reviewedAt?.toISOString() ?? null }))}
        sections={sections.map((s) => ({ id: s.id, type: s.type, isActive: s.isActive, data: s.data }))}
        faqs={faqRows.map((f) => ({ id: f.id, group: f.group, questionEn: f.questionEn, questionAr: f.questionAr, answerEn: f.answerEn, answerAr: f.answerAr ?? "", sort: f.sort, isActive: f.isActive }))}
        testimonials={tRows.map((t) => ({ id: t.id, authorName: t.authorName, authorRole: t.authorRole ?? "", company: t.company ?? "", quoteEn: t.quoteEn, quoteAr: t.quoteAr ?? "", isSample: t.isSample, sort: t.sort, isActive: t.isActive }))}
        logos={logoRows.map(({ l, m }) => ({ id: l.id, name: l.name, url: l.url ?? "", sort: l.sort, isActive: l.isActive, image: m ? { id: m.id, key: m.key, width: m.width, height: m.height, altEn: m.altEn, altAr: m.altAr, credit: m.credit, variants: (m.variants ?? []).map((v) => ({ w: v.w, h: v.h, key: v.key })) } : null }))}
      />
    </>
  )
}
