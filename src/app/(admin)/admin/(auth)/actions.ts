"use server"

import { redirect } from "next/navigation"

import { attemptLogin, beginMfaEnrollment, confirmMfaEnrollment, verifyMfaCode } from "@/server/auth/admin-auth"
import { destroyAdminSession, getAdminContext } from "@/server/auth/admin-session"

export type FormState = { error?: string; recoveryCodes?: string[] } | undefined

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await attemptLogin({ email: formData.get("email"), password: formData.get("password") })
  if (!result.ok) return { error: result.error }
  redirect(result.next === "verify" ? "/admin/login/verify" : "/admin/account/mfa")
}

export async function verifyMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await verifyMfaCode(String(formData.get("code") ?? ""))
  if (!result.ok) return { error: result.error }
  redirect("/admin")
}

export async function confirmMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await confirmMfaEnrollment(String(formData.get("code") ?? ""))
  if (!result.ok) return { error: result.error }
  return { recoveryCodes: result.recoveryCodes }
}

export async function logoutAction() {
  const ctx = await getAdminContext()
  await destroyAdminSession()
  void ctx
  redirect("/admin/login")
}

/** Used by the enrolment page to obtain (or reuse) the pending secret. */
export async function pendingEnrollment() {
  return beginMfaEnrollment()
}
