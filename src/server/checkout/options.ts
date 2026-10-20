import "server-only"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { deliverySlots } from "@/db/schema"
import { getAvailability, type DayAvailability } from "@/server/delivery/availability"
import { quoteCart, quoteInputSchema, type Quote } from "@/server/cart/quote"
import { getSettings } from "@/server/queries/content"
import { stripeConfigured } from "@/server/payments/stripe"

export const optionsInputSchema = quoteInputSchema.extend({ slotId: z.number().int().positive().nullish(), withAvailability: z.boolean().default(true) })

export type SlotView = { id: number; label: string; startTime: string; endTime: string; extraFeeMinor: number; available: boolean; reason?: string; remaining: number }
export type DayView = { day: string; blackout: boolean; anyAvailable: boolean; slots: SlotView[] }
export type CheckoutOptions = {
  quote: Quote
  days: DayView[]
  payment: { stripe: boolean; cod: boolean; codMaxMinor: number }
}

const toView = (d: DayAvailability, locale: string): DayView => ({
  day: d.day,
  blackout: d.blackout,
  anyAvailable: d.anyAvailable,
  slots: d.slots.map((s) => ({
    id: s.slot.id,
    label: locale === "ar" && s.slot.labelAr ? s.slot.labelAr : s.slot.labelEn,
    startTime: s.slot.startTime,
    endTime: s.slot.endTime,
    extraFeeMinor: s.slot.extraFeeMinor,
    available: s.available,
    reason: s.reason,
    remaining: s.remaining,
  })),
})

/** The quote for the current cart + zone + slot, plus live delivery availability. */
export async function getCheckoutOptions(raw: unknown): Promise<CheckoutOptions> {
  const input = optionsInputSchema.parse(raw)
  let slotFee = 0
  if (input.slotId) {
    const [slot] = await db.select().from(deliverySlots).where(and(eq(deliverySlots.id, input.slotId), eq(deliverySlots.isActive, true))).limit(1)
    slotFee = slot?.extraFeeMinor ?? 0
  }
  const quote = await quoteCart(input, { slotFeeMinor: slotFee })
  const settings = await getSettings()
  const checkout = settings.checkout
  let days: DayView[] = []
  if (input.withAvailability && quote.zone) {
    const avail = await getAvailability({ cart: quote.cart, zone: { emirate: quote.zone.emirate, sameDayAvailable: quote.zone.sameDayAvailable }, days: 20 })
    days = avail.map((d) => toView(d, input.locale))
  }
  return { quote, days, payment: { stripe: checkout.stripeEnabled && stripeConfigured(), cod: checkout.codEnabled, codMaxMinor: checkout.codMaxMinor } }
}
