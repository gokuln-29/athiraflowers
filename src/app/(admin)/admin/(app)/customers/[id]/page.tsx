import Link from "next/link"
import { desc, eq, or } from "drizzle-orm"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/admin/shell"
import { OrderStatusBadge } from "@/components/shop/order-status-badge"
import { db } from "@/db"
import { customerAddresses, customers, orders } from "@/db/schema"
import { formatDate, formatMoney } from "@/lib/format"
import { requirePage } from "@/server/auth/admin-guards"
import { STATUS_LABEL } from "@/server/orders/state"

export const metadata = { title: "Customer" }

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requirePage("customers:read")
  const { id } = await params
  const cid = Number(id)
  if (!Number.isInteger(cid)) notFound()
  const [c] = await db.select().from(customers).where(eq(customers.id, cid)).limit(1)
  if (!c) notFound()
  const [list, addrs] = await Promise.all([
    db.select().from(orders).where(or(eq(orders.customerId, cid), eq(orders.contactEmail, c.email))).orderBy(desc(orders.createdAt)).limit(100),
    db.select().from(customerAddresses).where(eq(customerAddresses.customerId, cid)),
  ])
  return (
    <>
      <PageHeader title={c.erasedAt ? "Erased customer" : c.name || c.email} description={c.erasedAt ? "Personal data was erased at the customer's request. Order records are kept for tax purposes." : c.email} actions={<Link href="/admin/customers" className="text-sm text-primary underline-offset-4 hover:underline">All customers</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel p-4 text-sm lg:col-span-1">
          <h2 className="mb-2 font-semibold">Details</h2>
          <dl className="grid gap-1">
            <div className="flex justify-between"><dt className="meta">Phone</dt><dd className="num" dir="ltr">{c.phone ?? "-"}</dd></div>
            <div className="flex justify-between"><dt className="meta">Company</dt><dd>{c.companyName ?? "-"}</dd></div>
            <div className="flex justify-between"><dt className="meta">TRN</dt><dd className="num">{c.companyTrn ?? "-"}</dd></div>
            <div className="flex justify-between"><dt className="meta">Language</dt><dd>{c.preferredLocale === "ar" ? "Arabic" : "English"}</dd></div>
            <div className="flex justify-between"><dt className="meta">Marketing</dt><dd>{c.marketingConsent ? "Opted in" : "No"}</dd></div>
            <div className="flex justify-between"><dt className="meta">Last sign-in</dt><dd>{c.lastLoginAt ? formatDate(c.lastLoginAt, "en", { dateStyle: "medium" }) : "-"}</dd></div>
          </dl>
          {addrs.length > 0 && <><h2 className="mt-4 mb-2 font-semibold">Saved addresses</h2><ul className="grid gap-2">{addrs.map((a) => <li key={a.id} className="text-muted-foreground">{a.label}: {a.building}, {a.area}</li>)}</ul></>}
        </section>
        <section className="panel p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Orders</h2>
          <table className="w-full text-sm"><tbody>
            {list.map((o) => (
              <tr key={o.id} className="border-t"><td className="py-2"><Link href={`/admin/orders/${o.id}`} className="num font-medium text-primary underline-offset-4 hover:underline">{o.orderNumber}</Link></td><td className="py-2">{formatDate(o.createdAt, "en", { dateStyle: "medium" })}</td><td className="py-2"><OrderStatusBadge status={o.status} label={STATUS_LABEL[o.status]} /></td><td className="num py-2 text-right">{formatMoney(o.totalMinor, "en")}</td></tr>
            ))}
            {list.length === 0 && <tr><td className="py-6 text-center text-muted-foreground">No orders.</td></tr>}
          </tbody></table>
        </section>
      </div>
    </>
  )
}
