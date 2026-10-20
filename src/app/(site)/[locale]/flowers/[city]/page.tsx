import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { FaqJsonLd } from "@/components/seo/faq-json-ld"
import { JsonLd } from "@/components/seo/json-ld"
import { ProductCard } from "@/components/shop/product-card"
import { FaqList } from "@/components/site/home-sections"
import { SectionHeading } from "@/components/site/section-heading"
import { Button } from "@/components/ui/button"
import { absoluteUrl, site } from "@/config/site"
import { Link } from "@/i18n/navigation"
import { formatMoney } from "@/lib/format"
import { pageMetadata } from "@/lib/seo"
import { getFeatured } from "@/server/queries/catalog"
import { getSettings, listFaqs } from "@/server/queries/content"
import { listSlots, listZones } from "@/server/queries/delivery"

const CITIES = { dubai: "dubai", "abu-dhabi": "abu_dhabi", sharjah: "sharjah" } as const
type CitySlug = keyof typeof CITIES

export const dynamicParams = false
export function generateStaticParams() {
  return (Object.keys(CITIES) as CitySlug[]).flatMap((city) => ["en", "ar"].map((locale) => ({ locale, city })))
}

export async function generateMetadata({ params }: PageProps<"/[locale]/flowers/[city]">) {
  const { locale, city } = await params
  if (!(city in CITIES)) return {}
  const t = await getTranslations({ locale, namespace: "city" })
  return pageMetadata({ locale, path: `/flowers/${city}`, title: t(`${city as CitySlug}.metaTitle`), description: t(`${city as CitySlug}.metaDescription`) })
}

export default async function CityPage({ params }: PageProps<"/[locale]/flowers/[city]">) {
  const { locale, city } = await params
  if (!(city in CITIES)) notFound()
  setRequestLocale(locale)
  const slug = city as CitySlug
  const emirate = CITIES[slug]
  const [t, tc, zonesAll, slots, products, faqs, settings] = await Promise.all([
    getTranslations({ locale, namespace: "city" }),
    getTranslations({ locale, namespace: "common" }),
    listZones(locale),
    listSlots(locale),
    getFeatured(locale, 4),
    listFaqs("delivery", 4, locale),
    getSettings(),
  ])
  const zones = zonesAll.filter((z) => z.emirate === emirate)
  const sameDay = slots.filter((s) => s.sameDayCutoff)
  const name = tc(`emirates.${emirate}`)
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": ["Florist", "LocalBusiness"],
          name: site.name,
          url: absoluteUrl(`/${locale}/flowers/${slug}`),
          email: settings.contact.email,
          telephone: settings.contact.phone || undefined,
          areaServed: { "@type": "City", name: t(`${slug}.name`) },
          address: { "@type": "PostalAddress", addressLocality: t(`${slug}.name`), addressCountry: "AE" },
          knowsLanguage: ["en", "ar"],
        }}
      />
      <section className="page-grid pt-8 pb-12 lg:pt-14 lg:pb-20">
        <h1 className="text-display !text-[clamp(2.5rem,1.4rem+4.6vw,5rem)] max-w-[18ch]">{t(`${slug}.title`)}</h1>
        <p className="text-lead mt-6 max-w-[62ch] text-foreground/85">{t(`${slug}.intro`)}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button render={<Link href="/shop" />} size="lg">{t("ctaShop")}</Button>
          <Button render={<Link href="/corporate#quote" />} size="lg" variant="outline">{t("ctaQuote")}</Button>
        </div>
      </section>

      <section className="page-grid grid gap-10 py-12 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-5">
          <h2 className="text-h1">{t("deliveryTitle", { city: name })}</h2>
          <p className="text-lead mt-4 text-muted-foreground">{t(`${slug}.areas`)}</p>
        </div>
        <div className="lg:col-span-7">
          <ul className="grid gap-4">
            {zones.map((z) => (
              <li key={z.id} className="bg-surface p-5" style={{ borderRadius: "var(--radius)" }}>
                <p className="font-medium">{z.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {t("zoneLine", { fee: formatMoney(z.feeMinor, locale, { compact: true }), min: formatMoney(z.minOrderMinor, locale, { compact: true }) })}
                  {z.freeOverMinor ? ` ${t("zoneFree", { amount: formatMoney(z.freeOverMinor, locale, { compact: true }) })}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">{z.sameDayAvailable ? t("sameDayYes") : t("sameDayNo")}</p>
              </li>
            ))}
          </ul>
          {sameDay.length > 0 && zones.some((z) => z.sameDayAvailable) && (
            <p className="mt-6 text-muted-foreground">
              {t("cutoffs")} {sameDay.map((s) => `${s.label}: ${s.sameDayCutoff}`).join("; ")}.
            </p>
          )}
        </div>
      </section>

      <section className="page-grid py-12 lg:py-20">
        <SectionHeading title={t("popularTitle", { city: name })} action={<Button render={<Link href="/shop" />} variant="outline">{t("viewAll")}</Button>} />
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} locale={locale} />
            </li>
          ))}
        </ul>
      </section>

      <section className="page-grid grid gap-10 py-12 lg:grid-cols-12 lg:py-20">
        <h2 className="text-h1 lg:col-span-4">{t("faqTitle", { city: name })}</h2>
        <div className="lg:col-span-8">
          <FaqList items={faqs} />
        </div>
        <FaqJsonLd items={faqs} />
      </section>
    </>
  )
}
