import { redirect } from "next/navigation"

import { VerifyForm } from "@/components/admin/auth-forms"
import { getAdminContext } from "@/server/auth/admin-session"

export const metadata = { title: "Verify" }

export default async function VerifyPage() {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/admin/login")
  if (ctx.mfaVerified) redirect("/admin")
  if (!ctx.mfaEnabled) redirect("/admin/account/mfa")
  return <VerifyForm />
}
