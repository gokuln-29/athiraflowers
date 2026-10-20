import { asc } from "drizzle-orm"

import { PageHeader } from "@/components/admin/shell"
import { StaffManager } from "@/components/admin/staff-manager"
import { db } from "@/db"
import { adminUsers } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Staff and roles" }

export default async function StaffPage() {
  const ctx = await requirePage("staff:write")
  const rows = await db.select().from(adminUsers).orderBy(asc(adminUsers.id))
  return (
    <>
      <PageHeader title="Staff and roles" description="Owners can do everything. Managers run the catalogue, offers, blog, content and reports. Staff handle orders, leads and customers." />
      <StaffManager rows={rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, mfa: !!u.mfaEnabledAt, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, isMe: u.id === ctx.adminId }))} />
    </>
  )
}
