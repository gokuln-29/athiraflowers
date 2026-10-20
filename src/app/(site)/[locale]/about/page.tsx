import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Markdown } from "@/components/site/markdown"
import { Media } from "@/components/site/media"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { pickColumn } from "@/lib/i18n-text"
import { pageMetadata } from "@/lib/seo"
import { getHeroMedia, getPage } from "@/server/queries/content"
import { getSeoOverride } from "@/server/queries/seo"

export async function generateMetadata({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params
  const page = await getPage("about")
  const o = await getSeoOverride("/about", locale)
  return pageMetadata({
    locale, path: "/about",
    title: o.title ?? (page ? pickColumn(page.seoTitleEn ?? page.titleEn, page.seoTitleAr ?? page.titleAr, locale) : "About"),
    description: o.description ?? (page ? pickColumn(page.seoDescriptionEn, page.seoDescriptionAr, locale) : "") ?? "",
    image: await getHeroMedia("about"), noindex: o.noindex,
  })
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params
  setRequestLocale(locale)
  const [page, hero, t] = await Promise.all([getPage("about"), getHeroMedia("about"), getTranslations({ locale, namespace: "about" })])
  if (!page) notFound()
  return (
    <div className="page-grid pt-8 lg:pt-14">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <h1 className="text-display !text-[clamp(2.5rem,1.5rem+4vw,4.5rem)]">{pickColumn(page.titleEn, page.titleAr, locale)}</h1>
          <div className="text-lead mt-8 max-w-[58ch]">
            <Markdown source={pickColumn(page.bodyEn, page.bodyAr, locale)} />
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button render={<Link href="/corporate#quote" />} size="lg">{t("ctaQuote")}</Button>
            <Button render={<Link href="/contact" />} size="lg" variant="outline">{t("ctaContact")}</Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-[var(--radius)] bg-surface-deep lg:col-span-6">
          <Media media={hero} locale={locale} ratio="4 / 5" priority sizes="(min-width:1024px) 50vw, 100vw" />
        </div>
      </div>
    </div>
  )
}
