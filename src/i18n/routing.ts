import { defineRouting } from "next-intl/routing"

import { site } from "@/config/site"

export const routing = defineRouting({
  locales: [...site.locales],
  defaultLocale: site.defaultLocale,
  localePrefix: "always",
})

export type Locale = (typeof routing.locales)[number]

export const isLocale = (value: string): value is Locale =>
  (routing.locales as readonly string[]).includes(value)

export const dirOf = (locale: string) => (locale === "ar" ? "rtl" : "ltr")
