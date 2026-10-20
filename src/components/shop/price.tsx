import { getTranslations } from "next-intl/server"

import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

type PriceProps = {
  locale: string
  priceMinor: number
  compareAtMinor?: number | null
  pricingType: "one_time" | "subscription" | "rental"
  billingInterval?: "week" | "month" | null
  rentalDays?: number | null
  className?: string
  size?: "sm" | "lg"
}

/** Price with its unit. Always shows what the number means (per delivery, rental period). */
export async function Price({ locale, priceMinor, compareAtMinor, pricingType, billingInterval, rentalDays, className, size = "sm" }: PriceProps) {
  const t = await getTranslations({ locale, namespace: "common" })
  const suffix =
    pricingType === "subscription" ? `${t("perDelivery")}${billingInterval ? `, ${billingInterval === "week" ? t("perWeek") : t("perMonth")}` : ""}`
    : pricingType === "rental" && rentalDays ? t("forDays", { days: rentalDays })
    : null
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("tabular font-medium", size === "lg" ? "text-2xl" : "text-base")}>{formatMoney(priceMinor, locale, { compact: true })}</span>
      {compareAtMinor ? <s className="tabular text-sm text-muted-foreground">{formatMoney(compareAtMinor, locale, { compact: true })}</s> : null}
      {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
    </p>
  )
}
