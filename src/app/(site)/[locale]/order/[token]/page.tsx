import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { OrderPoller } from "@/components/shop/order-poller"
import { OrderStatusBadge } from "@/components/shop/order-status-badge"
import { RetryPayment } from "@/components/shop/retry-payment"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { orderItems, orders } from "@/db/schema"
import { Link } from "@/i18n/navigation"
import { formatDate, formatMoney } from "@/lib/format"
import { whatsappUrl } from "@/lib/contact"
import { stripeConfigured } from "@/server/payments/stripe"
import { getSettings } from "@/server/queries/content"

/** Private, token-addressed page. The order number is never part of any URL. */
export const metadata = { robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" as const }

const STEPS = ["pending", "confirmed", "preparing", "dispatched", "delivered"] as const

export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/order/[token]">) {
  const { locale, token } = await params
  setRequestLocale(locale)
  if (!/^[0-9a-f]{32}$/.test(token)) notFound()
  const sp = await searchParams
  const [order] = await db.select().from(orders).where(eq(orders.publicToken, token)).limit(1)
  if (!order) notFound()
  const [items, t, settings] = await Promise.all([db.select().from(orderItems).where(eq(orderItems.orderId, order.id)), getTranslations({ locale, namespace: "order" }), getSettings()])
  const m = (n: number) => formatMoney(n, locale, { compact: true })
  const awaitingPayment = order.paymentMethod === "stripe" && order.paymentStatus === "unpaid" && order.status === "pending"
  const returnedFromStripe = sp.paid === "1" && awaitingPayment
  const wa = whatsappUrl(settings.contact.whatsapp, `${locale === "ar" ? settings.contact.whatsappMessageAr : settings.contact.whatsappMessageEn} ${order.orderNumber}`)
  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number])

  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <OrderPoller active={returnedFromStripe} />
      <div className="max-w-[52rem]">
        <h1 className="text-h1">
          {order.status === "cancelled" ? t("titleCancelled") : order.paymentStatus === "paid" || order.paymentMethod === "cod" ? t("titleThanks", { name: order.contactName.split(" ")[0] }) : t("titlePending")}
        </h1>
        <p className="text-lead mt-3 text-muted-foreground">
          {t("orderNumber")} <span className="tabular font-medium text-foreground">{order.orderNumber}</span>
        </p>

        {returnedFromStripe && <p role="status" className="mt-6 bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>{t("confirmingPayment")}</p>}
        {sp.cancelled === "1" && awaitingPayment && <p role="status" className="mt-6 bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>{t("paymentCancelled")}</p>}
        {awaitingPayment && stripeConfigured() && <div className="mt-6"><RetryPayment token={token} /></div>}
        {order.paymentMethod === "cod" && order.status === "pending" && <p className="mt-6 bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>{t("codNote")}</p>}
        {order.status === "cancelled" && <p className="mt-6 bg-surface p-4" style={{ borderRadius: "var(--radius)" }}>{t("cancelledNote")}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2">
          <OrderStatusBadge status={order.status} label={t(`status.${order.status}`)} />
          <span className="text-muted-foreground">{t("payment")}: {t(`paymentMethod.${order.paymentMethod}`)}, {t(`paymentStatus.${order.paymentStatus}`)}</span>
        </div>

        {stepIndex >= 0 && order.status !== "cancelled" && (
          <ol className="mt-6 grid grid-cols-5 gap-1" aria-label={t("progress")}>
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === stepIndex ? "step" : undefined} className={i <= stepIndex ? "" : "opacity-50"}>
                <span className={`block h-1.5 ${i <= stepIndex ? "bg-primary" : "bg-surface-deep"}`} aria-hidden />
                <span className="mt-2 block text-xs sm:text-sm">{t(`status.${s}`)}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="text-h3">{t("delivery")}</h2>
            <p className="mt-2">{formatDate(order.deliveryDate, locale, { dateStyle: "full" })}</p>
            <p className="text-muted-foreground">{order.slotLabel}</p>
            <p className="mt-2">{order.recipientName}</p>
            <p className="text-muted-foreground">{order.building}{order.street ? `, ${order.street}` : ""}, {order.area}, {order.zoneName}</p>
          </section>
          <section>
            <h2 className="text-h3">{t("contact")}</h2>
            <p className="mt-2">{order.contactName}</p>
            <p className="text-muted-foreground">{order.contactEmail}</p>
            {order.invoiceRequested && (
              <p className="mt-2 text-muted-foreground">{t("invoiceFor", { company: order.companyName ?? "" })}{order.poNumber ? `, ${t("po", { po: order.poNumber })}` : ""}</p>
            )}
          </section>
        </div>

        <section className="mt-10">
          <h2 className="text-h3">{t("items")}</h2>
          <ul className="mt-4 divide-y border-y">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-3">
                <span>{locale === "ar" && i.titleAr ? i.titleAr : i.titleEn} <span className="text-muted-foreground">× {i.quantity}</span></span>
                <span className="tabular">{m(i.lineTotalMinor)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid max-w-sm gap-1 ms-auto">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="tabular">{m(order.subtotalMinor)}</dd></div>
            {order.discountMinor > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{t("discount")}</dt><dd className="tabular">−{m(order.discountMinor)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("deliveryFee")}</dt><dd className="tabular">{order.deliveryFeeMinor ? m(order.deliveryFeeMinor) : t("free")}</dd></div>
            {order.depositMinor > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{t("deposit")}</dt><dd className="tabular">{m(order.depositMinor)}</dd></div>}
            <div className="flex justify-between border-t pt-2 text-lg font-medium"><dt>{t("total")}</dt><dd className="tabular">{m(order.totalMinor)}</dd></div>
            <div className="text-sm text-muted-foreground flex justify-between"><dt>{t("vat")}</dt><dd className="tabular">{m(order.vatMinor)}</dd></div>
          </dl>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          {order.invoiceNumber && order.invoiceRequested && (
            <Button render={<a href={`/api/orders/${token}/invoice`} />} variant="outline">{t("downloadInvoice")}</Button>
          )}
          {wa && <Button render={<a href={wa} target="_blank" rel="noopener noreferrer" />} variant="outline">{t("help")}<span className="sr-only"> ({t("newTab")})</span></Button>}
          <Button render={<Link href="/shop" />}>{t("continueShopping")}</Button>
        </div>
      </div>
    </div>
  )
}
