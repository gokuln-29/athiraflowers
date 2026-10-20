import "server-only"
import { randomUUID } from "node:crypto"
import { and, eq, lt } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { media, type MediaVariant } from "@/db/schema"
import { env } from "@/lib/env"
import type { AdminContext } from "@/server/auth/admin-session"
import { audit } from "@/server/security/audit"
import { rateLimit } from "@/server/security/rate-limit"

import { ALLOWED_MIME, ImageRejected, processImage } from "./process"
import { storage } from "./storage"

export const intentSchema = z.object({
  contentType: z.enum(ALLOWED_MIME),
  bytes: z.number().int().min(1024),
})

export const completeSchema = z.object({
  mediaId: z.number().int().positive(),
  altEn: z.string().trim().max(300).default(""),
  altAr: z.string().trim().max(300).default(""),
  credit: z.string().trim().max(200).optional(),
})

const stagingKey = (key: string) => `staging/${key.replace(/^media\//, "")}`

/**
 * Step 1: the server decides who may upload, what, and where.
 * It returns a short-lived presigned PUT limited to one random key, one content type and one exact size.
 */
export async function createUploadIntent(admin: AdminContext, raw: unknown) {
  const parsed = intentSchema.safeParse(raw)
  if (!parsed.success) return { status: 400 as const, body: { error: "Only JPEG, PNG or WebP images are accepted." } }
  const { contentType, bytes } = parsed.data
  const maxBytes = env().UPLOAD_MAX_BYTES
  if (bytes > maxBytes) return { status: 413 as const, body: { error: `Images can be up to ${Math.round(maxBytes / 1_048_576)} MB.` } }
  const limited = await rateLimit(`upload:${admin.adminId}`, 60, 3600)
  if (!limited.allowed) return { status: 429 as const, body: { error: "Too many uploads. Try again later." } }

  const key = `media/${randomUUID()}`
  const [row] = await db.insert(media).values({ key, status: "pending", mime: contentType, bytes, createdBy: admin.adminId }).$returningId()
  const presigned = await storage().presignPut(stagingKey(key), contentType, bytes, env().UPLOAD_URL_TTL_SECONDS)
  await audit({ actorType: "admin", actorId: admin.adminId, action: "media.upload_intent", entity: "media", entityId: row.id, meta: { contentType, bytes }, ipHash: admin.ipHash })
  return { status: 200 as const, body: { mediaId: row.id, uploadUrl: presigned.url, method: presigned.method, headers: presigned.headers, expiresInSeconds: presigned.expiresInSeconds } }
}

/**
 * Step 2: the browser says it finished. The server now trusts nothing it was told:
 * it reads the bytes back, checks the real file signature, decodes, re-encodes to WebP,
 * strips EXIF/GPS, makes responsive sizes, and only then publishes.
 */
export async function completeUpload(admin: AdminContext, raw: unknown) {
  const parsed = completeSchema.safeParse(raw)
  if (!parsed.success) return { status: 400 as const, body: { error: "Invalid request." } }
  const { mediaId, altEn, altAr, credit } = parsed.data
  const [row] = await db.select().from(media).where(and(eq(media.id, mediaId), eq(media.status, "pending"))).limit(1)
  if (!row || row.createdBy !== admin.adminId) return { status: 404 as const, body: { error: "Upload not found." } }

  const driver = storage()
  const staging = stagingKey(row.key)
  const reject = async (reason: string, status: 422 | 404 = 422) => {
    await driver.remove(staging).catch(() => undefined)
    await db.update(media).set({ status: "rejected" }).where(eq(media.id, mediaId))
    await audit({ actorType: "admin", actorId: admin.adminId, action: "media.rejected", entity: "media", entityId: mediaId, meta: { reason }, ipHash: admin.ipHash })
    return { status, body: { error: "That image could not be accepted. Use a JPEG, PNG or WebP photo under the size limit." } }
  }

  try {
    const head = await driver.head(staging)
    if (!head) return reject("object missing", 404)
    if (head.bytes !== row.bytes) return reject("size differs from the intent")
    const original = await driver.get(staging, env().UPLOAD_MAX_BYTES)
    if (!original) return reject("object missing", 404)
    const processed = await processImage(original, env().UPLOAD_MAX_BYTES)

    const variants: MediaVariant[] = []
    try {
      for (const v of processed.variants) {
        const k = `${row.key}/${v.w}.webp`
        await driver.put(k, v.data, "image/webp")
        variants.push({ w: v.w, h: v.h, key: k, bytes: v.bytes })
      }
    } catch (error) {
      await Promise.all(variants.map((v) => driver.remove(v.key).catch(() => undefined)))
      throw error
    }
    await db
      .update(media)
      .set({ status: "ready", mime: "image/webp", bytes: variants[variants.length - 1].bytes, width: processed.width, height: processed.height, checksum: processed.checksum, dominant: processed.dominant, variants, altEn, altAr, credit: credit || null })
      .where(eq(media.id, mediaId))
    await driver.remove(staging).catch(() => undefined)
    await audit({ actorType: "admin", actorId: admin.adminId, action: "media.published", entity: "media", entityId: mediaId, meta: { width: processed.width, height: processed.height, checksum: processed.checksum }, ipHash: admin.ipHash })
    return { status: 200 as const, body: { id: mediaId, key: row.key, width: processed.width, height: processed.height, variants: variants.map((v) => ({ w: v.w, h: v.h, key: v.key })), altEn, altAr } }
  } catch (error) {
    if (error instanceof ImageRejected) return reject(error.reason)
    console.error("[upload] processing failed", (error as Error).message)
    await driver.remove(staging).catch(() => undefined)
    await db.update(media).set({ status: "rejected" }).where(eq(media.id, mediaId))
    return { status: 500 as const, body: { error: "We could not process that image. Please try again." } }
  }
}

/** Remove abandoned uploads (intent created but never completed). Run by the maintenance job. */
export async function purgeAbandonedUploads(olderThanMinutes = 60): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000)
  const stale = await db.select().from(media).where(and(eq(media.status, "pending"), lt(media.createdAt, cutoff)))
  for (const row of stale) {
    await storage().remove(stagingKey(row.key)).catch(() => undefined)
    await db.delete(media).where(eq(media.id, row.id))
  }
  return stale.length
}
