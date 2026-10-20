import { desc, eq } from "drizzle-orm"

import { LeadsBoard, type LeadCard } from "@/components/admin/leads-board"
import { PageHeader } from "@/components/admin/shell"
import { db } from "@/db"
import { adminUsers, leads } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"
import { can } from "@/server/auth/permissions"

export const metadata = { title: "Leads" }

export default async function LeadsPage() {
  const ctx = await requirePage("leads:read")
  const [rows, admins] = await Promise.all([
    db.select({ l: leads, who: adminUsers.name }).from(leads).leftJoin(adminUsers, eq(adminUsers.id, leads.assignedTo)).orderBy(desc(leads.position), desc(leads.createdAt)).limit(500),
    db.select({ id: adminUsers.id, name: adminUsers.name }).from(adminUsers).where(eq(adminUsers.status, "active")),
  ])
  const cards: LeadCard[] = rows.map(({ l, who }) => ({ id: l.id, name: l.name, company: l.company, type: l.type, status: l.status, createdAt: l.createdAt.toISOString(), valueMinor: l.estimatedValueMinor, assignee: who }))
  return (<><PageHeader title="Leads" description="Quote requests, event enquiries and messages. Drag a card to another column, or open it and change the stage." /><LeadsBoard leads={cards} admins={admins} canWrite={can(ctx.role, "leads:write")} /></>)
}
