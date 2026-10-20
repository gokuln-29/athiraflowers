import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { Markdown } from "@/components/site/markdown"
import { pickColumn } from "@/lib/i18n-text"
import { pageMetadata } from "@/lib/seo"
import { getPage } from "@/server/queries/content"
import { getSeoOverride } from "@/server/queries/seo"

export async function legalMetadata(key: string, params: Promise<{ locale: string }>) {
  const { locale } = await params
  const page = await getPage(key)
  if (!page) return {}
  const o = await getSeoOverride(`/${key}`, locale)
  return pageMetadata({
    locale, path: `/${key}`,
    title: o.title ?? (pickColumn(page.seoTitleEn, page.seoTitleAr, locale) || pickColumn(page.titleEn, page.titleAr, locale)),
    description: o.description ?? (pickColumn(page.seoDescriptionEn, page.seoDescriptionAr, locale) || pickColumn(page.titleEn, page.titleAr, locale)),
    noindex: o.noindex,
  })
}

export async function LegalPage({ pageKey, params }: { pageKey: string; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const page = await getPage(pageKey)
  if (!page) notFound()
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <h1 className="text-h1 max-w-[24ch]">{pickColumn(page.titleEn, page.titleAr, locale)}</h1>
      <div className="mt-8 max-w-[68ch]">
        <Markdown source={pickColumn(page.bodyEn, page.bodyAr, locale)} />
      </div>
    </div>
  )
}
