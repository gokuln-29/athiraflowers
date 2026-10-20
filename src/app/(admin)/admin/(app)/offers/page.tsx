import { desc } from "drizzle-orm"

import { OffersManager, type CouponRow } from "@/components/admin/offers-manager"
import { PageHeader } from "@/components/admin/shell"
import { db } from "@/db"
import { coupons } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Offers" }
const dubaiDay = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(d) : "")

export default async function OffersPage() {
  await requirePage("offers:write")
  const rows = await db.select().from(coupons).orderBy(desc(coupons.id))
  const data: CouponRow[] = rows.map((c) => ({
    id: c.id, code: c.code, kind: c.kind, value: c.kind === "percent" ? c.value : c.value / 100, minOrder: c.minOrderMinor / 100, maxDiscount: c.maxDiscountMinor ? c.maxDiscountMinor / 100 : null,
    startsOn: dubaiDay(c.startsAt), endsOn: dubaiDay(c.endsAt), maxUses: c.maxUses, perCustomerLimit: c.perCustomerLimit, isActive: c.isActive, isPublic: c.isPublic,
    titleEn: c.titleEn, titleAr: c.titleAr, descriptionEn: c.descriptionEn ?? "", descriptionAr: c.descriptionAr ?? "", usedCount: c.usedCount,
  }))
  return (<><PageHeader title="Offers" description="Promo codes and public offers." /><OffersManager rows={data} /></>)
}
