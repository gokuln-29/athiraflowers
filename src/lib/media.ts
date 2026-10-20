import { site } from "@/config/site"

export type MediaVariantLite = { w: number; h: number; key: string }
export type MediaLite = {
  key: string
  width: number | null
  height: number | null
  altEn: string
  altAr: string
  variants: MediaVariantLite[] | null
  dominant?: string | null
}

export const mediaUrl = (key: string) => `${site.mediaUrl}/${key}`

export function mediaSrcSet(variants: MediaVariantLite[] | null | undefined): string | undefined {
  if (!variants?.length) return undefined
  return variants.map((v) => `${mediaUrl(v.key)} ${v.w}w`).join(", ")
}

/** Pick the smallest variant at least `min` wide (fallback: the largest). */
export function pickVariant(variants: MediaVariantLite[] | null | undefined, min: number): MediaVariantLite | undefined {
  if (!variants?.length) return undefined
  return variants.find((v) => v.w >= min) ?? variants[variants.length - 1]
}
