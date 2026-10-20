import type { Metadata, Viewport } from "next"
import {
  Amiri,
  IBM_Plex_Sans_Arabic,
  Instrument_Sans,
  Newsreader,
} from "next/font/google"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server"

import { CartProvider } from "@/components/shop/cart-provider"
import { AnnouncementBar } from "@/components/site/announcement-bar"
import { SiteFooter } from "@/components/site/footer"
import { SiteHeader } from "@/components/site/header"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { site, siteName } from "@/config/site"
import { dirOf, routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"

import "../../globals.css"

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  axes: ["opsz"],
  display: "swap",
})
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
})
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
})
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-ar",
  display: "swap",
})

/** Namespaces needed by client components. Server components load their own. */
const CLIENT_NAMESPACES = [
  "common",
  "nav",
  "a11y",
  "cart",
  "forms",
  "product",
  "checkout",
  "account",
  "consent",
  "errors",
  "contact",
  "corporate",
  "events",
  "order",
  "shop",
  "offers",
  "city",
] as const

export const viewport: Viewport = {
  themeColor: "#f1ede7",
  width: "device-width",
  initialScale: 1,
}

/**
 * Everything is rendered per request: content comes from the database and every response carries a
 * fresh CSP nonce (see src/proxy.ts), which is incompatible with build-time prerendering.
 */
export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params
  const name = siteName(locale)
  return {
    metadataBase: new URL(site.url),
    title: { default: name, template: `%s | ${name}` },
    applicationName: name,
    verification: site.analytics.searchConsoleVerification
      ? { google: site.analytics.searchConsoleVerification }
      : undefined,
  }
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "a11y" })
  const tc = await getTranslations({ locale, namespace: "common" })
  const all = await getMessages()
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.map((ns) => [ns, (all as Record<string, unknown>)[ns]])
  )

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={cn(
        newsreader.variable,
        instrument.variable,
        locale === "ar" && amiri.variable,
        locale === "ar" && plexArabic.variable
      )}
    >
      <body>
        <NextIntlClientProvider messages={clientMessages}>
          <TooltipProvider delay={300}>
            <Toaster closeLabel={tc("close")}>
              <CartProvider>
                <a
                  href="#main"
                  className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:bg-foreground focus:px-4 focus:py-3 focus:text-background"
                >
                  {t("skipToContent")}
                </a>
                <AnnouncementBar locale={locale} />
                <SiteHeader locale={locale} />
                <main id="main">{children}</main>
                <SiteFooter locale={locale} />
              </CartProvider>
            </Toaster>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
