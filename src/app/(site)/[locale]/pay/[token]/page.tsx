import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { PayLinkButton } from "@/components/shop/pay-link-button"
import { db } from "@/db"
import { paymentLinks } from "@/db/schema"
import { formatMoney } from "@/lib/format"
import { nowMs } from "@/lib/time"
import { stripeConfigured } from "@/server/payments/stripe"

export const metadata = { robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" as const }

export default async function PayPage({ params, searchParams }: PageProps<"/[locale]/pay/[token]">) {
  const { locale, token } = await params
  setRequestLocale(locale)
  if (!/^[0-9a-f]{32}$/.test(token)) notFound()
  const [link] = await db.select().from(paymentLinks).where(eq(paymentLinks.token, token)).limit(1)
  if (!link) notFound()
  const t = await getTranslations({ locale, namespace: "order" })
  const sp = await searchParams
  const expired = link.status === "active" && link.expiresAt && link.expiresAt.getTime() < nowMs()
  const state = link.status === "paid" ? "paid" : link.status === "cancelled" ? "cancelled" : expired ? "expired" : "active"
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <div className="mx-auto max-w-lg">
        <h1 className="text-h1">{link.title}</h1>
        {link.description && <p className="text-lead mt-3 text-muted-foreground">{link.description}</p>}
        <p className="text-display tabular mt-8 !text-[clamp(2.5rem,1.5rem+4vw,4rem)]">{formatMoney(link.amountMinor, locale)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("vat")}</p>
        <div className="mt-8">
          {state === "paid" && <p role="status" className="bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>{t("linkPaid")}</p>}
          {state === "cancelled" && <p role="status" className="bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>{t("linkCancelled")}</p>}
          {state === "expired" && <p role="status" className="bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>{t("linkExpired")}</p>}
          {state === "active" && (stripeConfigured() ? <PayLinkButton token={token} /> : <p role="status">{t("linkUnavailable")}</p>)}
          {sp.cancelled === "1" && state === "active" && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("paymentCancelled")}</p>}
          {sp.paid === "1" && state === "active" && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("confirmingPayment")}</p>}
        </div>
      </div>
    </div>
  )
}
