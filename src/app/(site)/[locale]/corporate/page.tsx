import { ArrowRight } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { FaqJsonLd } from "@/components/seo/faq-json-ld"
import { LeadForm } from "@/components/forms/lead-form"
import { ProgramEstimator } from "@/components/forms/program-estimator"
import { ProductCard } from "@/components/shop/product-card"
import { FaqList } from "@/components/site/home-sections"
import { Media } from "@/components/site/media"
import { SectionHeading } from "@/components/site/section-heading"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { pageMetadata } from "@/lib/seo"
import { listProducts } from "@/server/queries/catalog"
import { getHeroMedia, listFaqs } from "@/server/queries/content"
import { getSeoOverride } from "@/server/queries/seo"

export async function generateMetadata({ params }: PageProps<"/[locale]/corporate">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "corporate" })
  const o = await getSeoOverride("/corporate", locale)
  return pageMetadata({ locale, path: "/corporate", title: o.title ?? t("metaTitle"), description: o.description ?? t("metaDescription"), noindex: o.noindex })
}

export default async function CorporatePage({ params }: PageProps<"/[locale]/corporate">) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "corporate" })
  const [programs, gifting, faqs] = await Promise.all([
    listProducts({ locale, categorySlug: "weekly-programs", pageSize: 8 }),
    listProducts({ locale, categorySlug: "corporate-gifting", pageSize: 4 }),
    listFaqs("corporate", 6, locale),
  ])
  const heroMedia = await getHeroMedia("corporate")
  const steps = [1, 2, 3, 4].map((n) => ({ title: t(`steps.${n}.title`), body: t(`steps.${n}.body`) }))

  return (
    <>
      <section aria-labelledby="corp-title" className="page-grid grid items-end gap-8 pt-6 pb-16 lg:grid-cols-12 lg:gap-12 lg:pt-10 lg:pb-24">
        <div className="lg:col-span-7 lg:pb-6">
          <h1 id="corp-title" className="text-display !text-[clamp(2.5rem,1.4rem+5vw,5.25rem)]">{t("title")}</h1>
          <p className="text-lead mt-6 max-w-[52ch] text-foreground/85">{t("lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<a href="#quote" />} size="lg">{t("ctaQuote")}</Button>
            <Button render={<Link href="/shop/weekly-programs" />} size="lg" variant="outline">{t("ctaPrograms")}</Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-[var(--radius)] bg-surface-deep lg:col-span-5">
          <Media media={heroMedia} locale={locale} ratio="4 / 5" priority sizes="(min-width:1024px) 40vw, 100vw" />
        </div>
      </section>

      <section className="page-grid py-12 lg:py-20">
        <SectionHeading title={t("offerTitle")} />
        <ul className="mt-10 grid gap-px bg-border md:grid-cols-3">
          {(["programs", "gifting", "events"] as const).map((k) => (
            <li key={k} className="bg-background py-8 md:px-8 md:first:ps-0 md:last:pe-0">
              <h3 className="text-h2 !text-[1.75rem]">{t(`offer.${k}.title`)}</h3>
              <p className="mt-3 max-w-[40ch] text-muted-foreground">{t(`offer.${k}.body`)}</p>
              <Link href={k === "programs" ? "/shop/weekly-programs" : k === "gifting" ? "/shop/corporate-gifting" : "/events"} className="mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-primary">
                {t(`offer.${k}.cta`)}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="page-grid py-12 lg:py-20" aria-labelledby="estimator-title">
        <SectionHeading title={t("estimatorTitle")} body={t("estimatorBody")} className="mb-10" />
        <ProgramEstimator programs={programs.items.filter((p) => p.pricingType === "subscription").map((p) => ({ id: p.id, name: p.name }))} />
        <span id="estimator-title" hidden>{t("estimatorTitle")}</span>
      </section>

      {programs.items.length > 0 && (
        <section className="page-grid py-12 lg:py-20">
          <SectionHeading title={t("programsTitle")} action={<Button render={<Link href="/shop/weekly-programs" />} variant="outline">{t("viewAll")}</Button>} />
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {programs.items.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="my-12 bg-night text-night-foreground lg:my-20">
        <div className="page-grid grid gap-10 py-16 lg:grid-cols-12 lg:py-24">
          <h2 className="text-h1 max-w-[16ch] lg:col-span-5">{t("invoiceTitle")}</h2>
          <ul className="grid gap-6 lg:col-span-7 sm:grid-cols-2">
            {([1, 2, 3, 4] as const).map((n) => (
              <li key={n}>
                <h3 className="text-h3">{t(`invoice.${n}.title`)}</h3>
                <p className="mt-2 text-night-foreground/80">{t(`invoice.${n}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page-grid py-12 lg:py-20">
        <SectionHeading title={t("stepsTitle")} />
        <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="text-display tabular !text-[3.5rem] text-primary" aria-hidden>{i + 1}</span>
              <h3 className="text-h3 mt-2">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {gifting.items.length > 0 && (
        <section className="page-grid py-12 lg:py-20">
          <SectionHeading title={t("giftingTitle")} body={t("giftingBody")} action={<Button render={<Link href="/shop/corporate-gifting" />} variant="outline">{t("viewAll")}</Button>} />
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {gifting.items.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="quote" className="page-grid scroll-mt-24 py-12 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="text-h1">{t("quoteTitle")}</h2>
            <p className="text-lead mt-4 text-muted-foreground">{t("quoteBody")}</p>
          </div>
          <div className="lg:col-span-8">
            <LeadForm type="corporate_quote" sourcePath="/corporate" />
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="page-grid grid gap-10 py-12 lg:grid-cols-12 lg:py-20">
          <h2 className="text-h1 lg:col-span-4">{t("faqTitle")}</h2>
          <div className="lg:col-span-8">
            <FaqList items={faqs} />
          </div>
          <FaqJsonLd items={faqs} />
        </section>
      )}
    </>
  )
}
