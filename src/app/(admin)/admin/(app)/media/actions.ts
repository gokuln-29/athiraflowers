"use server"

import { eq } from "drizzle-orm"
import { desc } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { media } from "@/db/schema"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { deleteMedia } from "@/server/media/service"
import { mediaUsage } from "@/server/media/usage"
import { audit } from "@/server/security/audit"

export type MediaItem = { id: number; key: string; width: number | null; height: number | null; altEn: string; altAr: string; credit: string | null; variants: { w: number; h: number; key: string }[] }

export const listMediaAction = adminAction(
  "media:write",
  z.object({ page: z.number().int().min(1).max(500).default(1) }),
  async ({ page }) => {
    const rows = await db.select().from(media).where(eq(media.status, "ready")).orderBy(desc(media.id)).limit(48).offset((page - 1) * 48)
    const data: MediaItem[] = rows.map((m) => ({ id: m.id, key: m.key, width: m.width, height: m.height, altEn: m.altEn, altAr: m.altAr, credit: m.credit, variants: (m.variants ?? []).map((v) => ({ w: v.w, h: v.h, key: v.key })) }))
    return { ok: true as const, data }
  },
  { name: "media.list" }
)

export const updateMediaAction = adminAction(
  "media:write",
  z.object({ id: z.number().int().positive(), altEn: z.string().trim().max(300), altAr: z.string().trim().max(300), credit: z.string().trim().max(200).optional() }),
  async (input, ctx) => {
    await db.update(media).set({ altEn: input.altEn, altAr: input.altAr, credit: input.credit || null }).where(eq(media.id, input.id))
    await audit({ actorType: "admin", actorId: ctx.adminId, action: "media.updated", entity: "media", entityId: input.id, ipHash: ctx.ipHash })
    return { ok: true as const, data: undefined }
  },
  { name: "media.update" }
)

export const deleteMediaAction = adminAction(
  "media:write",
  z.object({ id: z.number().int().positive() }),
  async ({ id }, ctx) => {
    const usage = await mediaUsage(id)
    if (usage.length) return fail(`This image is used by ${usage.join(", ")}. Replace it there first.`)
    await deleteMedia(id)
    await audit({ actorType: "admin", actorId: ctx.adminId, action: "media.deleted", entity: "media", entityId: id, ipHash: ctx.ipHash })
    return { ok: true as const, data: undefined }
  },
  { name: "media.delete" }
)
