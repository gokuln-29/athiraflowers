import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { JsonLd } from "@/components/seo/json-ld"
import { ShopView } from "@/components/shop/shop-view"
import { absoluteUrl } from "@/config/site"
import { pickColumn } from "@/lib/i18n-text"
import { pageMetadata } from "@/lib/seo"
import { getCategory } from "@/server/queries/catalog"
import { getMediaMap } from "@/server/queries/media"

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/shop/[category]">) {
  const { locale, category } = await params
  const sp = await searchParams
  const cat = await getCategory(category)
  if (!cat) return {}
  const image = cat.imageId ? (await getMediaMap([cat.imageId])).get(cat.imageId) : null
  const name = pickColumn(cat.nameEn, cat.nameAr, locale)
  return pageMetadata({
    locale,
    path: `/shop/${cat.slug}`,
    title: pickColumn(cat.seoTitleEn, cat.seoTitleAr, locale) || name,
    description: pickColumn(cat.seoDescriptionEn, cat.seoDescriptionAr, locale) || pickColumn(cat.descriptionEn, cat.descriptionAr, locale),
    image,
    noindex: Object.keys(sp).length > 0,
  })
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/shop/[category]">) {
  const { locale, category } = await params
  setRequestLocale(locale)
  const cat = await getCategory(category)
  if (!cat) notFound()
  const name = pickColumn(cat.nameEn, cat.nameAr, locale)
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: locale === "ar" ? "المتجر" : "Shop", item: absoluteUrl(`/${locale}/shop`) },
            { "@type": "ListItem", position: 2, name, item: absoluteUrl(`/${locale}/shop/${cat.slug}`) },
          ],
        }}
      />
      <ShopView locale={locale} categorySlug={cat.slug} title={name} description={pickColumn(cat.descriptionEn, cat.descriptionAr, locale)} searchParams={await searchParams} basePath={`/shop/${cat.slug}`} />
    </>
  )
}
