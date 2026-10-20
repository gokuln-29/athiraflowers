import type { Metadata, Viewport } from "next"
import { Amiri, IBM_Plex_Sans_Arabic, Instrument_Sans, Newsreader } from "next/font/google"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Toaster } from "@/components/ui/sonner"
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

export const viewport: Viewport = {
  themeColor: "#f1ede7",
  width: "device-width",
  initialScale: 1,
}

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

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "a11y" })

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
        <NextIntlClientProvider>
          <TooltipProvider delay={300}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:bg-foreground focus:px-4 focus:py-3 focus:text-background"
            >
              {t("skipToContent")}
            </a>
            {children}
            <Toaster dir={dirOf(locale)} position={locale === "ar" ? "bottom-left" : "bottom-right"} />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
