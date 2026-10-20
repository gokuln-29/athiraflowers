import "server-only"
import { and, eq, lt, lte } from "drizzle-orm"

import { db } from "@/db"
import { adminSessions, customerSessions, orders, otpCodes, stripeEvents } from "@/db/schema"
import { flushOutbox } from "@/server/email/outbox"
import { purgeAbandonedUploads } from "@/server/media/uploads"
import { cancelUnpaidOrder } from "@/server/orders/place"
import { purgeRateLimits } from "@/server/security/rate-limit"

const hours = (n: number) => new Date(Date.now() - n * 3_600_000)
const days = (n: number) => hours(n * 24)

export type MaintenanceReport = Record<string, number | string>

/**
 * Housekeeping, safe to run every few minutes (and concurrently: each step is idempotent).
 * Run by the systemd timer or cron entry in docs/DEPLOYMENT.md.
 */
export async function runMaintenance(): Promise<MaintenanceReport> {
  const report: MaintenanceReport = {}
  const step = async (name: string, fn: () => Promise<number | void>) => {
    try {
      const n = await fn()
      report[name] = n ?? 0
    } catch (e) {
      report[name] = `error: ${(e as Error).message}`
    }
  }

  // Retry any email the request-time flush missed (Brevo down, process restarted, etc.).
  await step("emails_sent", async () => {
    let sent = 0
    for (let i = 0; i < 10; i++) {
      const r = await flushOutbox(50)
      sent += r.sent
      if (r.sent + r.failed < 50) break
    }
    return sent
  })

  // Card orders that were never paid: Stripe sessions expire after ~30 minutes; give a 2 hour grace for late webhooks.
  await step("unpaid_card_orders_cancelled", async () => {
    const stale = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.status, "pending"), eq(orders.paymentMethod, "stripe"), eq(orders.paymentStatus, "unpaid"), lt(orders.createdAt, hours(2)))).limit(200)
    let n = 0
    for (const o of stale) if (await cancelUnpaidOrder(o.id, "Payment not completed in time")) n++
    return n
  })

  await step("otp_purged", async () => (await db.delete(otpCodes).where(lt(otpCodes.expiresAt, days(1))))[0].affectedRows)
  await step("admin_sessions_purged", async () => (await db.delete(adminSessions).where(lt(adminSessions.absoluteExpiresAt, new Date())))[0].affectedRows)
  await step("customer_sessions_purged", async () => (await db.delete(customerSessions).where(lt(customerSessions.expiresAt, new Date())))[0].affectedRows)
  await step("webhook_events_purged", async () => (await db.delete(stripeEvents).where(and(lte(stripeEvents.processedAt, days(90)), eq(stripeEvents.status, "processed"))))[0].affectedRows)
  await step("rate_limits_purged", async () => { await purgeRateLimits(86_400) })
  await step("abandoned_uploads_purged", () => purgeAbandonedUploads(60))
  return report
}
