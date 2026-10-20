import { redirect } from "next/navigation"

import { MfaEnrollForm } from "@/components/admin/auth-forms"
import { getAdminContext } from "@/server/auth/admin-session"
import { beginMfaEnrollment } from "@/server/auth/admin-auth"
import { enrollmentQr } from "@/server/auth/mfa"

export const metadata = { title: "Two-step verification" }

export default async function MfaSetupPage() {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/admin/login")
  if (ctx.mfaEnabled) redirect(ctx.mfaVerified ? "/admin" : "/admin/login/verify")
  const begin = await beginMfaEnrollment()
  if (!begin.ok) redirect("/admin/login")
  const { qrDataUrl } = await enrollmentQr(begin.secret, begin.email)
  return <MfaEnrollForm qrDataUrl={qrDataUrl} secret={begin.secret} />
}
