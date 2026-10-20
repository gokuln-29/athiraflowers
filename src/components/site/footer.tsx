import { getTranslations } from "next-intl/server"

import { LocaleSwitcher } from "@/components/site/locale-switcher"
import { site, siteName } from "@/config/site"
import { Link } from "@/i18n/navigation"
import { whatsappUrl } from "@/lib/contact"
import { listCategories } from "@/server/queries/catalog"
import { getSettings } from "@/server/queries/content"

export async function SiteFooter({ locale }: { locale: string }) {
  const [t, tn, categories, settings] = await Promise.all([
    getTranslations({ locale, namespace: "footer" }),
    getTranslations({ locale, namespace: "nav" }),
    listCategories(locale),
    getSettings(),
  ])
  const c = settings.contact
  const biz = settings.business
  const social = Object.entries(settings.social as Record<string, string>).filter(([, v]) => v)
  const wa = whatsappUrl(c.whatsapp, locale === "ar" ? c.whatsappMessageAr : c.whatsappMessageEn)
  const linkClass = "inline-flex min-h-11 items-center hover:underline underline-offset-4"
  return (
    <footer className="mt-32 bg-night text-night-foreground">
      <div className="page-grid grid gap-12 pt-20 pb-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-h1 !text-[2.5rem] sm:!text-[3.25rem]">{siteName(locale)}</p>
          <p className="mt-4 max-w-[34ch] text-night-foreground/80">{t("tagline")}</p>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-12 items-center bg-night-foreground px-6 text-night hover:bg-white" style={{ borderRadius: "var(--radius)" }}>
              {t("chatOnWhatsApp")}
              <span className="sr-only"> ({tn("opensInNewTab")})</span>
            </a>
          )}
        </div>
        <nav aria-label={t("shop")} className="lg:col-span-2">
          <h2 className="text-lg font-medium">{t("shop")}</h2>
          <ul className="mt-3">
            {categories.map((cat) => (
              <li key={cat.slug}>
                <Link href={`/shop/${cat.slug}`} className={linkClass}>
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("company")} className="lg:col-span-2">
          <h2 className="text-lg font-medium">{t("company")}</h2>
          <ul className="mt-3">
            {[["/corporate", tn("corporate")], ["/events", tn("events")], ["/offers", tn("offers")], ["/blog", tn("blog")], ["/about", tn("about")], ["/contact", tn("contact")]].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("help")} className="lg:col-span-3">
          <h2 className="text-lg font-medium">{t("help")}</h2>
          <ul className="mt-3">
            {[["/delivery", t("delivery")], ["/refund", t("refund")], ["/terms", t("terms")], ["/privacy", t("privacy")]].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 text-lg font-medium">{t("cities")}</h2>
          <ul className="mt-3">
            {(["dubai", "abu-dhabi", "sharjah"] as const).map((slug) => (
              <li key={slug}>
                <Link href={`/flowers/${slug}`} className={linkClass}>
                  {tn("flowersIn", { city: slug === "dubai" ? (locale === "ar" ? "دبي" : "Dubai") : slug === "abu-dhabi" ? (locale === "ar" ? "أبوظبي" : "Abu Dhabi") : locale === "ar" ? "الشارقة" : "Sharjah" })}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="page-grid grid gap-6 pb-10 text-sm text-night-foreground/80 lg:grid-cols-12">
        <address className="not-italic lg:col-span-5">
          <p>{locale === "ar" ? c.addressAr : c.addressEn}</p>
          <p className="mt-1">
            <a className="hover:underline" href={`mailto:${c.email}`}>{c.email}</a>
            {c.phone ? <> · <a className="tabular hover:underline" dir="ltr" href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a></> : null}
          </p>
          <p className="mt-1">{locale === "ar" ? c.hoursAr : c.hoursEn}</p>
        </address>
        <div className="lg:col-span-5">
          {biz.legalName ? <p>{t("legalName", { name: biz.legalName })}</p> : null}
          {biz.trn ? <p className="tabular">{t("trn", { trn: biz.trn })}</p> : null}
          {biz.licenceNo ? <p>{t("licence", { no: biz.licenceNo })}</p> : null}
          <p>{t("rights", { year: new Date().getFullYear(), name: siteName(locale) })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 lg:col-span-2 lg:justify-end">
          {social.map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noopener noreferrer" className={`${linkClass} capitalize`}>
              {name}
            </a>
          ))}
          <LocaleSwitcher className={linkClass} />
        </div>
      </div>
      <p className="page-grid pb-8 text-xs text-night-foreground/60">
        <Link href="/credits" className="hover:underline">{t("photoCredits")}</Link> · {site.domain}
      </p>
    </footer>
  )
}
