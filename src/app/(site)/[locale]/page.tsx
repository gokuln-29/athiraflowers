import { setRequestLocale } from "next-intl/server"

import { Categories, CtaBand, Faq, Featured, Hero, Logos, Pathways, Program, Steps, Testimonials } from "@/components/site/home-sections"
import { JsonLd } from "@/components/seo/json-ld"
import { absoluteUrl, site, siteName } from "@/config/site"
import { homeSectionSchemas } from "@/lib/home-sections"
import { pageMetadata } from "@/lib/seo"
import { getHomeSections, getSettings } from "@/server/queries/content"
import { getMediaMap } from "@/server/queries/media"
import { getSeoOverride } from "@/server/queries/seo"

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  const override = await getSeoOverride("/", locale)
  const sections = await getHomeSections()
  const heroRow = sections.find((s) => s.type === "hero")
  const hero = heroRow ? homeSectionSchemas.hero.safeParse(heroRow.data) : null
  const image = hero?.success && hero.data.imageMediaId ? (await getMediaMap([hero.data.imageMediaId])).get(hero.data.imageMediaId) : null
  return pageMetadata({
    locale,
    path: "/",
    title: override.title ?? (locale === "ar" ? "زهور للمكاتب والفعاليات في دبي وأبوظبي والشارقة" : "Flowers for offices and events in Dubai, Abu Dhabi and Sharjah"),
    description: override.description ?? (locale === "ar" ? "برامج زهور أسبوعية للمكاتب، وتنسيق الفعاليات، وهدايا الشركات، مع فاتورة ضريبية وتوصيل في الإمارات." : "Weekly office flower programs, event decor and corporate gifting across the UAE, with tax invoices and delivery windows you choose."),
    image,
    noindex: override.noindex,
  })
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  setRequestLocale(locale)
  const sections = (await getHomeSections()).filter((s) => s.type !== "banner")

  // Collect every media id referenced by sections in one query.
  const ids: number[] = []
  for (const s of sections) {
    const d = s.data as { imageMediaId?: number | null; items?: { imageMediaId?: number | null }[] }
    if (d.imageMediaId) ids.push(d.imageMediaId)
    d.items?.forEach((i) => i.imageMediaId && ids.push(i.imageMediaId))
  }
  const media = await getMediaMap(ids)
  const ctx = { locale, media }
  const settings = await getSettings()
  const c = settings.contact
  const sameAs = Object.values(settings.social).filter((u): u is string => typeof u === "string" && /^https:\/\//.test(u))
  const org = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": absoluteUrl("/#org"), name: siteName(locale), alternateName: [site.name, site.nameAr], url: absoluteUrl("/"), email: c.email, sameAs: sameAs.length ? sameAs : undefined },
      {
        "@type": "Florist", "@id": absoluteUrl("/#florist"), name: siteName(locale), url: absoluteUrl(`/${locale}`), email: c.email, telephone: c.phone, priceRange: "AED",
        address: { "@type": "PostalAddress", addressCountry: "AE", addressLocality: "Dubai" },
        areaServed: ["Dubai", "Abu Dhabi", "Sharjah"].map((name) => ({ "@type": "City", name })),
        openingHours: "Su-Fr 08:00-19:00", parentOrganization: { "@id": absoluteUrl("/#org") },
      },
      { "@type": "WebSite", "@id": absoluteUrl("/#site"), url: absoluteUrl("/"), name: siteName(locale), inLanguage: locale, publisher: { "@id": absoluteUrl("/#org") } },
    ],
  }

  return (
    <>
      {sections.map((s) => {
        const schema = homeSectionSchemas[s.type as keyof typeof homeSectionSchemas]
        const parsed = schema.safeParse(s.data)
        if (!parsed.success) {
          console.error(`[home] invalid data for section ${s.id} (${s.type})`)
          return null
        }
        const data = parsed.data as never
        switch (s.type) {
          case "hero": return <Hero key={s.id} data={data} {...ctx} />
          case "pathways": return <Pathways key={s.id} data={data} {...ctx} />
          case "featured": return <Featured key={s.id} data={data} {...ctx} />
          case "program": return <Program key={s.id} data={data} {...ctx} />
          case "categories": return <Categories key={s.id} data={data} {...ctx} />
          case "steps": return <Steps key={s.id} data={data} {...ctx} />
          case "testimonials": return <Testimonials key={s.id} data={data} {...ctx} />
          case "logos": return <Logos key={s.id} data={data} {...ctx} />
          case "faq": return <Faq key={s.id} data={data} {...ctx} />
          case "cta": return <CtaBand key={s.id} data={data} {...ctx} />
          default: return null
        }
      })}
      <JsonLd data={org} />
    </>
  )
}
