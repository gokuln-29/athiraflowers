"use client"

import { Check, ShoppingBag } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/format"

import { useCart } from "./cart-provider"
import { QuantityStepper } from "./quantity-stepper"

export function AddToCart({
  productId, name, priceMinor, minQty, maxQty, inStock, depositMinor, pricingType,
}: {
  productId: number
  name: string
  priceMinor: number
  minQty: number
  maxQty: number
  inStock: boolean
  depositMinor: number
  pricingType: "one_time" | "subscription" | "rental"
}) {
  const t = useTranslations("cart")
  const tp = useTranslations("product")
  const locale = useLocale()
  const { add, setOpen } = useCart()
  const [qty, setQty] = useState(minQty)
  const [justAdded, setJustAdded] = useState(false)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <QuantityStepper value={qty} min={minQty} max={maxQty} onChange={setQty} label={pricingType === "subscription" ? tp("deliveriesLabel") : t("qtyFor", { name })} />
        {minQty > 1 && <p className="text-sm text-muted-foreground">{pricingType === "subscription" ? tp("minDeliveries", { min: minQty }) : t("minQtyHint", { min: minQty })}</p>}
      </div>
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{pricingType === "subscription" ? tp("programTotal", { qty }) : t("subtotal")}</dt>
          <dd className="tabular font-medium">{formatMoney(priceMinor * qty, locale, { compact: true })}</dd>
        </div>
        {depositMinor > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("deposit")}</dt>
            <dd className="tabular font-medium">{formatMoney(depositMinor * qty, locale, { compact: true })}</dd>
          </div>
        )}
      </dl>
      {depositMinor > 0 && <p className="text-sm text-muted-foreground">{t("depositHint")}</p>}
      <Button
        size="lg"
        className="w-full sm:w-auto sm:min-w-64"
        disabled={!inStock}
        onClick={() => {
          add(productId, qty)
          setJustAdded(true)
          setTimeout(() => setJustAdded(false), 1800)
          setOpen(true)
        }}
      >
        {justAdded ? <Check data-icon="inline-start" aria-hidden /> : <ShoppingBag data-icon="inline-start" aria-hidden />}
        {inStock ? (justAdded ? t("added") : t("add")) : tp("soldOut")}
      </Button>
    </div>
  )
}
