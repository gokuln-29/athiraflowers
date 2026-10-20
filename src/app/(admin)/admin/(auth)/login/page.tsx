import { redirect } from "next/navigation"

import { LoginForm } from "@/components/admin/auth-forms"
import { getAdminContext } from "@/server/auth/admin-session"

export const metadata = { title: "Sign in" }

export default async function LoginPage() {
  const ctx = await getAdminContext()
  if (ctx?.mfaVerified) redirect("/admin")
  return <LoginForm />
}
