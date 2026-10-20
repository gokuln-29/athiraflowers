"use client"

import { X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { Media } from "@/components/site/media"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "@/i18n/navigation"
import { formatMoney } from "@/lib/format"

import { useCart } from "./cart-provider"
import { QuantityStepper } from "./quantity-stepper"
import { useQuote } from "./use-quote"

export function CartView() {
  const t = useTranslations("cart")
  const locale = useLocale()
  const { items, hydrated, setQuantity, remove } = useCart()
  const { quote, pending, failed } = useQuote(items, locale, hydrated)
  const m = (n: number) => formatMoney(n, locale, { compact: true })

  if (hydrated && items.length === 0) {
    return (
      <div className="grid place-items-center gap-4 bg-surface py-24 text-center" style={{ borderRadius: "var(--radius)" }}>
        <h1 className="text-h1">{t("empty")}</h1>
        <p className="text-muted-foreground">{t("emptyHint")}</p>
        <Button render={<Link href="/shop" />} size="lg">{t("browse")}</Button>
      </div>
    )
  }
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-8">
        <h1 className="text-h1">{t("title")}</h1>
        <ul className="mt-8 divide-y border-y" aria-busy={pending}>
          {items.map((item) => {
            const line = quote?.lines.find((l) => l.productId === item.productId)
            return (
              <li key={item.productId} className="flex gap-4 py-6">
                <div className="w-24 shrink-0 overflow-hidden rounded-[var(--radius)] bg-surface-deep sm:w-32">
                  {line ? <Media media={line.image} locale={locale} ratio="4 / 5" sizes="128px" /> : <Skeleton className="aspect-[4/5]" />}
                </div>
                <div className="min-w-0 flex-1">
                  {line ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/product/${line.slug}`} className="text-h3 hover:underline">{line.name}</Link>
                        <button type="button" onClick={() => remove(item.productId)} aria-label={t("remove", { name: line.name })} className="-m-2 grid size-11 place-items-center text-muted-foreground hover:text-foreground">
                          <X className="size-5" aria-hidden />
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {line.pricingType === "subscription" ? t("program", { qty: line.quantity }) : line.pricingType === "rental" && line.rentalDays ? t("rental", { days: line.rentalDays }) : m(line.unitPriceMinor)}
                        {line.depositMinor > 0 && ` · ${t("deposit")} ${m(line.depositMinor)}`}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <QuantityStepper value={item.quantity} min={1} max={1000} onChange={(q) => setQuantity(item.productId, q)} label={t("qtyFor", { name: line.name })} />
                        <span className="tabular text-lg font-medium">{m(line.lineTotalMinor)}</span>
                      </div>
                      {line.minQty > 1 && <p className="mt-2 text-sm text-muted-foreground">{t("minQtyHint", { min: line.minQty })}</p>}
                      {line.issues.length > 0 && (
                        <p role="alert" className="mt-2 text-sm text-destructive">
                          {t(`lineIssues.${line.issues[0].code}` as "lineIssues.unavailable", { min: "min" in line.issues[0] ? line.issues[0].min : 0, max: "max" in line.issues[0] ? line.issues[0].max : 0, available: "available" in line.issues[0] ? line.issues[0].available : 0 })}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" /></div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {failed && <p role="alert" className="mt-4 text-destructive">{t("couldNotLoad")}</p>}
      </div>
      <aside className="lg:col-span-4">
        <div className="grid gap-4 bg-surface p-6 lg:sticky lg:top-24" style={{ borderRadius: "var(--radius)" }}>
          <div className="flex items-baseline justify-between">
            <span>{t("subtotal")}</span>
            <span className="tabular text-2xl font-medium">{quote ? m(quote.order.subtotalMinor) : "—"}</span>
          </div>
          {quote && quote.order.depositMinor > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground"><span>{t("deposit")}</span><span className="tabular">{m(quote.order.depositMinor)}</span></div>
          )}
          <p className="text-sm text-muted-foreground">{t("deliveryAtCheckout")} {t("priceNote")}</p>
          <Button render={<Link href="/checkout" />} size="lg" className="w-full" disabled={!quote || quote.lines.some((l) => l.issues.length > 0)}>{t("checkout")}</Button>
          <Button render={<Link href="/shop" />} variant="ghost" className="w-full">{t("continueShopping")}</Button>
        </div>
      </aside>
    </div>
  )
}
