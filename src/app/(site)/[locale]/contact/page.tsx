import { getTranslations, setRequestLocale } from "next-intl/server"

import { LeadForm } from "@/components/forms/lead-form"
import { Button } from "@/components/ui/button"
import { whatsappUrl } from "@/lib/contact"
import { pageMetadata } from "@/lib/seo"
import { getSettings } from "@/server/queries/content"
import { getSeoOverride } from "@/server/queries/seo"

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "contact" })
  const o = await getSeoOverride("/contact", locale)
  return pageMetadata({ locale, path: "/contact", title: o.title ?? t("metaTitle"), description: o.description ?? t("metaDescription"), noindex: o.noindex })
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params
  setRequestLocale(locale)
  const [t, s] = await Promise.all([getTranslations({ locale, namespace: "contact" }), getSettings()])
  const c = s.contact
  const wa = whatsappUrl(c.whatsapp, locale === "ar" ? c.whatsappMessageAr : c.whatsappMessageEn)
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <h1 className="text-display !text-[clamp(2.5rem,1.5rem+4vw,4.5rem)]">{t("title")}</h1>
      <p className="text-lead mt-4 max-w-[56ch] text-muted-foreground">{t("lead")}</p>
      <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="grid content-start gap-8 lg:col-span-5">
          {wa && (
            <div className="bg-surface p-6" style={{ borderRadius: "var(--radius)" }}>
              <h2 className="text-h3">{t("whatsappTitle")}</h2>
              <p className="mt-2 text-muted-foreground">{t("whatsappBody")}</p>
              <Button render={<a href={wa} target="_blank" rel="noopener noreferrer" />} size="lg" className="mt-4">
                {t("whatsappCta")}
                <span className="sr-only"> ({t("newTab")})</span>
              </Button>
            </div>
          )}
          <dl className="grid gap-5">
            {c.phone && (
              <div>
                <dt className="font-medium">{t("phone")}</dt>
                <dd><a className="tabular text-primary underline underline-offset-4" dir="ltr" href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a></dd>
              </div>
            )}
            <div>
              <dt className="font-medium">{t("email")}</dt>
              <dd><a className="text-primary underline underline-offset-4" href={`mailto:${c.email}`}>{c.email}</a></dd>
            </div>
            <div>
              <dt className="font-medium">{t("hours")}</dt>
              <dd className="text-muted-foreground">{locale === "ar" ? c.hoursAr : c.hoursEn}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("address")}</dt>
              <dd className="text-muted-foreground">{locale === "ar" ? c.addressAr : c.addressEn}</dd>
            </div>
          </dl>
        </div>
        <div className="lg:col-span-7">
          <h2 className="text-h2 mb-6">{t("formTitle")}</h2>
          <LeadForm type="contact" sourcePath="/contact" />
        </div>
      </div>
    </div>
  )
}
