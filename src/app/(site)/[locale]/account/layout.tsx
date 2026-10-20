import { getTranslations } from "next-intl/server"

import { SignOutButton } from "@/components/account/account-forms"
import { Link } from "@/i18n/navigation"
import { getCustomer } from "@/server/auth/customer-session"

export default async function AccountLayout({ children, params }: LayoutProps<"/[locale]/account">) {
  const { locale } = await params
  const [t, me] = await Promise.all([getTranslations({ locale, namespace: "account" }), getCustomer()])
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      {me && (
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-h1">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{me.email}</p>
          </div>
          <SignOutButton />
        </div>
      )}
      {me && (
        <nav aria-label={t("title")} className="mb-10 flex gap-2 overflow-x-auto">
          {([["/account", t("nav.orders")], ["/account/addresses", t("nav.addresses")], ["/account/details", t("nav.details")]] as const).map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex h-11 items-center whitespace-nowrap border border-input px-4 hover:bg-surface-deep" style={{ borderRadius: "var(--radius)" }}>{label}</Link>
          ))}
        </nav>
      )}
      {children}
    </div>
  )
}
