import "server-only"
import { and, eq, inArray, ne, sql } from "drizzle-orm"

import { db } from "@/db"
import { deliveryBlackouts, deliverySlots, orders } from "@/db/schema"
import { addDays, dayOfWeek, dubaiNow, minutesUntil, toMinutes, type DubaiNow } from "@/lib/time"

export type SlotRow = typeof deliverySlots.$inferSelect

export type Unavailable = "blackout" | "weekday" | "past" | "cutoff" | "lead_time" | "full" | "same_day_not_allowed"

export type SlotAvailability = { slot: SlotRow; available: boolean; reason?: Unavailable; remaining: number }
export type DayAvailability = { day: string; blackout: boolean; slots: SlotAvailability[]; anyAvailable: boolean }

export type CartConstraints = {
  /** Largest lead time (hours) among items in the cart. */
  maxLeadHours: number
  /** False if any item cannot be delivered same day. */
  sameDayOk: boolean
}

export type ZoneConstraints = { emirate: "dubai" | "abu_dhabi" | "sharjah"; sameDayAvailable: boolean }

/** Pure rule for one slot on one day. Exported for unit tests. */
export function slotRule(input: {
  now: DubaiNow
  day: string
  slot: Pick<SlotRow, "startTime" | "sameDayCutoff" | "daysMask">
  cart: CartConstraints
  zone: ZoneConstraints
  blackout: boolean
  booked: number
  capacity: number
}): { available: boolean; reason?: Unavailable } {
  const { now, day, slot, cart, zone, blackout, booked, capacity } = input
  if (day < now.day) return { available: false, reason: "past" }
  if (blackout) return { available: false, reason: "blackout" }
  if (!((slot.daysMask >> dayOfWeek(day)) & 1)) return { available: false, reason: "weekday" }
  if (booked >= capacity) return { available: false, reason: "full" }
  const minsToStart = minutesUntil(now, day, slot.startTime)
  if (day === now.day) {
    if (!zone.sameDayAvailable || !cart.sameDayOk || !slot.sameDayCutoff) return { available: false, reason: "same_day_not_allowed" }
    if (now.minutes >= toMinutes(slot.sameDayCutoff)) return { available: false, reason: "cutoff" }
  }
  if (minsToStart < cart.maxLeadHours * 60) return { available: false, reason: "lead_time" }
  if (minsToStart <= 0) return { available: false, reason: "cutoff" }
  return { available: true }
}

/** Availability for the next `days` days. Used for the checkout picker AND to re-validate at order time. */
export async function getAvailability(opts: { cart: CartConstraints; zone: ZoneConstraints; days?: number; now?: Date }): Promise<DayAvailability[]> {
  const now = dubaiNow(opts.now)
  const days = opts.days ?? 21
  const from = now.day
  const to = addDays(from, days)

  const slots = await db.select().from(deliverySlots).where(eq(deliverySlots.isActive, true)).orderBy(deliverySlots.sort, deliverySlots.startTime)
  const blackoutRows = await db.select().from(deliveryBlackouts).where(sql`${deliveryBlackouts.day} between ${from} and ${to}`)
  const blackoutDays = new Set(blackoutRows.filter((b) => !b.emirate || b.emirate === opts.zone.emirate).map((b) => b.day))

  const counts = await db
    .select({ day: orders.deliveryDate, slotId: orders.slotId, n: sql<number>`count(*)` })
    .from(orders)
    .where(and(sql`${orders.deliveryDate} between ${from} and ${to}`, ne(orders.status, "cancelled"), ne(orders.status, "refunded"), inArray(orders.slotId, slots.map((s) => s.id).concat([0]))))
    .groupBy(orders.deliveryDate, orders.slotId)
  const booked = new Map(counts.map((c) => [`${c.day}|${c.slotId}`, Number(c.n)]))

  const result: DayAvailability[] = []
  for (let i = 0; i <= days; i++) {
    const day = addDays(from, i)
    const blackout = blackoutDays.has(day)
    const list: SlotAvailability[] = slots.map((slot) => {
      const used = booked.get(`${day}|${slot.id}`) ?? 0
      const rule = slotRule({ now, day, slot, cart: opts.cart, zone: opts.zone, blackout, booked: used, capacity: slot.capacityPerDay })
      return { slot, available: rule.available, reason: rule.reason, remaining: Math.max(0, slot.capacityPerDay - used) }
    })
    result.push({ day, blackout, slots: list, anyAvailable: list.some((s) => s.available) })
  }
  return result
}
