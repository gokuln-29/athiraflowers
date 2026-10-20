"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

import { Media } from "@/components/site/media"
import type { MediaLite } from "@/lib/media"
import { cn } from "@/lib/utils"

export function Gallery({ images, locale, name }: { images: MediaLite[]; locale: string; name: string }) {
  const t = useTranslations("product")
  const [index, setIndex] = useState(0)
  const current = images[index] ?? images[0]
  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-[var(--radius)] bg-surface-deep">
        <Media key={current?.key} media={current} locale={locale} ratio="4 / 5" priority sizes="(min-width:1024px) 55vw, 100vw" alt={locale === "ar" ? current?.altAr || name : current?.altEn || name} />
      </div>
      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-3">
          {images.map((img, i) => (
            <li key={img.key}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t("showImage", { n: i + 1, total: images.length })}
                aria-current={i === index}
                className={cn("block w-full overflow-hidden rounded-[var(--radius)] opacity-70 outline-offset-2 transition-opacity hover:opacity-100", i === index && "opacity-100 ring-2 ring-foreground")}
              >
                <Media media={img} locale={locale} ratio="1 / 1" sizes="120px" alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
