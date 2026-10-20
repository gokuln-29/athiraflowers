import { PageHeader } from "@/components/admin/shell"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const ctx = await requirePage("dashboard:view")
  return (
    <>
      <PageHeader title={`Good day, ${ctx.name.split(" ")[0]}`} description="The dashboard fills in as Phase 4 screens ship." />
    </>
  )
}
