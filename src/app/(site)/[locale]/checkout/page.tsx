import { getTranslations, setRequestLocale } from "next-intl/server"

import { CheckoutForm } from "@/components/shop/checkout-form"
import { pageMetadata } from "@/lib/seo"
import { getCustomer } from "@/server/auth/customer-session"
import { getSettings } from "@/server/queries/content"
import { listZones } from "@/server/queries/delivery"

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "checkout" })
  // Checkout is private and never indexed.
  return pageMetadata({ locale, path: "/checkout", title: t("title"), description: t("title"), noindex: true })
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params
  setRequestLocale(locale)
  const [zones, settings, customer] = await Promise.all([listZones(locale), getSettings(), getCustomer()])
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <CheckoutForm
        zones={zones}
        defaults={{ name: customer?.name ?? "", email: customer?.email ?? "", phone: customer?.phone ?? "" }}
        signedIn={!!customer}
        substitution={locale === "ar" ? settings.checkout.substitutionPolicyAr : settings.checkout.substitutionPolicyEn}
      />
    </div>
  )
}
