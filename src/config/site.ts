/**
 * The ONLY place brand name, domain and URL are defined.
 * Values come from env (NEXT_PUBLIC_* so they are inlined for the browser too).
 * Everywhere else import `site` from "@/config/site".
 */

const trimSlash = (value: string) => value.replace(/\/+$/, "")

const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN?.trim() || "athiraflowers.ae"

export const site = {
  /** Display name in English. */
  name: process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Athira flowers",
  /** Display name in Arabic. Owner to confirm the preferred Arabic spelling. */
  nameAr: process.env.NEXT_PUBLIC_SITE_NAME_AR?.trim() || "أثيرة للزهور",
  /** Bare domain, no scheme. */
  domain,
  /** Canonical origin, no trailing slash. */
  url: trimSlash(process.env.NEXT_PUBLIC_SITE_URL?.trim() || `https://${domain}`),
  /** Media (R2) public origin; images are served from here. */
  mediaUrl: trimSlash(process.env.NEXT_PUBLIC_MEDIA_URL?.trim() || "/media"),
  /** Prefix for human-facing order numbers, e.g. AF-100123. */
  orderPrefix: process.env.NEXT_PUBLIC_ORDER_PREFIX?.trim() || "AF",
  currency: "AED" as const,
  /** VAT in basis points (500 = 5%). Prices are stored VAT-inclusive. */
  vatBps: Number(process.env.NEXT_PUBLIC_VAT_BPS ?? 500),
  timezone: "Asia/Dubai" as const,
  locales: ["en", "ar"] as const,
  defaultLocale: "en" as const,
  /** Optional analytics / verification hooks, loaded only after consent. */
  analytics: {
    gaId: process.env.NEXT_PUBLIC_GA_ID?.trim() || "",
    searchConsoleVerification:
      process.env.NEXT_PUBLIC_GSC_VERIFICATION?.trim() || "",
  },
} as const

export type SiteLocale = (typeof site.locales)[number]

export function siteName(locale: string): string {
  return locale === "ar" ? site.nameAr : site.name
}

/** Absolute URL for a path (path must start with "/"). */
export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`
}
