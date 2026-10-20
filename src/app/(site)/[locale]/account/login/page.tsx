import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { LoginPanel } from "@/components/account/login-panel"
import { pageMetadata } from "@/lib/seo"
import { getCustomer } from "@/server/auth/customer-session"

export async function generateMetadata({ params }: PageProps<"/[locale]/account/login">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "account" })
  return pageMetadata({ locale, path: "/account/login", title: t("login.title"), description: t("login.lead"), noindex: true })
}

export default async function LoginPage({ params }: PageProps<"/[locale]/account/login">) {
  const { locale } = await params
  setRequestLocale(locale)
  if (await getCustomer()) redirect(`/${locale}/account`)
  const t = await getTranslations({ locale, namespace: "account" })
  return (
    <div className="mx-auto max-w-md pt-4">
      <h1 className="text-h1">{t("login.title")}</h1>
      <p className="text-lead mt-3 mb-8 text-muted-foreground">{t("login.lead")}</p>
      <LoginPanel />
    </div>
  )
}
