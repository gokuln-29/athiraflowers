import type { Metadata } from "next"

import { absoluteUrl, site, siteName } from "@/config/site"
import { mediaUrl, pickVariant, type MediaLite } from "@/lib/media"

const localePath = (locale: string, path: string) => `/${locale}${path === "/" ? "" : path}`

export function alternatesFor(locale: string, path: string): Metadata["alternates"] {
  return {
    canonical: absoluteUrl(localePath(locale, path)),
    languages: {
      en: absoluteUrl(localePath("en", path)),
      ar: absoluteUrl(localePath("ar", path)),
      "x-default": absoluteUrl(localePath("en", path)),
    },
  }
}

export function ogImageFrom(image: MediaLite | null | undefined) {
  const v = pickVariant(image?.variants, 1200)
  return v ? { url: mediaUrl(v.key).startsWith("http") ? mediaUrl(v.key) : absoluteUrl(mediaUrl(v.key)), width: v.w, height: v.h } : undefined
}

export function pageMetadata(opts: {
  locale: string
  path: string
  title: string
  description: string
  image?: MediaLite | null
  noindex?: boolean
  type?: "website" | "article"
  publishedTime?: string
}): Metadata {
  const url = absoluteUrl(localePath(opts.locale, opts.path))
  const image = ogImageFrom(opts.image)
  return {
    title: opts.title,
    description: opts.description,
    alternates: alternatesFor(opts.locale, opts.path),
    robots: opts.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: opts.type ?? "website",
      url,
      title: opts.title,
      description: opts.description,
      siteName: siteName(opts.locale),
      locale: opts.locale === "ar" ? "ar_AE" : "en_AE",
      alternateLocale: opts.locale === "ar" ? ["en_AE"] : ["ar_AE"],
      images: image ? [image] : undefined,
      publishedTime: opts.publishedTime,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: opts.title, description: opts.description, images: image ? [image.url] : undefined },
  }
}

export { site }
