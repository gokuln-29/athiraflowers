import "server-only"
import { inArray } from "drizzle-orm"

import { db } from "@/db"
import { media } from "@/db/schema"
import type { MediaLite } from "@/lib/media"

export type MediaMap = Map<number, MediaLite>

export async function getMediaMap(ids: (number | null | undefined)[]): Promise<MediaMap> {
  const unique = [...new Set(ids.filter((v): v is number => typeof v === "number"))]
  if (unique.length === 0) return new Map()
  const rows = await db.select().from(media).where(inArray(media.id, unique))
  return new Map(
    rows
      .filter((r) => r.status === "ready")
      .map((r) => [r.id, { key: r.key, width: r.width, height: r.height, altEn: r.altEn, altAr: r.altAr, variants: r.variants, dominant: r.dominant }])
  )
}
