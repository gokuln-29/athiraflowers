import { mediaSrcSet, mediaUrl, pickVariant, type MediaLite } from "@/lib/media"
import { cn } from "@/lib/utils"

/**
 * Responsive image from our own WebP derivatives. Explicit width/height prevent layout shift;
 * `priority` marks the LCP image; everything else is lazy.
 */
export function Media({
  media, locale, sizes = "100vw", priority = false, className, alt, ratio,
}: {
  media: MediaLite | null | undefined
  locale: string
  sizes?: string
  priority?: boolean
  className?: string
  /** Override the alt text; pass "" for purely decorative images. */
  alt?: string
  /** CSS aspect-ratio, e.g. "4 / 5". The image is cropped with object-fit: cover. */
  ratio?: string
}) {
  if (!media) return <div className={cn("bg-surface-deep", className)} style={{ aspectRatio: ratio }} aria-hidden />
  const fallback = pickVariant(media.variants, 960)
  const text = alt ?? (locale === "ar" && media.altAr ? media.altAr : media.altEn)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fallback ? mediaUrl(fallback.key) : mediaUrl(media.key)}
      srcSet={mediaSrcSet(media.variants)}
      sizes={sizes}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      alt={text}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn("block h-full w-full object-cover", className)}
      style={{ backgroundColor: media.dominant ?? undefined, aspectRatio: ratio }}
    />
  )
}
