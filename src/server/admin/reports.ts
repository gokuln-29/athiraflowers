import "server-only"
import { and, between, desc, eq, sql } from "drizzle-orm"

import { db } from "@/db"
import { customers, leads, orderItems, orders } from "@/db/schema"

import { toCsv } from "./csv"

export const REPORTS = {
  orders: "Orders",
  sales_by_day: "Sales by day",
  sales_by_product: "Sales by product",
  vat_summary: "VAT summary",
  customers: "Customers",
  leads: "Leads",
} as const
export type ReportType = keyof typeof REPORTS

const aed = (n: number) => (n / 100).toFixed(2)
const day = (d: Date) => d.toISOString().slice(0, 10)

/** Dates are Dubai calendar days; created_at is stored UTC so we shift by +4h when bucketing. */
export async function buildReport(type: ReportType, from: string, to: string): Promise<string> {
  const start = new Date(`${from}T00:00:00+04:00`)
  const end = new Date(`${to}T23:59:59.999+04:00`)
  const inRange = between(orders.createdAt, start, end)
  const paidOrActive = sql`${orders.status} not in ('cancelled')`

  switch (type) {
    case "orders": {
      const rows = await db.select().from(orders).where(inRange).orderBy(desc(orders.createdAt)).limit(20000)
      return toCsv(
        ["Order", "Created (UTC)", "Delivery date", "Status", "Payment method", "Payment status", "Customer", "Email", "Company", "TRN", "PO", "Emirate", "Area", "Subtotal", "Discount", "Delivery", "Deposit", "VAT", "Total", "Coupon", "Invoice"],
        rows.map((o) => [o.orderNumber, o.createdAt, o.deliveryDate, o.status, o.paymentMethod, o.paymentStatus, o.contactName, o.contactEmail, o.companyName, o.companyTrn, o.poNumber, o.emirate, o.area, aed(o.subtotalMinor), aed(o.discountMinor), aed(o.deliveryFeeMinor), aed(o.depositMinor), aed(o.vatMinor), aed(o.totalMinor), o.couponCode, o.invoiceNumber])
      )
    }
    case "sales_by_day": {
      const rows = await db
        .select({ d: sql<string>`date(convert_tz(${orders.createdAt}, '+00:00', '+04:00'))`, n: sql<number>`count(*)`, gross: sql<number>`sum(${orders.totalMinor} - ${orders.depositMinor})`, vat: sql<number>`sum(${orders.vatMinor})`, dep: sql<number>`sum(${orders.depositMinor})` })
        .from(orders).where(and(inRange, paidOrActive)).groupBy(sql`1`).orderBy(sql`1`)
      return toCsv(["Date (Dubai)", "Orders", "Sales incl. VAT (excl. deposit)", "VAT included", "Deposits held"], rows.map((r) => [String(r.d).slice(0, 10), r.n, aed(Number(r.gross)), aed(Number(r.vat)), aed(Number(r.dep))]))
    }
    case "sales_by_product": {
      const rows = await db
        .select({ sku: orderItems.sku, title: orderItems.titleEn, qty: sql<number>`sum(${orderItems.quantity})`, revenue: sql<number>`sum(${orderItems.lineTotalMinor})`, orders: sql<number>`count(distinct ${orderItems.orderId})` })
        .from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(inRange, paidOrActive)).groupBy(orderItems.sku, orderItems.titleEn).orderBy(desc(sql`sum(${orderItems.lineTotalMinor})`))
      return toCsv(["SKU", "Product", "Units", "Orders", "Revenue incl. VAT"], rows.map((r) => [r.sku, r.title, r.qty, r.orders, aed(Number(r.revenue))]))
    }
    case "vat_summary": {
      const rows = await db
        .select({ m: sql<string>`date_format(convert_tz(${orders.createdAt}, '+00:00', '+04:00'), '%Y-%m')`, gross: sql<number>`sum(${orders.totalMinor} - ${orders.depositMinor})`, vat: sql<number>`sum(${orders.vatMinor})`, n: sql<number>`count(*)` })
        .from(orders).where(and(inRange, paidOrActive)).groupBy(sql`1`).orderBy(sql`1`)
      return toCsv(["Month", "Orders", "Taxable sales incl. VAT", "VAT (output tax)", "Taxable sales excl. VAT"], rows.map((r) => [r.m, r.n, aed(Number(r.gross)), aed(Number(r.vat)), aed(Number(r.gross) - Number(r.vat))]))
    }
    case "customers": {
      const rows = await db.select().from(customers).orderBy(desc(customers.createdAt)).limit(50000)
      return toCsv(["Joined", "Email", "Name", "Phone", "Company", "TRN", "Language", "Marketing consent"], rows.filter((c) => !c.erasedAt).map((c) => [c.createdAt, c.email, c.name, c.phone, c.companyName, c.companyTrn, c.preferredLocale, c.marketingConsent ? "yes" : "no"]))
    }
    case "leads": {
      const rows = await db.select().from(leads).where(between(leads.createdAt, start, end)).orderBy(desc(leads.createdAt)).limit(20000)
      return toCsv(["Received", "Type", "Stage", "Name", "Company", "Email", "Phone", "Estimated value", "Source", "Details"], rows.map((l) => [l.createdAt, l.type, l.status, l.name, l.company, l.email, l.phone, l.estimatedValueMinor ? aed(l.estimatedValueMinor) : "", l.sourcePath, JSON.stringify(l.details ?? {})]))
    }
  }
}
export { day }
