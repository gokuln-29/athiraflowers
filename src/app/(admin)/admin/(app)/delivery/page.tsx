import { asc } from "drizzle-orm"

import { DeliveryManager } from "@/components/admin/delivery-manager"
import { PageHeader } from "@/components/admin/shell"
import { db } from "@/db"
import { deliveryBlackouts, deliverySlots, deliveryZones } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Delivery" }

export default async function DeliveryPage() {
  await requirePage("delivery:write")
  const [zones, slots, blackouts] = await Promise.all([
    db.select().from(deliveryZones).orderBy(asc(deliveryZones.sort), asc(deliveryZones.id)),
    db.select().from(deliverySlots).orderBy(asc(deliverySlots.sort), asc(deliverySlots.startTime)),
    db.select().from(deliveryBlackouts).orderBy(asc(deliveryBlackouts.day)),
  ])
  return (
    <>
      <PageHeader title="Delivery" description="Zones, delivery windows and the days you cannot deliver." />
      <DeliveryManager
        canWrite
        zones={zones.map((z) => ({ id: z.id, emirate: z.emirate, nameEn: z.nameEn, nameAr: z.nameAr, fee: z.feeMinor / 100, freeOver: z.freeOverMinor == null ? null : z.freeOverMinor / 100, minOrder: z.minOrderMinor / 100, sameDayAvailable: z.sameDayAvailable, isActive: z.isActive, sort: z.sort }))}
        slots={slots.map((s) => ({ id: s.id, labelEn: s.labelEn, labelAr: s.labelAr, startTime: s.startTime, endTime: s.endTime, sameDayCutoff: s.sameDayCutoff, extraFee: s.extraFeeMinor / 100, capacityPerDay: s.capacityPerDay, daysMask: s.daysMask, isActive: s.isActive, sort: s.sort }))}
        blackouts={blackouts.map((b) => ({ id: b.id, day: String(b.day).slice(0, 10), emirate: b.emirate, reasonEn: b.reasonEn }))}
      />
    </>
  )
}
