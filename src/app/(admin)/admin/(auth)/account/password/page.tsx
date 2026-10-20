import { redirect } from "next/navigation"

import { PasswordForm } from "@/components/admin/password-form"
import { getAdminContext } from "@/server/auth/admin-session"

export const metadata = { title: "Password" }

export default async function PasswordPage({ searchParams }: PageProps<"/admin/account/password">) {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/admin/login")
  if (!ctx.mfaVerified) redirect(ctx.mfaEnabled ? "/admin/login/verify" : "/admin/account/mfa")
  const sp = await searchParams
  return <PasswordForm forced={sp.required === "1"} />
}
