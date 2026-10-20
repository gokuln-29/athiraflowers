"use server"

import { redirect } from "next/navigation"

import { changePassword } from "@/server/auth/admin-auth"
import { authorize, AuthorizationError } from "@/server/auth/admin-session"

export async function changePasswordAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    const ctx = await authorize("dashboard:view")
    const result = await changePassword(ctx, { current: formData.get("current"), next: formData.get("next") })
    if (!result.ok) return { error: result.error }
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/admin/login")
    throw error
  }
  redirect("/admin")
}
