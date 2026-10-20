import Link from "next/link"

import { PageHeader } from "@/components/admin/shell"
import { OrderStatusBadge } from "@/components/shop/order-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema"
import { formatDay, formatMoney } from "@/lib/format"
import { requirePage } from "@/server/auth/admin-guards"
import { listOrders, orderCountsByStatus, type OrderFilters } from "@/server/admin/orders-queries"
import { STATUS_LABEL } from "@/server/orders/state"

export const metadata = { title: "Orders" }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requirePage("orders:read")
  const sp = await searchParams
  const status = (one(sp.status) ?? "open") as OrderFilters["status"]
  const when = (one(sp.when) ?? (status === "open" ? "upcoming" : "all")) as "upcoming" | "all"
  const filters: OrderFilters = { status, q: one(sp.q)?.slice(0, 80), pay: one(sp.pay), when, page: Number(one(sp.page)) || 1 }
  const [{ rows, total, page, pages }, counts] = await Promise.all([listOrders(filters), orderCountsByStatus()])
  const open = (counts.pending ?? 0) + (counts.confirmed ?? 0) + (counts.preparing ?? 0) + (counts.dispatched ?? 0)

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { status: String(status), when, q: filters.q, pay: filters.pay, ...over }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    return `/admin/orders?${p}`
  }
  // Group by delivery date: a delivery docket is the unit of work.
  const groups = new Map<string, typeof rows>()
  for (const r of rows) groups.set(r.deliveryDate, [...(groups.get(r.deliveryDate) ?? []), r])
  const tab = "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm hover:bg-muted"

  return (
    <>
      <PageHeader title="Orders" description="Grouped by delivery day, the way the studio works." />
      <div className="mb-4 flex flex-wrap items-center gap-1">
        <Link href={href({ status: "open", when: "upcoming", page: undefined })} className={`${tab} ${status === "open" ? "bg-muted font-medium" : ""}`}>Open <span className="num meta">{open}</span></Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, when: "all", page: undefined })} className={`${tab} ${status === s ? "bg-muted font-medium" : ""}`}>
            {STATUS_LABEL[s]} <span className="num meta">{counts[s as OrderStatus] ?? 0}</span>
          </Link>
        ))}
        <Link href={href({ status: "all", when: "all", page: undefined })} className={`${tab} ${status === "all" ? "bg-muted font-medium" : ""}`}>All</Link>
      </div>
      <form action="/admin/orders" className="mb-6 flex flex-wrap items-center gap-2">
        <input type="hidden" name="status" value={String(status)} />
        <input type="hidden" name="when" value={when} />
        <Input name="q" defaultValue={filters.q} placeholder="Search order number, name, email, phone, company" aria-label="Search orders" className="max-w-sm" />
        <select name="pay" defaultValue={filters.pay ?? ""} aria-label="Payment filter" className="h-9 rounded-md border border-input bg-card px-2 text-sm">
          <option value="">Any payment</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="cod">Cash on delivery</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>

      {rows.length === 0 ? (
        <div className="panel grid place-items-center gap-1 py-16 text-center">
          <p className="font-medium">No orders match</p>
          <p className="meta">Try another status or clear the search.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {[...groups.entries()].map(([day, list]) => (
            <section key={day} aria-label={formatDay(day, "en")}>
              <h2 className="mb-2 flex items-baseline gap-3 text-sm font-semibold">
                {formatDay(day, "en")}
                <span className="meta num font-normal">{list.length} {list.length === 1 ? "order" : "orders"} · {formatMoney(list.reduce((n, o) => n + o.totalMinor, 0), "en", { compact: true })}</span>
              </h2>
              <div className="panel overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr><th className="px-3 py-2 font-medium">Window</th><th className="px-3 py-2 font-medium">Order</th><th className="px-3 py-2 font-medium">Customer</th><th className="px-3 py-2 font-medium">Area</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Payment</th><th className="px-3 py-2 text-right font-medium">Total</th></tr>
                  </thead>
                  <tbody>
                    {list.map((o) => (
                      <tr key={o.id} className="border-t hover:bg-muted/40">
                        <td className="px-3 py-2 whitespace-nowrap">{o.slotLabel.split(",")[0]}</td>
                        <td className="px-3 py-2"><Link href={`/admin/orders/${o.id}`} className="num font-medium text-primary underline-offset-4 hover:underline">{o.orderNumber}</Link></td>
                        <td className="px-3 py-2">{o.contactName}{o.companyName ? <span className="meta block">{o.companyName}</span> : null}</td>
                        <td className="px-3 py-2">{o.area}<span className="meta block">{o.zoneName}</span></td>
                        <td className="px-3 py-2"><OrderStatusBadge status={o.status} label={STATUS_LABEL[o.status]} /></td>
                        <td className="px-3 py-2 whitespace-nowrap">{o.paymentMethod === "cod" ? "Cash" : "Card"} · {o.paymentStatus}</td>
                        <td className="num px-3 py-2 text-right">{formatMoney(o.totalMinor, "en")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
      <p className="meta mt-6">{total} orders · page {page} of {pages}</p>
      {pages > 1 && (
        <div className="mt-2 flex gap-2">
          {page > 1 && <Button render={<Link href={href({ page: String(page - 1) })} />} variant="outline" size="sm">Previous</Button>}
          {page < pages && <Button render={<Link href={href({ page: String(page + 1) })} />} variant="outline" size="sm">Next</Button>}
        </div>
      )}
    </>
  )
}
