"use client"

import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState, useTransition } from "react"

import { requestCodeAction, verifyCodeAction } from "@/app/(site)/[locale]/account/actions"
import { FormField } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

/** Two-step email code sign-in. No passwords for customers. */
export function LoginPanel({ next = "/account" }: { next?: string }) {
  const t = useTranslations("account")
  const locale = useLocale() as "en" | "ar"
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const errorText = (r: { error: string; retryAfterSeconds?: number }) =>
    t(`login.errors.${r.error}` as "login.errors.invalid_input", { seconds: r.retryAfterSeconds ?? 30 })

  function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    start(async () => {
      const r = await requestCodeAction({ email, locale })
      if (r.ok) {
        setStep("code")
        setCooldown(30)
      } else setError(errorText(r))
    })
  }

  function verify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const r = await verifyCodeAction({ email, code })
      if (r.ok) window.location.assign(`/${locale}${next}`)
      else setError(errorText(r))
    })
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} noValidate className="grid gap-5">
        <FormField id="login-email" label={t("login.email")} error={error ?? undefined} hint={t("login.emailHint")}>
          {(a) => <Input {...a} type="email" name="email" autoComplete="email" inputMode="email" spellCheck={false} required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />}
        </FormField>
        <Button type="submit" size="lg" disabled={pending || !email}>
          {pending && <Spinner data-icon="inline-start" />}
          {t("login.sendCode")}
        </Button>
      </form>
    )
  }
  return (
    <form onSubmit={verify} noValidate className="grid gap-5">
      <p>{t("login.sentTo", { email })}</p>
      <FormField id="login-code" label={t("login.code")} error={error ?? undefined} hint={t("login.codeHint")}>
        {(a) => <Input {...a} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} required autoFocus dir="ltr" className="text-start text-xl tracking-[0.4em] tabular" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />}
      </FormField>
      <Button type="submit" size="lg" disabled={pending || code.length !== 6}>
        {pending && <Spinner data-icon="inline-start" />}
        {t("login.verify")}
      </Button>
      <div className="flex flex-wrap gap-4 text-sm">
        <button type="button" className="min-h-11 text-primary underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline" disabled={cooldown > 0 || pending} onClick={() => sendCode()}>
          {cooldown > 0 ? t("login.resendIn", { seconds: cooldown }) : t("login.resend")}
        </button>
        <button type="button" className="min-h-11 text-primary underline underline-offset-4" onClick={() => { setStep("email"); setCode(""); setError(null) }}>{t("login.changeEmail")}</button>
      </div>
    </form>
  )
}
