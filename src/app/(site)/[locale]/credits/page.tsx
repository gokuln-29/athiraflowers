import { getTranslations, setRequestLocale } from "next-intl/server"

import { db } from "@/db"
import { media } from "@/db/schema"
import { pageMetadata } from "@/lib/seo"
import { isNotNull } from "drizzle-orm"

export async function generateMetadata({ params }: PageProps<"/[locale]/credits">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "legal" })
  return pageMetadata({ locale, path: "/credits", title: t("creditsTitle"), description: t("creditsLead"), noindex: true })
}

export default async function CreditsPage({ params }: PageProps<"/[locale]/credits">) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "legal" })
  const rows = await db.select({ credit: media.credit }).from(media).where(isNotNull(media.credit))
  const credits = [...new Set(rows.map((r) => r.credit!.replace(/ \/ Unsplash.*/, "")))].sort((a, b) => a.localeCompare(b))
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <h1 className="text-h1">{t("creditsTitle")}</h1>
      <p className="text-lead mt-4 max-w-[60ch] text-muted-foreground">{t("creditsLead")}</p>
      <ul className="mt-8 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {credits.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  )
}
