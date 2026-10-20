"use client"

import { ShoppingBag, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { Media } from "@/components/site/media"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "@/i18n/navigation"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useCart } from "./cart-provider"
import { QuantityStepper } from "./quantity-stepper"
import { useQuote } from "./use-quote"

export function CartButton() {
  const t = useTranslations("nav")
  const tc = useTranslations("cart")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const { items, count, hydrated, open, setOpen, setQuantity, remove } = useCart()
  const { quote, pending, failed } = useQuote(items, locale, open)
  const side = locale === "ar" ? "left" : "right"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button type="button" className="pressable relative grid size-11 place-items-center rounded-[var(--radius)] hover:bg-surface-deep" aria-label={t("cartCount", { count: hydrated ? count : 0 })} />
        }
      >
        <ShoppingBag className="size-5" aria-hidden />
        {hydrated && count > 0 && (
          <span aria-hidden className="tabular absolute end-1 top-1 grid min-w-4 place-items-center bg-primary px-1 text-[0.6875rem] leading-4 font-medium text-primary-foreground" style={{ borderRadius: "var(--radius)" }}>
            {count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side={side} closeLabel={tCommon("close")} className="w-full max-w-md gap-0 p-0 data-[side=left]:w-full data-[side=right]:w-full sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="text-h3">{tc("title")}</SheetTitle>
          <SheetDescription className="sr-only">{tc("priceNote")}</SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="grid flex-1 place-content-center justify-items-center gap-4 p-8 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-h3">{tc("empty")}</p>
            <p className="max-w-[30ch] text-muted-foreground">{tc("emptyHint")}</p>
            <Button render={<Link href="/shop" onClick={() => setOpen(false)} />} size="lg">
              {tc("browse")}
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-5" aria-busy={pending}>
              {items.map((item) => {
                const line = quote?.lines.find((l) => l.productId === item.productId)
                return (
                  <li key={item.productId} className="flex gap-4 py-5">
                    <div className="w-20 shrink-0 overflow-hidden rounded-[var(--radius)] bg-surface-deep">
                      {line ? <Media media={line.image} locale={locale} ratio="4 / 5" sizes="80px" /> : <Skeleton className="aspect-[4/5]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      {line ? (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <Link href={`/product/${line.slug}`} onClick={() => setOpen(false)} className="text-h3 !text-base !leading-snug hover:underline">
                              {line.name}
                            </Link>
                            <button type="button" className="-m-2 grid size-9 shrink-0 place-items-center text-muted-foreground hover:text-foreground" aria-label={tc("remove", { name: line.name })} onClick={() => remove(item.productId)}>
                              <X className="size-4" aria-hidden />
                            </button>
                          </div>
                          <p className="meta-line mt-1 text-sm text-muted-foreground">
                            {line.pricingType === "subscription" ? tc("program", { qty: line.quantity }) : line.pricingType === "rental" && line.rentalDays ? tc("rental", { days: line.rentalDays }) : formatMoney(line.unitPriceMinor, locale, { compact: true })}
                            {line.depositMinor > 0 && ` · ${tc("deposit")} ${formatMoney(line.depositMinor, locale, { compact: true })}`}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <QuantityStepper compact value={item.quantity} min={1} max={1000} label={tc("qtyFor", { name: line.name })} onChange={(q) => setQuantity(item.productId, q)} />
                            <span className="tabular font-medium">{formatMoney(line.lineTotalMinor, locale, { compact: true })}</span>
                          </div>
                          {line.issues.length > 0 && (
                            <p role="status" className={cn("mt-2 text-sm text-destructive")}>
                              {tc(`lineIssues.${line.issues[0].code}` as "lineIssues.unavailable", { min: "min" in line.issues[0] ? line.issues[0].min : 0, max: "max" in line.issues[0] ? line.issues[0].max : 0, available: "available" in line.issues[0] ? line.issues[0].available : 0 })}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            <SheetFooter className="gap-3 border-t bg-surface p-5">
              {failed && <p role="alert" className="text-sm text-destructive">{tc("couldNotLoad")}</p>}
              <div className="flex items-baseline justify-between">
                <span>{tc("subtotal")}</span>
                <span className="tabular text-xl font-medium">{quote ? formatMoney(quote.order.subtotalMinor, locale, { compact: true }) : "—"}</span>
              </div>
              <p className="text-sm text-muted-foreground">{tc("deliveryAtCheckout")} {tc("priceNote")}</p>
              <Button render={<Link href="/checkout" onClick={() => setOpen(false)} />} size="lg" className="w-full" disabled={!quote || quote.lines.some((l) => l.issues.length > 0)}>
                {tc("checkout")}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} className="w-full">
                {tc("continueShopping")}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
