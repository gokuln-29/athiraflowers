import { ArrowRight, Check } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { ReactNode } from "react"

import { ProductCard } from "@/components/shop/product-card"
import { Media } from "@/components/site/media"
import { FaqJsonLd } from "@/components/seo/faq-json-ld"
import { SectionHeading } from "@/components/site/section-heading"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { homeSectionSchemas, type HomeSectionData } from "@/lib/home-sections"
import { pick } from "@/lib/i18n-text"
import type { MediaMap } from "@/server/queries/media"
import { getFeatured, listCategories } from "@/server/queries/catalog"
import { listFaqs, listLogos, listTestimonials } from "@/server/queries/content"

type Ctx = { locale: string; media: MediaMap }

export function Hero({ data, locale, media }: Ctx & { data: HomeSectionData<"hero"> }) {
  const image = data.imageMediaId ? media.get(data.imageMediaId) : null
  return (
    <section aria-labelledby="home-title" className="page-grid grid items-end gap-8 pt-6 pb-16 lg:grid-cols-12 lg:gap-12 lg:pt-10 lg:pb-24">
      <div className="lg:col-span-6 lg:pb-8">
        <h1 id="home-title" className="text-display">
          <span className="hero-line">
            <span>{pick(data.headline, locale)}</span>
          </span>
        </h1>
        <p className="text-lead mt-6 max-w-[44ch] text-foreground/85 [animation:fade-in_700ms_var(--ease-out-strong)_350ms_both]">{pick(data.sub, locale)}</p>
        <div className="mt-8 flex flex-wrap gap-3 [animation:fade-in_700ms_var(--ease-out-strong)_450ms_both]">
          <Button render={<Link href={data.primary.href} />} size="lg">
            {pick(data.primary.label, locale)}
          </Button>
          {data.secondary && (
            <Button render={<Link href={data.secondary.href} />} size="lg" variant="outline">
              {pick(data.secondary.label, locale)}
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-[var(--radius)] bg-surface-deep lg:col-span-6">
        <div className="hero-photo">
          <Media media={image} locale={locale} ratio="4 / 5" priority sizes="(min-width:1024px) 50vw, 100vw" className="max-h-[78svh]" />
        </div>
      </div>
    </section>
  )
}

export function Pathways({ data, locale, media }: Ctx & { data: HomeSectionData<"pathways"> }) {
  return (
    <section className="page-grid py-16 lg:py-24">
      <SectionHeading title={pick(data.title, locale)} />
      <ul className="mt-10 grid gap-10 md:grid-cols-3 lg:mt-14">
        {data.items.map((item, i) => (
          <li key={item.href} className={i === 1 ? "md:mt-16" : i === 2 ? "md:mt-32" : ""}>
            <Link href={item.href} className="zoom-on-hover group block outline-offset-4">
              <div className="overflow-hidden rounded-[var(--radius)] bg-surface-deep">
                <Media media={item.imageMediaId ? media.get(item.imageMediaId) : null} locale={locale} ratio="4 / 5" sizes="(min-width:768px) 33vw, 100vw" />
              </div>
              <h3 className="text-h2 mt-5 !text-[1.75rem] group-hover:text-primary">{pick(item.title, locale)}</h3>
              <p className="mt-2 max-w-[38ch] text-muted-foreground">{pick(item.body, locale)}</p>
              <span className="mt-3 inline-flex items-center gap-2 font-medium text-primary">
                {locale === "ar" ? "اكتشفوا" : "Explore"}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export async function Featured({ data, locale }: Ctx & { data: HomeSectionData<"featured"> }) {
  const [products, t] = await Promise.all([getFeatured(locale, data.limit), getTranslations({ locale, namespace: "home" })])
  if (products.length === 0) return null
  return (
    <section className="page-grid py-16 lg:py-24">
      <SectionHeading
        title={pick(data.title, locale)}
        body={data.body ? pick(data.body, locale) : null}
        action={
          <Button render={<Link href="/shop" />} variant="outline">
            {t("viewAllProducts")}
          </Button>
        }
      />
      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
        {products.map((p, i) => (
          <li key={p.id}>
            <ProductCard product={p} locale={locale} priority={i < 2} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Program({ data, locale, media }: Ctx & { data: HomeSectionData<"program"> }) {
  return (
    <section className="my-16 bg-night text-night-foreground lg:my-24">
      <div className="grid lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Media media={data.imageMediaId ? media.get(data.imageMediaId) : null} locale={locale} ratio="4 / 3" sizes="(min-width:1024px) 50vw, 100vw" className="max-h-[640px]" />
        </div>
        <div className="flex flex-col justify-center gap-6 px-[var(--gutter)] py-14 lg:col-span-6 lg:ps-20 lg:pe-[max(var(--gutter),calc((100vw-var(--page-max))/2))]">
          <h2 className="text-h1 max-w-[20ch]">{pick(data.title, locale)}</h2>
          <p className="text-lead max-w-[48ch] text-night-foreground/85">{pick(data.body, locale)}</p>
          <ul className="grid gap-3">
            {data.bullets.map((b) => (
              <li key={b.en} className="flex gap-3">
                <Check className="mt-1 size-5 shrink-0" aria-hidden />
                <span>{pick(b, locale)}</span>
              </li>
            ))}
          </ul>
          <div>
            <Button render={<Link href={data.cta.href} />} size="lg" variant="night">
              {pick(data.cta.label, locale)}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export async function Categories({ data, locale }: Ctx & { data: HomeSectionData<"categories"> }) {
  const [cats, t] = await Promise.all([listCategories(locale), getTranslations({ locale, namespace: "home" })])
  return (
    <section className="page-grid py-16 lg:py-24">
      <SectionHeading title={pick(data.title, locale)} />
      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6">
        {cats.map((c, i) => (
          <li key={c.slug} className={i % 3 === 1 ? "md:mt-10" : ""}>
            <Link href={`/shop/${c.slug}`} className="zoom-on-hover block outline-offset-4">
              <div className="overflow-hidden rounded-[var(--radius)] bg-surface-deep">
                <Media media={c.image} locale={locale} ratio={i % 3 === 1 ? "1 / 1" : "4 / 5"} sizes="(min-width:768px) 33vw, 50vw" />
              </div>
              <h3 className="text-h3 mt-3">{c.name}</h3>
              <p className="text-sm text-muted-foreground">{t("productsCount", { count: c.count })}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Steps({ data, locale }: Ctx & { data: HomeSectionData<"steps"> }) {
  return (
    <section className="py-16 lg:py-24">
      <div className="page-grid">
        <div className="bg-surface-deep p-8 lg:p-14" style={{ borderRadius: "var(--radius)" }}>
          <h2 className="text-h1 max-w-[18ch]">{pick(data.title, locale)}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {data.items.map((s, i) => (
              <li key={s.title.en}>
                <span className="text-display tabular !text-[3.5rem] text-primary" aria-hidden>{i + 1}</span>
                <h3 className="text-h3 mt-2">{pick(s.title, locale)}</h3>
                <p className="mt-2 text-muted-foreground">{pick(s.body, locale)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export async function Testimonials({ data, locale }: Ctx & { data: HomeSectionData<"testimonials"> }) {
  const items = await listTestimonials(locale)
  if (items.length === 0) return null
  return (
    <section className="page-grid py-16 lg:py-24">
      <SectionHeading title={pick(data.title, locale)} />
      <ul className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {items.map((q) => (
          <li key={q.id}>
            <blockquote className="text-h3 !font-normal">“{q.quote}”</blockquote>
            <p className="mt-4 font-medium">{q.author}</p>
            <p className="text-sm text-muted-foreground">{[q.role, q.company].filter(Boolean).join(", ")}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export async function Logos({ data, locale }: Ctx & { data: HomeSectionData<"logos"> }) {
  const logos = await listLogos()
  if (logos.length === 0) return null
  return (
    <section className="page-grid py-12">
      <h2 className="text-h3 text-center">{pick(data.title, locale)}</h2>
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {logos.map((l) => (
          <li key={l.id} className="h-10 w-28 opacity-80">
            <Media media={l.image} locale={locale} alt={l.name} sizes="112px" className="object-contain" />
          </li>
        ))}
      </ul>
    </section>
  )
}

export async function Faq({ data, locale }: Ctx & { data: HomeSectionData<"faq"> }) {
  const faqs = await listFaqs(data.group, data.limit, locale)
  if (faqs.length === 0) return null
  return (
    <section className="page-grid grid gap-10 py-16 lg:grid-cols-12 lg:py-24">
      <h2 className="text-h1 lg:col-span-4">{pick(data.title, locale)}</h2>
      <div className="lg:col-span-8">
        <FaqList items={faqs} />
      </div>
      <FaqJsonLd items={faqs} />
    </section>
  )
}

export function FaqList({ items }: { items: { id: number; question: string; answer: string }[] }) {
  return (
    <Accordion className="w-full">
      {items.map((f) => (
        <AccordionItem key={f.id} value={String(f.id)}>
          <AccordionTrigger className="text-h3 !text-[1.125rem] py-5 text-start">{f.question}</AccordionTrigger>
          <AccordionContent className="max-w-[65ch] pb-5 text-base text-muted-foreground">{f.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function CtaBand({ data, locale }: Ctx & { data: HomeSectionData<"cta"> }) {
  return (
    <section className="page-grid pt-16 lg:pt-24">
      <div className="grid gap-8 bg-primary px-8 py-14 text-primary-foreground lg:grid-cols-12 lg:px-14 lg:py-20" style={{ borderRadius: "var(--radius)" }}>
        <div className="lg:col-span-8">
          <h2 className="text-h1 max-w-[22ch]">{pick(data.title, locale)}</h2>
          <p className="text-lead mt-4 max-w-[52ch] opacity-90">{pick(data.body, locale)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 lg:col-span-4 lg:justify-end">
          <Button render={<Link href={data.primary.href} />} size="lg" variant="night">
            {pick(data.primary.label, locale)}
          </Button>
          {data.secondary && (
            <Button render={<Link href={data.secondary.href} />} size="lg" variant="outline" className="border-primary-foreground/60 text-primary-foreground hover:bg-primary-hover">
              {pick(data.secondary.label, locale)}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

export type Renderable = ReactNode
export { homeSectionSchemas }
