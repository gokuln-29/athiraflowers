import { PageHeader } from "@/components/admin/shell"
import { Button } from "@/components/ui/button"
import { addDays, dubaiNow } from "@/lib/time"
import { requirePage } from "@/server/auth/admin-guards"
import { REPORTS } from "@/server/admin/reports"

export const metadata = { title: "Reports" }

const BLURB: Record<keyof typeof REPORTS, string> = {
  orders: "Every order in the range with totals, VAT, TRN and invoice number.",
  sales_by_day: "Orders and sales per Dubai calendar day, with VAT and deposits held.",
  sales_by_product: "Units and revenue per product.",
  vat_summary: "Monthly taxable sales and output VAT, for your accountant.",
  customers: "Customers who have not been erased, with marketing consent.",
  leads: "Quote requests, event enquiries and messages in the range.",
}

export default async function ReportsPage() {
  await requirePage("reports:read")
  const today = dubaiNow().day
  return (
    <>
      <PageHeader title="Reports" description="Download CSV files. Dates are Dubai calendar days. Cancelled orders are excluded from sales totals." />
      <form action="/api/admin/reports/orders" method="get" className="panel mb-6 flex flex-wrap items-end gap-3 p-4" id="range">
        <label className="grid gap-1 text-sm font-medium">From<input type="date" name="from" defaultValue={addDays(today, -30)} className="h-9 rounded-md border border-input bg-card px-2" /></label>
        <label className="grid gap-1 text-sm font-medium">To<input type="date" name="to" defaultValue={today} className="h-9 rounded-md border border-input bg-card px-2" /></label>
        <p className="meta pb-2">Pick a range, then choose a report below.</p>
      </form>
      <ul className="grid gap-3 md:grid-cols-2">
        {(Object.keys(REPORTS) as (keyof typeof REPORTS)[]).map((k) => (
          <li key={k} className="panel p-4">
            <h2 className="font-semibold">{REPORTS[k]}</h2>
            <p className="meta mt-1 mb-3">{BLURB[k]}</p>
            <Button type="submit" form="range" formAction={`/api/admin/reports/${k}`} variant="outline" size="sm">Download CSV</Button>
          </li>
        ))}
      </ul>
    </>
  )
}
