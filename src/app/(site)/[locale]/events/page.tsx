import { getTranslations, setRequestLocale } from "next-intl/server"

import { FaqJsonLd } from "@/components/seo/faq-json-ld"
import { LeadForm } from "@/components/forms/lead-form"
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

export async function generateMetadata({ params }: PageProps<"/[locale]/events">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "events" })
  const o = await getSeoOverride("/events", locale)
  return pageMetadata({ locale, path: "/events", title: o.title ?? t("metaTitle"), description: o.description ?? t("metaDescription"), image: await getHeroMedia("events"), noindex: o.noindex })
}

export default async function EventsPage({ params }: PageProps<"/[locale]/events">) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "events" })
  const [decor, faqs, hero] = await Promise.all([listProducts({ locale, categorySlug: "event-decor", pageSize: 8 }), listFaqs("events", 6, locale), getHeroMedia("events")])
  const gallery = decor.items.filter((p) => p.image).slice(0, 4)

  return (
    <>
      <section aria-labelledby="events-title" className="page-grid grid items-end gap-8 pt-6 pb-16 lg:grid-cols-12 lg:gap-12 lg:pt-10 lg:pb-24">
        <div className="order-2 overflow-hidden rounded-[var(--radius)] bg-surface-deep lg:order-1 lg:col-span-7">
          <Media media={hero} locale={locale} ratio="3 / 2" priority sizes="(min-width:1024px) 58vw, 100vw" />
        </div>
        <div className="order-1 lg:order-2 lg:col-span-5 lg:pb-6">
          <h1 id="events-title" className="text-display !text-[clamp(2.5rem,1.4rem+4.4vw,4.75rem)]">{t("title")}</h1>
          <p className="text-lead mt-6 max-w-[44ch] text-foreground/85">{t("lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<a href="#enquiry" />} size="lg">{t("ctaEnquire")}</Button>
            <Button render={<Link href="/shop/event-decor" />} size="lg" variant="outline">{t("ctaDecor")}</Button>
          </div>
        </div>
      </section>

      <section className="page-grid py-12 lg:py-20">
        <SectionHeading title={t("servicesTitle")} />
        <ul className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {([1, 2, 3, 4] as const).map((n) => (
            <li key={n} className="border-t pt-6">
              <h3 className="text-h2 !text-[1.75rem]">{t(`services.${n}.title`)}</h3>
              <p className="mt-3 max-w-[48ch] text-muted-foreground">{t(`services.${n}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {gallery.length > 0 && (
        <section className="page-grid py-12 lg:py-20">
          <SectionHeading title={t("looksTitle")} body={t("looksBody")} />
          <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            {gallery.map((p, i) => (
              <li key={p.id} className={i % 2 ? "md:mt-12" : ""}>
                <Link href={`/product/${p.slug}`} className="zoom-on-hover block outline-offset-4">
                  <div className="overflow-hidden rounded-[var(--radius)] bg-surface-deep">
                    <Media media={p.image} locale={locale} ratio="3 / 4" sizes="(min-width:768px) 25vw, 50vw" />
                  </div>
                  <p className="text-h3 mt-3 !text-base">{p.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {decor.items.length > 0 && (
        <section className="page-grid py-12 lg:py-20">
          <SectionHeading title={t("piecesTitle")} body={t("piecesBody")} action={<Button render={<Link href="/shop/event-decor" />} variant="outline">{t("viewAll")}</Button>} />
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {decor.items.slice(0, 4).map((p) => (
              <li key={p.id}>
                <ProductCard product={p} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="my-12 bg-surface-deep lg:my-20">
        <div className="page-grid py-16 lg:py-24">
          <SectionHeading title={t("timelineTitle")} />
          <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {([1, 2, 3, 4] as const).map((n) => (
              <li key={n}>
                <span className="text-display tabular !text-[3.5rem] text-primary" aria-hidden>{n}</span>
                <h3 className="text-h3 mt-2">{t(`timeline.${n}.title`)}</h3>
                <p className="mt-2 text-muted-foreground">{t(`timeline.${n}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="enquiry" className="page-grid scroll-mt-24 py-12 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="text-h1">{t("enquiryTitle")}</h2>
            <p className="text-lead mt-4 text-muted-foreground">{t("enquiryBody")}</p>
          </div>
          <div className="lg:col-span-8">
            <LeadForm type="event" sourcePath="/events" />
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
