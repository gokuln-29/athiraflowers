import { site } from "@/config/site"

const numberLocale = (locale: string) => (locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE")

/** AED amount from fils. Latin digits in both languages: prices, TRNs and phones stay unambiguous. */
export function formatMoney(minor: number, locale: string, opts: { compact?: boolean } = {}): string {
  const major = minor / 100
  const whole = Number.isInteger(major)
  return new Intl.NumberFormat(numberLocale(locale), {
    style: "currency",
    currency: site.currency,
    currencyDisplay: "code",
    minimumFractionDigits: opts.compact && whole ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(major)
    .replace(/ /g, " ")
}

export const formatNumber = (n: number, locale: string) => new Intl.NumberFormat(numberLocale(locale)).format(n)

export function formatDate(date: Date | string, locale: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  const d = typeof date === "string" ? new Date(date.length === 10 ? `${date}T12:00:00+04:00` : date) : date
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE", { timeZone: site.timezone, ...opts }).format(d)
}

/** "DD Mon" style day label for a YYYY-MM-DD delivery date. */
export const formatDay = (day: string, locale: string) => formatDate(day, locale, { weekday: "short", day: "numeric", month: "short" })
