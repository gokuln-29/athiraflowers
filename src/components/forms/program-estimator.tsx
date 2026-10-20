"use client"

import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { estimateProgramAction, type Estimate } from "@/app/(site)/[locale]/corporate/estimate-action"
import { FormField } from "@/components/forms/form-field"
import { useCart } from "@/components/shop/cart-provider"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { formatMoney } from "@/lib/format"

export type ProgramOption = { id: number; name: string }

/** Live estimate. Every number comes from the server pricing function, never from this component. */
export function ProgramEstimator({ programs }: { programs: ProgramOption[] }) {
  const t = useTranslations("corporate")
  const locale = useLocale() as "en" | "ar"
  const { add, setOpen } = useCart()
  const [productId, setProductId] = useState(programs[0]?.id ?? 0)
  const [locations, setLocations] = useState(1)
  const [weeks, setWeeks] = useState(4)
  const [result, setResult] = useState<Estimate | null>(null)

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const r = await estimateProgramAction({ productId, locations, weeks, locale })
      if (!cancelled) setResult(r)
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [productId, locations, weeks, locale])

  const money = (n: number) => formatMoney(n, locale, { compact: true })
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="grid content-start gap-5 lg:col-span-5">
        <FormField id="est-program" label={t("estProgram")}>
          {(a) => (
            <NativeSelect {...a} value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="est-locations" label={t("estLocations")} hint={t("estLocationsHint")}>
            {(a) => (
              <NativeSelect {...a} value={locations} onChange={(e) => setLocations(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="est-weeks" label={t("estTerm")}>
            {(a) => (
              <NativeSelect {...a} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
                {[4, 8, 12].map((n) => (
                  <option key={n} value={n}>{t("estWeeks", { count: n })}</option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </div>
      </div>

      <div className="bg-surface p-6 lg:col-span-7 lg:p-8" style={{ borderRadius: "var(--radius)" }} aria-live="polite">
        {result?.ok ? (
          <>
            <p className="text-muted-foreground">{t("estDeliveries", { count: result.deliveries, price: money(result.perDeliveryMinor) })}</p>
            <p className="text-display tabular mt-2 !text-[clamp(2.25rem,1.5rem+3vw,3.5rem)]">{money(result.vatIncludedTotalMinor)}</p>
            <p className="text-sm text-muted-foreground">{t("estIncludesVat", { vat: money(result.vatMinor) })}</p>
            <dl className="mt-6 grid gap-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t("estDeposit")}</dt>
                <dd className="tabular">{money(result.depositMinor)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-2 font-medium">
                <dt>{t("estDueToday")}</dt>
                <dd className="tabular">{money(result.grandTotalMinor)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">{t("estDepositNote")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => {
                  add(result.productId, result.quantity)
                  setOpen(true)
                }}
              >
                {t("estAdd")}
              </Button>
              <Button size="lg" variant="outline" render={<a href="#quote" />}>
                {t("estQuote")}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">{t("estLoading")}</p>
        )}
      </div>
    </div>
  )
}
