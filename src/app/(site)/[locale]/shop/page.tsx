import { getTranslations, setRequestLocale } from "next-intl/server"

import { ShopView } from "@/components/shop/shop-view"
import { pageMetadata } from "@/lib/seo"
import { getSeoOverride } from "@/server/queries/seo"

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/shop">) {
  const { locale } = await params
  const sp = await searchParams
  const t = await getTranslations({ locale, namespace: "shop" })
  const o = await getSeoOverride("/shop", locale)
  // Filtered, sorted and paginated views duplicate the main listing: keep them out of the index.
  const filtered = Object.keys(sp).length > 0
  return pageMetadata({ locale, path: "/shop", title: o.title ?? t("metaTitle"), description: o.description ?? t("metaDescription"), noindex: filtered || o.noindex })
}

export default async function ShopPage({ params, searchParams }: PageProps<"/[locale]/shop">) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "shop" })
  return <ShopView locale={locale} title={t("title")} description={t("intro")} searchParams={await searchParams} basePath="/shop" />
}
