import { desc } from "drizzle-orm"

import { PaymentLinksManager } from "@/components/admin/payment-links-manager"
import { PageHeader } from "@/components/admin/shell"
import { absoluteUrl } from "@/config/site"
import { db } from "@/db"
import { paymentLinks } from "@/db/schema"
import { nowMs } from "@/lib/time"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Payment links" }

export default async function PaymentLinksPage() {
  await requirePage("payment-links:write")
  const rows = await db.select().from(paymentLinks).orderBy(desc(paymentLinks.id)).limit(200)
  const now = nowMs()
  return (
    <>
      <PageHeader title="Payment links" description="Share a secure card payment page for deposits, balances and one-off charges." />
      <PaymentLinksManager rows={rows.map((l) => ({ id: l.id, token: l.token, title: l.title, amountMinor: l.amountMinor, status: l.status === "active" && l.expiresAt && l.expiresAt.getTime() < now ? "expired" : l.status, customer: l.customerName ?? l.customerEmail, expiresAt: l.expiresAt?.toISOString() ?? null, paidAt: l.paidAt?.toISOString() ?? null, url: absoluteUrl(`/en/pay/${l.token}`) }))} />
    </>
  )
}
