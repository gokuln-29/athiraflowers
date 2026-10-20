import { and, desc, like, eq, type SQL } from "drizzle-orm"

import { PageHeader } from "@/components/admin/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db } from "@/db"
import { auditLog } from "@/db/schema"
import { formatDate } from "@/lib/format"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Audit log" }
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requirePage("audit:read")
  const sp = await searchParams
  const action = one(sp.action)?.slice(0, 60)
  const actor = one(sp.actor)
  const page = Math.max(1, Number(one(sp.page)) || 1)
  const where: SQL[] = []
  if (action) where.push(like(auditLog.action, `%${action.replace(/[%_\\]/g, "\\$&")}%`))
  if (actor && ["admin", "customer", "system", "webhook"].includes(actor)) where.push(eq(auditLog.actorType, actor as "admin"))
  const rows = await db.select().from(auditLog).where(and(...where)).orderBy(desc(auditLog.id)).limit(100).offset((page - 1) * 100)
  return (
    <>
      <PageHeader title="Audit log" description="Admin changes, sign-ins, payments and uploads. Secrets and payment data are never recorded." />
      <form action="/admin/audit" className="mb-4 flex flex-wrap gap-2">
        <Input name="action" defaultValue={action} placeholder="Action, e.g. order.status" aria-label="Filter by action" className="max-w-xs" />
        <select name="actor" defaultValue={actor ?? ""} aria-label="Actor type" className="h-9 rounded-md border border-input bg-card px-2 text-sm"><option value="">Anyone</option><option value="admin">Staff</option><option value="customer">Customers</option><option value="webhook">Webhooks</option><option value="system">System</option></select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>
      <div className="panel relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">When</th><th className="px-3 py-2 font-medium">Who</th><th className="px-3 py-2 font-medium">Action</th><th className="px-3 py-2 font-medium">Record</th><th className="px-3 py-2 font-medium">Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="num px-3 py-2 whitespace-nowrap">{formatDate(r.createdAt, "en", { dateStyle: "short", timeStyle: "medium" })}</td>
                <td className="px-3 py-2">{r.actorLabel ?? r.actorType}{r.actorId ? <span className="meta num"> #{r.actorId}</span> : null}</td>
                <td className="num px-3 py-2">{r.action}</td>
                <td className="num px-3 py-2">{r.entity ? `${r.entity} ${r.entityId ?? ""}` : ""}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.meta ? JSON.stringify(r.meta) : ""}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">Nothing recorded for this filter.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        {page > 1 && <Button render={<a href={`/admin/audit?page=${page - 1}${action ? `&action=${encodeURIComponent(action)}` : ""}${actor ? `&actor=${actor}` : ""}`} />} variant="outline" size="sm">Newer</Button>}
        {rows.length === 100 && <Button render={<a href={`/admin/audit?page=${page + 1}${action ? `&action=${encodeURIComponent(action)}` : ""}${actor ? `&actor=${actor}` : ""}`} />} variant="outline" size="sm">Older</Button>}
      </div>
    </>
  )
}
