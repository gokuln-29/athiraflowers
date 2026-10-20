import "server-only"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { media, type MediaVariant } from "@/db/schema"
import { env } from "@/lib/env"

import { processImage } from "./process"
import { storage } from "./storage"

export type IngestInput = {
  buffer: Buffer
  altEn?: string
  altAr?: string
  credit?: string
  createdBy?: number | null
}

/** Process an image buffer, store the derivatives, and record it. Used by the seed and the upload pipeline. */
export async function ingestImage(input: IngestInput): Promise<{ id: number; key: string }> {
  const processed = await processImage(input.buffer, env().UPLOAD_MAX_BYTES * 2)
  const key = `media/${randomUUID()}`
  const driver = storage()
  const variants: MediaVariant[] = []
  try {
    for (const v of processed.variants) {
      const variantKey = `${key}/${v.w}.webp`
      await driver.put(variantKey, v.data, "image/webp")
      variants.push({ w: v.w, h: v.h, key: variantKey, bytes: v.bytes })
    }
  } catch (error) {
    await Promise.all(variants.map((v) => driver.remove(v.key).catch(() => undefined)))
    throw error
  }
  const largest = variants[variants.length - 1]
  const [row] = await db
    .insert(media)
    .values({
      key,
      status: "ready",
      mime: "image/webp",
      bytes: largest.bytes,
      width: processed.width,
      height: processed.height,
      checksum: processed.checksum,
      altEn: input.altEn ?? "",
      altAr: input.altAr ?? "",
      variants,
      dominant: processed.dominant,
      credit: input.credit ?? null,
      createdBy: input.createdBy ?? null,
    })
    .$returningId()
  return { id: row.id, key }
}

export async function deleteMedia(id: number): Promise<void> {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1)
  if (!row) return
  const driver = storage()
  for (const v of row.variants ?? []) await driver.remove(v.key).catch(() => undefined)
  await db.delete(media).where(eq(media.id, id))
}
