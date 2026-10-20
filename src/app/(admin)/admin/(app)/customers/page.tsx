import Link from "next/link"
import { desc, like, or, sql } from "drizzle-orm"

import { PageHeader } from "@/components/admin/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db } from "@/db"
import { customers } from "@/db/schema"
import { formatDate, formatMoney } from "@/lib/format"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Customers" }

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requirePage("customers:read")
  const sp = await searchParams
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.slice(0, 80)
  const l = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : null
  const rows = await db
    .select({
      c: customers,
      orders: sql<number>`(select count(*) from orders o where o.customer_id = customers.id or o.contact_email = customers.email)`,
      spent: sql<number>`(select coalesce(sum(total_minor),0) from orders o where (o.customer_id = customers.id or o.contact_email = customers.email) and o.payment_status = 'paid')`,
    })
    .from(customers)
    .where(l ? or(like(customers.email, l), like(customers.name, l), like(customers.companyName, l), like(customers.phone, l)) : undefined)
    .orderBy(desc(customers.createdAt))
    .limit(200)
  return (
    <>
      <PageHeader title="Customers" description="Customers sign in with an email code; guest buyers appear in Orders." actions={<Button render={/* file download, not a page */ /* eslint-disable-next-line @next/next/no-html-link-for-pages */ <a href="/api/admin/reports/customers" download />} variant="outline" size="sm">Export CSV</Button>} />
      <form action="/admin/customers" className="mb-4 flex gap-2"><Input name="q" defaultValue={q} placeholder="Search email, name, company or phone" aria-label="Search customers" className="max-w-sm" /><Button type="submit" variant="outline" size="sm">Search</Button></form>
      <div className="panel relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Customer</th><th className="px-3 py-2 font-medium">Company</th><th className="px-3 py-2 text-right font-medium">Orders</th><th className="px-3 py-2 text-right font-medium">Paid total</th><th className="px-3 py-2 font-medium">Joined</th><th className="px-3 py-2 font-medium">Marketing</th></tr></thead>
          <tbody>
            {rows.map(({ c, orders, spent }) => (
              <tr key={c.id} className="border-t hover:bg-muted/40">
                <td className="px-3 py-2"><Link href={`/admin/customers/${c.id}`} className="font-medium text-primary underline-offset-4 hover:underline">{c.erasedAt ? "Erased customer" : c.name || c.email}</Link>{!c.erasedAt && c.name && <span className="meta block">{c.email}</span>}</td>
                <td className="px-3 py-2">{c.companyName ?? ""}</td>
                <td className="num px-3 py-2 text-right">{Number(orders)}</td>
                <td className="num px-3 py-2 text-right">{formatMoney(Number(spent), "en", { compact: true })}</td>
                <td className="px-3 py-2">{formatDate(c.createdAt, "en", { dateStyle: "medium" })}</td>
                <td className="px-3 py-2">{c.marketingConsent ? "Opted in" : "No"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
