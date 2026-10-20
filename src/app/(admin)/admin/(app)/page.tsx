import Link from "next/link"

import { RevenueChart } from "@/components/admin/revenue-chart"
import { PageHeader } from "@/components/admin/shell"
import { formatDate, formatMoney } from "@/lib/format"
import { requirePage } from "@/server/auth/admin-guards"
import { can } from "@/server/auth/permissions"
import { getDashboard } from "@/server/admin/dashboard"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const ctx = await requirePage("dashboard:view")
  const d = await getDashboard()
  const money = (n: number) => formatMoney(n, "en")
  const showMoney = can(ctx.role, "reports:read")
  const showLeads = can(ctx.role, "leads:read")
  const showOrders = can(ctx.role, "orders:read")
  return (
    <>
      <PageHeader title={`Good day, ${ctx.name.split(" ")[0]}`} description={formatDate(d.today, "en", { dateStyle: "full" })} />

      <div className="grid gap-6">
        {showOrders && (
          <section aria-labelledby="docket" className="panel p-4">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="docket" className="text-sm font-semibold">Today&apos;s deliveries <span className="num meta">{d.docket.length}</span></h2>
              {d.kpi.pending > 0 && <Link href="/admin/orders?status=pending&when=all" className="text-sm font-medium text-primary underline underline-offset-4">{d.kpi.pending} awaiting confirmation</Link>}
            </div>
            {d.docket.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing is scheduled for delivery today.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Slot</th><th className="py-1 font-medium">Order</th><th className="py-1 font-medium">Area</th><th className="py-1 font-medium">Status</th></tr></thead>
                  <tbody>
                    {d.docket.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="py-2">{o.slotLabel}</td>
                        <td className="py-2"><Link href={`/admin/orders/${o.id}`} className="num underline-offset-4 hover:underline">{o.orderNumber}</Link><span className="meta block">{o.contactName}</span></td>
                        <td className="py-2">{o.area ?? o.emirate}</td>
                        <td className="py-2 capitalize">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {showMoney && (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
              {[["Revenue today", money(d.kpi.todayRevenue)], ["Orders today", String(d.kpi.todayOrders)], ["Revenue, 30 days", money(d.kpi.revenue30)], ["Average order", money(d.kpi.aov30)]].map(([k, v]) => (
                <div key={k}><dt className="meta">{k}</dt><dd className="num text-2xl font-semibold">{v}</dd></div>
              ))}
            </dl>
            <section aria-labelledby="rev" className="panel p-4">
              <h2 id="rev" className="mb-2 text-sm font-semibold">Revenue, last 30 days</h2>
              <RevenueChart data={d.days} />
            </section>
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {showMoney && (
            <section aria-labelledby="top" className="panel p-4">
              <h2 id="top" className="mb-3 text-sm font-semibold">Top products, 30 days</h2>
              {d.top.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : (
                <ol className="divide-y text-sm">
                  {d.top.map((t) => <li key={t.title} className="flex items-baseline justify-between gap-3 py-2"><span>{t.title}<span className="meta block">{t.qty} sold</span></span><span className="num">{money(t.revenue)}</span></li>)}
                </ol>
              )}
            </section>
          )}
          {showLeads && (
            <section aria-labelledby="leads" className="panel p-4">
              <div className="mb-3 flex items-baseline justify-between"><h2 id="leads" className="text-sm font-semibold">New enquiries</h2><Link href="/admin/leads" className="text-sm text-primary underline underline-offset-4">All leads</Link></div>
              {d.newLeads.length === 0 ? <p className="text-sm text-muted-foreground">No new enquiries.</p> : (
                <ul className="divide-y text-sm">
                  {d.newLeads.map((l) => <li key={l.id} className="flex items-baseline justify-between gap-3 py-2"><span>{l.name}{l.company && <span className="meta block">{l.company}</span>}</span><span className="meta">{formatDate(l.createdAt.toISOString(), "en", { dateStyle: "medium" })}</span></li>)}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  )
}
