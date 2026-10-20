import { getTranslations, setRequestLocale } from "next-intl/server"

import { CartView } from "@/components/shop/cart-view"
import { pageMetadata } from "@/lib/seo"

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "cart" })
  return pageMetadata({ locale, path: "/cart", title: t("title"), description: t("title"), noindex: true })
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <CartView />
    </div>
  )
}
