"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { deliveryBlackouts, deliverySlots, deliveryZones, EMIRATES } from "@/db/schema"
import { adminAction } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"

const t = (n: number) => z.string().trim().max(n)
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")
const idSchema = z.object({ id: z.number().int().positive() })
const log = (ctx: { adminId: number; ipHash: string }, action: string, entity: string, id: number | string) => audit({ actorType: "admin", actorId: ctx.adminId, action, entity, entityId: id, ipHash: ctx.ipHash })

export const saveZoneAction = adminAction("delivery:write", z.object({
  id: z.number().int().positive().optional(), emirate: z.enum(EMIRATES), nameEn: t(140).min(2), nameAr: t(140).default(""),
  fee: z.number().min(0).max(5000), freeOver: z.number().min(0).max(100000).nullable(), minOrder: z.number().min(0).max(100000),
  sameDayAvailable: z.boolean(), isActive: z.boolean(), sort: z.number().int().min(0).max(1000),
}), async (v, ctx) => {
  const values = { emirate: v.emirate, nameEn: v.nameEn, nameAr: v.nameAr, feeMinor: Math.round(v.fee * 100), freeOverMinor: v.freeOver == null ? null : Math.round(v.freeOver * 100), minOrderMinor: Math.round(v.minOrder * 100), sameDayAvailable: v.sameDayAvailable, isActive: v.isActive, sort: v.sort }
  let id = v.id
  if (id) await db.update(deliveryZones).set(values).where(eq(deliveryZones.id, id))
  else id = (await db.insert(deliveryZones).values(values).$returningId())[0].id
  await log(ctx, "delivery.zone_saved", "delivery_zone", id)
  revalidatePath("/admin/delivery")
  return { ok: true as const, data: undefined }
}, { name: "zone.save" })

export const saveSlotAction = adminAction("delivery:write", z.object({
  id: z.number().int().positive().optional(), labelEn: t(80).min(2), labelAr: t(80).default(""), startTime: hhmm, endTime: hhmm,
  sameDayCutoff: hhmm.nullable(), extraFee: z.number().min(0).max(1000), capacityPerDay: z.number().int().min(1).max(1000),
  daysMask: z.number().int().min(1).max(127), isActive: z.boolean(), sort: z.number().int().min(0).max(1000),
}).refine((v) => v.startTime < v.endTime, { path: ["endTime"], message: "End must be after start" }), async (v, ctx) => {
  const values = { labelEn: v.labelEn, labelAr: v.labelAr, startTime: v.startTime, endTime: v.endTime, sameDayCutoff: v.sameDayCutoff, extraFeeMinor: Math.round(v.extraFee * 100), capacityPerDay: v.capacityPerDay, daysMask: v.daysMask, isActive: v.isActive, sort: v.sort }
  let id = v.id
  if (id) await db.update(deliverySlots).set(values).where(eq(deliverySlots.id, id))
  else id = (await db.insert(deliverySlots).values(values).$returningId())[0].id
  await log(ctx, "delivery.slot_saved", "delivery_slot", id)
  revalidatePath("/admin/delivery")
  return { ok: true as const, data: undefined }
}, { name: "slot.save" })

export const addBlackoutAction = adminAction("delivery:write", z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), emirate: z.enum(EMIRATES).nullable(), reasonEn: t(160).min(2), reasonAr: t(160).default("") }), async (v, ctx) => {
  const [row] = await db.insert(deliveryBlackouts).values({ day: v.day, emirate: v.emirate, reasonEn: v.reasonEn, reasonAr: v.reasonAr }).$returningId()
  await log(ctx, "delivery.blackout_added", "delivery_blackout", row.id)
  revalidatePath("/admin/delivery")
  return { ok: true as const, data: undefined }
}, { name: "blackout.add" })

export const deleteBlackoutAction = adminAction("delivery:write", idSchema, async ({ id }, ctx) => {
  await db.delete(deliveryBlackouts).where(eq(deliveryBlackouts.id, id))
  await log(ctx, "delivery.blackout_removed", "delivery_blackout", id)
  revalidatePath("/admin/delivery")
  return { ok: true as const, data: undefined }
}, { name: "blackout.delete" })
