import { z } from "zod"

/** A bilingual string as stored in JSON columns. */
export const localized = z.object({ en: z.string().max(2000), ar: z.string().max(2000) })
export type Localized = z.infer<typeof localized>

export function pick(value: Localized | undefined | null, locale: string): string {
  if (!value) return ""
  return (locale === "ar" ? value.ar || value.en : value.en) ?? ""
}

/** Choose the Arabic column when locale is ar and it is filled, else English. */
export function pickColumn(en: string | null | undefined, ar: string | null | undefined, locale: string): string {
  if (locale === "ar") return (ar && ar.trim() ? ar : en) ?? ""
  return en ?? ""
}
