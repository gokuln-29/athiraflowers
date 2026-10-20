import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { JsonLd } from "@/components/seo/json-ld"
import { AddToCart } from "@/components/shop/add-to-cart"
import { Gallery } from "@/components/shop/gallery"
import { Price } from "@/components/shop/price"
import { ProductCard } from "@/components/shop/product-card"
import { Markdown } from "@/components/site/markdown"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { absoluteUrl, site } from "@/config/site"
import { Link } from "@/i18n/navigation"
import { whatsappUrl } from "@/lib/contact"
import { formatMoney } from "@/lib/format"
import { pickColumn } from "@/lib/i18n-text"
import { mediaUrl, pickVariant } from "@/lib/media"
import { pageMetadata } from "@/lib/seo"
import { getProductBySlug, getRelated } from "@/server/queries/catalog"
import { getSettings } from "@/server/queries/content"
import { listSlots, listZones } from "@/server/queries/delivery"

export async function generateMetadata({ params }: PageProps<"/[locale]/product/[slug]">) {
  const { locale, slug } = await params
  const detail = await getProductBySlug(slug)
  if (!detail) return {}
  const p = detail.row
  return pageMetadata({
    locale,
    path: `/product/${p.slug}`,
    title: pickColumn(p.seoTitleEn, p.seoTitleAr, locale) || pickColumn(p.nameEn, p.nameAr, locale),
    description: pickColumn(p.seoDescriptionEn, p.seoDescriptionAr, locale) || pickColumn(p.shortEn, p.shortAr, locale),
    image: detail.images[0],
  })
}

export default async function ProductPage({ params }: PageProps<"/[locale]/product/[slug]">) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const detail = await getProductBySlug(slug)
  if (!detail) notFound()
  const { row: p, category, images } = detail
  const [t, tc, tn, related, zones, slots, settings] = await Promise.all([
    getTranslations({ locale, namespace: "product" }),
    getTranslations({ locale, namespace: "cart" }),
    getTranslations({ locale, namespace: "nav" }),
    getRelated(p.id, p.categoryId, locale, 4),
    listZones(locale),
    listSlots(locale),
    getSettings(),
  ])
  const name = pickColumn(p.nameEn, p.nameAr, locale)
  const inStock = !p.trackStock || p.stockQty > 0
  const wa = whatsappUrl(settings.contact.whatsapp, `${locale === "ar" ? settings.contact.whatsappMessageAr : settings.contact.whatsappMessageEn} ${name}`)
  const includes = pickColumn(p.includesEn, p.includesAr, locale).split("\n").map((l) => l.trim()).filter(Boolean)
  const sameDaySlots = slots.filter((s) => s.sameDayCutoff && p.sameDayEligible && p.leadTimeHours < 24)
  const catName = pickColumn(category.nameEn, category.nameAr, locale)
  const img = pickVariant(images[0]?.variants, 1200)

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name,
            description: pickColumn(p.shortEn, p.shortAr, locale),
            sku: p.sku,
            category: catName,
            image: images.map((i) => absoluteUrl(mediaUrl(pickVariant(i.variants, 1200)?.key ?? i.key))),
            brand: { "@type": "Brand", name: site.name },
            offers: {
              "@type": "Offer",
              url: absoluteUrl(`/${locale}/product/${p.slug}`),
              priceCurrency: p.currency,
              price: (p.priceMinor / 100).toFixed(2),
              availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: site.name },
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: tn("shop"), item: absoluteUrl(`/${locale}/shop`) },
              { "@type": "ListItem", position: 2, name: catName, item: absoluteUrl(`/${locale}/shop/${category.slug}`) },
              { "@type": "ListItem", position: 3, name, item: absoluteUrl(`/${locale}/product/${p.slug}`) },
            ],
          },
        ]}
      />
      <div className="page-grid pt-6 pb-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/shop" />}>{tn("shop")}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/shop/${category.slug}`} />}>{catName}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Gallery images={images} locale={locale} name={name} />
          </div>
          <div className="lg:col-span-5 lg:pt-4">
            <h1 className="text-h1">{name}</h1>
            <Price locale={locale} priceMinor={p.priceMinor} compareAtMinor={p.compareAtMinor} pricingType={p.pricingType} billingInterval={p.billingInterval} rentalDays={p.rentalDays} size="lg" className="mt-3" />
            <p className="text-lead mt-4 text-foreground/85">{pickColumn(p.shortEn, p.shortAr, locale)}</p>

            {p.pricingType === "subscription" && (
              <p className="mt-4 bg-surface p-4 text-sm" style={{ borderRadius: "var(--radius)" }}>
                {t("programNote", { interval: p.billingInterval === "month" ? t("monthly") : t("weekly"), min: p.minQty })}
              </p>
            )}
            {p.pricingType === "rental" && (
              <p className="mt-4 bg-surface p-4 text-sm" style={{ borderRadius: "var(--radius)" }}>
                {t("rentalNote", { days: p.rentalDays ?? 3, deposit: formatMoney(p.depositMinor, locale, { compact: true }) })}
              </p>
            )}

            <div className="mt-8">
              <AddToCart productId={p.id} name={name} priceMinor={p.priceMinor} minQty={p.minQty} maxQty={p.maxQty} inStock={inStock} depositMinor={p.depositMinor} pricingType={p.pricingType} />
            </div>

            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground">
              <li>{t("vatIncluded")}</li>
              {p.leadTimeHours >= 24 && <li>{t("leadTime", { days: Math.round(p.leadTimeHours / 24) })}</li>}
              {sameDaySlots.length > 0 && <li>{t("sameDay", { time: sameDaySlots[sameDaySlots.length - 1].sameDayCutoff ?? "" })}</li>}
              {p.trackStock && inStock && p.stockQty <= 5 && <li className="text-foreground">{t("onlyLeft", { count: p.stockQty })}</li>}
            </ul>

            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4 hover:text-primary-hover">
                {t("askWhatsApp")}
                <span className="sr-only"> ({tn("opensInNewTab")})</span>
              </a>
            )}
          </div>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <h2 className="text-h2">{t("details")}</h2>
            <div className="mt-4 max-w-[62ch]">
              <Markdown source={pickColumn(p.descriptionEn, p.descriptionAr, locale)} />
            </div>
            {includes.length > 0 && (
              <>
                <h3 className="text-h3 mt-8">{t("included")}</h3>
                <ul className="mt-3 grid gap-2">
                  {includes.flatMap((line) => line.split(/,\s*/)).map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="lg:col-span-5">
            <Accordion defaultValue={["delivery"]} multiple>
              <AccordionItem value="delivery">
                <AccordionTrigger className="text-h3 !text-[1.125rem] py-4">{t("deliveryTitle")}</AccordionTrigger>
                <AccordionContent className="grid gap-3 pb-5 text-base text-muted-foreground">
                  <p>{pickColumn(p.deliveryNoteEn, p.deliveryNoteAr, locale)}</p>
                  <ul className="grid gap-1">
                    {zones.map((z) => (
                      <li key={z.id}>
                        <span className="text-foreground">{z.name}:</span> {z.feeMinor ? formatMoney(z.feeMinor, locale, { compact: true }) : tc("subtotal")}
                        {z.freeOverMinor ? ` · ${t("freeOver", { amount: formatMoney(z.freeOverMinor, locale, { compact: true }) })}` : ""}
                      </li>
                    ))}
                  </ul>
                  <p>
                    <Link href="/delivery" className="font-medium text-primary underline underline-offset-4">
                      {t("deliveryPolicy")}
                    </Link>
                  </p>
                </AccordionContent>
              </AccordionItem>
              {pickColumn(p.careEn, p.careAr, locale) && (
                <AccordionItem value="care">
                  <AccordionTrigger className="text-h3 !text-[1.125rem] py-4">{t("careTitle")}</AccordionTrigger>
                  <AccordionContent className="pb-5 text-base text-muted-foreground">{pickColumn(p.careEn, p.careAr, locale)}</AccordionContent>
                </AccordionItem>
              )}
              <AccordionItem value="substitution">
                <AccordionTrigger className="text-h3 !text-[1.125rem] py-4">{t("substitutionTitle")}</AccordionTrigger>
                <AccordionContent className="pb-5 text-base text-muted-foreground">
                  {locale === "ar" ? settings.checkout.substitutionPolicyAr : settings.checkout.substitutionPolicyEn}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20" aria-labelledby="related-title">
            <h2 id="related-title" className="text-h1">{t("related")}</h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
              {related.map((r) => (
                <li key={r.id}>
                  <ProductCard product={r} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <span hidden>{img?.key}</span>
    </>
  )
}
