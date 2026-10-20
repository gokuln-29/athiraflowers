"use client"

import { SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

const SORTS = ["featured", "price-asc", "price-desc", "newest"] as const
const TYPES = ["one_time", "subscription", "rental"] as const

/** URL is the state: every control writes search params and the server re-renders the list. */
export function ShopFilters({ total }: { total: number }) {
  const t = useTranslations("shop")
  const tc = useTranslations("common")
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const types = params.getAll("type")
  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString())
    mutate(next)
    next.delete("page")
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }))
  }
  const active = ["q", "min", "max", "type", "stock"].some((k) => params.has(k))

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-muted-foreground">
          {t("results", { count: total })}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("sortBy")}</span>
            <select
              className="h-11 border border-input bg-surface px-3 text-base"
              style={{ borderRadius: "var(--radius)" }}
              value={params.get("sort") ?? "featured"}
              onChange={(e) => update((p) => (e.target.value === "featured" ? p.delete("sort") : p.set("sort", e.target.value)))}
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`sort.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="shop-filters" className="h-11">
            <SlidersHorizontal aria-hidden />
            {t("filters")}
            {active ? <span className="size-2 rounded-full bg-primary" aria-label={t("filtersActive")} /> : null}
          </Button>
        </div>
      </div>

      <div id="shop-filters" hidden={!open} className={cn("mt-4 grid gap-6 bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4", pending && "opacity-60")} style={{ borderRadius: "var(--radius)" }}>
        <fieldset>
          <legend className="mb-2 font-medium">{t("priceRange")}</legend>
          <div className="flex items-center gap-2">
            {(["min", "max"] as const).map((k) => (
              <label key={k} className="flex-1">
                <span className="sr-only">{t(k === "min" ? "minPrice" : "maxPrice")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder={t(k === "min" ? "minPrice" : "maxPrice")}
                  defaultValue={params.get(k) ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.replace(/\D/g, "")
                    if ((params.get(k) ?? "") !== v) update((p) => (v ? p.set(k, v) : p.delete(k)))
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="tabular h-11 w-full border border-input bg-background px-3"
                  style={{ borderRadius: "var(--radius)" }}
                />
              </label>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">AED</p>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-medium">{t("buyingOptions")}</legend>
          {TYPES.map((ty) => (
            <label key={ty} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={types.includes(ty)} onChange={(e) => update((p) => { p.delete("type"); const next = e.target.checked ? [...types, ty] : types.filter((x) => x !== ty); next.forEach((x) => p.append("type", x)) })} />
              {tc(`pricingTypes.${ty}`)}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-medium">{t("availability")}</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={params.get("stock") === "1"} onChange={(e) => update((p) => (e.target.checked ? p.set("stock", "1") : p.delete("stock")))} />
            {t("inStockOnly")}
          </label>
        </fieldset>
        <div className="flex items-end">
          {active && (
            <Button variant="ghost" onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}>
              {t("clearFilters")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
