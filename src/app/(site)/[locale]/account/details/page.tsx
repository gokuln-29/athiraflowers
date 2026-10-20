import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { DetailsForm, EraseAccount } from "@/components/account/account-forms"
import { pageMetadata } from "@/lib/seo"
import { getCustomer } from "@/server/auth/customer-session"
import { getCustomerRow } from "@/server/queries/account"

export async function generateMetadata({ params }: PageProps<"/[locale]/account/details">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "account" })
  return pageMetadata({ locale, path: "/account/details", title: t("nav.details"), description: t("nav.details"), noindex: true })
}

export default async function DetailsPage({ params }: PageProps<"/[locale]/account/details">) {
  const { locale } = await params
  setRequestLocale(locale)
  const me = await getCustomer()
  if (!me) redirect(`/${locale}/account/login`)
  const [t, row] = await Promise.all([getTranslations({ locale, namespace: "account" }), getCustomerRow(me.id)])
  return (
    <div className="grid max-w-3xl gap-14">
      <section>
        <h2 className="text-h2">{t("nav.details")}</h2>
        <div className="mt-6">
          <DetailsForm initial={{ name: row?.name ?? "", phone: row?.phone ?? "", companyName: row?.companyName ?? "", companyTrn: row?.companyTrn ?? "", marketingConsent: row?.marketingConsent ?? false }} />
        </div>
      </section>
      <section className="border-t pt-10">
        <h2 className="text-h3">{t("erase.title")}</h2>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">{t("erase.lead")}</p>
        <div className="mt-4"><EraseAccount /></div>
      </section>
    </div>
  )
}
