import { redirect } from "next/navigation"

import { AdminShell } from "@/components/admin/shell"
import { requirePage } from "@/server/auth/admin-guards"

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePage("dashboard:view")
  if (ctx.mustChangePassword) redirect("/admin/account/password?required=1")
  return <AdminShell admin={{ name: ctx.name, email: ctx.email, role: ctx.role }}>{children}</AdminShell>
}
