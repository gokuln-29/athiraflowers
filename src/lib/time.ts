import { site } from "@/config/site"

/** Business time is Asia/Dubai (UTC+4, no DST). Timestamps in the DB stay UTC. */
export type DubaiNow = { day: string; minutes: number; dow: number }

export function dubaiNow(now: Date = new Date()): DubaiNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: site.timezone,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  const hour = Number(get("hour")) % 24
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"))
  return { day: `${get("year")}-${get("month")}-${get("day")}`, minutes: hour * 60 + Number(get("minute")), dow }
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

/** YYYY-MM-DD + n days (calendar arithmetic, timezone-independent). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const dayOfWeek = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay()

export const isValidDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

/** Whole minutes from `now` (Dubai) to a given day and HH:MM in Dubai. */
export function minutesUntil(now: DubaiNow, day: string, hhmm: string): number {
  const dayDiff = (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${now.day}T00:00:00Z`)) / 86_400_000
  return dayDiff * 1440 + toMinutes(hhmm) - now.minutes
}
