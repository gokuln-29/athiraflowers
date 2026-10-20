import { getTranslations, setRequestLocale } from "next-intl/server"

import { CopyCode } from "@/components/shop/copy-code"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { formatDate, formatMoney } from "@/lib/format"
import { pageMetadata } from "@/lib/seo"
import { listPublicOffers } from "@/server/queries/content"
import { getSeoOverride } from "@/server/queries/seo"

export async function generateMetadata({ params }: PageProps<"/[locale]/offers">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "offers" })
  const o = await getSeoOverride("/offers", locale)
  return pageMetadata({ locale, path: "/offers", title: o.title ?? t("metaTitle"), description: o.description ?? t("metaDescription"), noindex: o.noindex })
}

export default async function OffersPage({ params }: PageProps<"/[locale]/offers">) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "offers" })
  const offers = await listPublicOffers(locale)
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <h1 className="text-display !text-[clamp(2.5rem,1.5rem+4vw,4.5rem)]">{t("title")}</h1>
      <p className="text-lead mt-4 max-w-[56ch] text-muted-foreground">{t("lead")}</p>

      {offers.length === 0 ? (
        <div className="mt-12 grid place-items-center gap-4 bg-surface py-20 text-center" style={{ borderRadius: "var(--radius)" }}>
          <p className="text-h2">{t("noneTitle")}</p>
          <p className="max-w-[44ch] text-muted-foreground">{t("noneBody")}</p>
          <Button render={<Link href="/corporate#quote" />}>{t("bulkCta")}</Button>
        </div>
      ) : (
        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {offers.map((o) => (
            <li key={o.code} className="grid content-between gap-8 bg-surface p-8" style={{ borderRadius: "var(--radius)" }}>
              <div>
                <h2 className="text-h2">{o.title || o.code}</h2>
                {o.description && <p className="mt-3 max-w-[48ch] text-muted-foreground">{o.description}</p>}
                <ul className="mt-5 grid gap-1 text-sm text-muted-foreground">
                  <li>{o.kind === "percent" ? t("percentOff", { value: o.value }) : t("amountOff", { amount: formatMoney(o.value, locale, { compact: true }) })}</li>
                  {o.minOrderMinor > 0 && <li>{t("minOrder", { amount: formatMoney(o.minOrderMinor, locale, { compact: true }) })}</li>}
                  {o.maxDiscountMinor ? <li>{t("maxDiscount", { amount: formatMoney(o.maxDiscountMinor, locale, { compact: true }) })}</li> : null}
                  {o.endsAt ? <li>{t("until", { date: formatDate(o.endsAt, locale) })}</li> : null}
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <CopyCode code={o.code} />
                <Button render={<Link href="/shop" />}>{t("shopNow")}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-10 text-muted-foreground">
        {t("bulkNote")} <Link href="/corporate#quote" className="font-medium text-primary underline underline-offset-4">{t("bulkCta")}</Link>
      </p>
    </div>
  )
}
