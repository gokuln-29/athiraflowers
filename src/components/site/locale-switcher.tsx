"use client"

import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { Link, usePathname } from "@/i18n/navigation"

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale()
  const t = useTranslations("common")
  const pathname = usePathname()
  const params = useSearchParams()
  const other = locale === "ar" ? "en" : "ar"
  const query = params.toString()
  return (
    <Link href={`${pathname}${query ? `?${query}` : ""}`} locale={other} lang={other} hrefLang={other} className={className} aria-label={`${t("language")}: ${other === "ar" ? "العربية" : "English"}`}>
      {other === "ar" ? t("switchToArabic") : t("switchToEnglish")}
    </Link>
  )
}
