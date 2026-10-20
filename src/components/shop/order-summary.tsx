"use client"

import { useLocale, useTranslations } from "next-intl"

import { Media } from "@/components/site/media"
import { formatMoney } from "@/lib/format"
import type { Quote } from "@/server/cart/quote"

/** Server-quoted totals. Rendering only: no arithmetic happens here. */
export function OrderSummary({ quote, className }: { quote: Quote; className?: string }) {
  const t = useTranslations("checkout")
  const tc = useTranslations("cart")
  const locale = useLocale()
  const o = quote.order
  const m = (n: number) => formatMoney(n, locale, { compact: true })
  return (
    <section aria-labelledby="summary-title" className={className}>
      <h2 id="summary-title" className="text-h3">{t("summary")}</h2>
      <ul className="mt-4 divide-y">
        {quote.lines.map((l) => (
          <li key={l.productId} className="flex gap-3 py-3">
            <div className="w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-surface-deep">
              <Media media={l.image} locale={locale} ratio="4 / 5" sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{l.name}</p>
              <p className="text-sm text-muted-foreground">
                {l.pricingType === "subscription" ? tc("program", { qty: l.quantity }) : l.pricingType === "rental" && l.rentalDays ? tc("rental", { days: l.rentalDays }) : `${l.quantity} × ${m(l.unitPriceMinor)}`}
              </p>
              {l.issues.length > 0 && (
                <p role="alert" className="text-sm text-destructive">
                  {tc(`lineIssues.${l.issues[0].code}` as "lineIssues.unavailable", { min: "min" in l.issues[0] ? l.issues[0].min : 0, max: "max" in l.issues[0] ? l.issues[0].max : 0, available: "available" in l.issues[0] ? l.issues[0].available : 0 })}
                </p>
              )}
            </div>
            <p className="tabular font-medium">{m(l.lineTotalMinor)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 grid gap-2 border-t pt-4">
        <Row label={t("subtotal")} value={m(o.subtotalMinor)} />
        {o.discountMinor > 0 && <Row label={t("discount", { code: quote.coupon?.code ?? "" })} value={`−${m(o.discountMinor)}`} />}
        <Row label={t("delivery")} value={quote.zone ? (o.deliveryFeeMinor === 0 ? t("free") : m(o.deliveryFeeMinor)) : t("chooseArea")} muted={!quote.zone} />
        {quote.slotFeeMinor > 0 && <Row label={t("slotFee")} value={m(quote.slotFeeMinor)} />}
        {o.depositMinor > 0 && <Row label={t("deposit")} value={m(o.depositMinor)} />}
        <div className="flex items-baseline justify-between gap-4 border-t pt-3 text-lg font-medium">
          <dt>{t("total")}</dt>
          <dd className="tabular text-2xl">{m(o.totalMinor)}</dd>
        </div>
        <p className="text-sm text-muted-foreground">{t("vatIncluded", { vat: m(o.vatMinor) })}</p>
        {o.depositMinor > 0 && <p className="text-sm text-muted-foreground">{t("depositNote")}</p>}
      </dl>
    </section>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={muted ? "text-muted-foreground" : "tabular"}>{value}</dd>
    </div>
  )
}
