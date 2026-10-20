import "server-only"
import { asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { deliveryZones } from "@/db/schema"
import { pickColumn } from "@/lib/i18n-text"

export async function listZones(locale: string) {
  const rows = await db.select().from(deliveryZones).where(eq(deliveryZones.isActive, true)).orderBy(asc(deliveryZones.sort), asc(deliveryZones.id))
  return rows.map((z) => ({
    id: z.id,
    emirate: z.emirate,
    name: pickColumn(z.nameEn, z.nameAr, locale),
    feeMinor: z.feeMinor,
    freeOverMinor: z.freeOverMinor,
    minOrderMinor: z.minOrderMinor,
    sameDayAvailable: z.sameDayAvailable,
  }))
}

export async function listSlots(locale: string) {
  const { deliverySlots } = await import("@/db/schema")
  const rows = await db.select().from(deliverySlots).where(eq(deliverySlots.isActive, true)).orderBy(asc(deliverySlots.sort), asc(deliverySlots.startTime))
  return rows.map((s) => ({
    id: s.id,
    label: pickColumn(s.labelEn, s.labelAr, locale),
    startTime: s.startTime,
    endTime: s.endTime,
    sameDayCutoff: s.sameDayCutoff,
    extraFeeMinor: s.extraFeeMinor,
  }))
}
