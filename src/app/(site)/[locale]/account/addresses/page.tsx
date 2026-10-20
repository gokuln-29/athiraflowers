import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { AddressForm, DeleteAddressButton } from "@/components/account/account-forms"
import { pageMetadata } from "@/lib/seo"
import { getCustomer } from "@/server/auth/customer-session"
import { listAddresses } from "@/server/queries/account"

export async function generateMetadata({ params }: PageProps<"/[locale]/account/addresses">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "account" })
  return pageMetadata({ locale, path: "/account/addresses", title: t("nav.addresses"), description: t("nav.addresses"), noindex: true })
}

export default async function AddressesPage({ params }: PageProps<"/[locale]/account/addresses">) {
  const { locale } = await params
  setRequestLocale(locale)
  const me = await getCustomer()
  if (!me) redirect(`/${locale}/account/login`)
  const [t, tc, list] = await Promise.all([getTranslations({ locale, namespace: "account" }), getTranslations({ locale, namespace: "common" }), listAddresses(me.id)])
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <section>
        <h2 className="text-h2">{t("nav.addresses")}</h2>
        {list.length === 0 ? <p className="mt-4 text-muted-foreground">{t("addr.none")}</p> : (
          <ul className="mt-6 grid gap-4">
            {list.map((a) => (
              <li key={a.id} className="bg-surface p-5" style={{ borderRadius: "var(--radius)" }}>
                <p className="font-medium">{a.label}{a.isDefault ? ` · ${t("addr.defaultBadge")}` : ""}</p>
                <p className="text-muted-foreground">{a.recipientName}, <span dir="ltr">{a.phone}</span></p>
                <p className="text-muted-foreground">{a.building}, {a.area}, {tc(`emirates.${a.emirate}`)}</p>
                <div className="mt-2"><DeleteAddressButton id={a.id} /></div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-h2">{t("addr.add")}</h2>
        <div className="mt-6"><AddressForm /></div>
      </section>
    </div>
  )
}
