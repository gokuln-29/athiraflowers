"use client"

import { Check } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useRef, useState, useTransition } from "react"

import { submitLeadAction } from "@/app/(site)/[locale]/lead-action"
import { FormField } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Link } from "@/i18n/navigation"

type LeadType = "corporate_quote" | "event" | "contact"

const OPTIONS = {
  need: ["program", "gifting", "both", "other"],
  frequency: ["weekly", "monthly", "one_off", "unsure"],
  emirate: ["dubai", "abu_dhabi", "sharjah", "other"],
  eventType: ["wedding", "corporate", "launch", "dinner", "conference", "private", "other"],
  budget: ["under_5k", "5k_15k", "15k_50k", "over_50k", "unsure"],
} as const

export function LeadForm({ type, sourcePath, defaultMessage = "" }: { type: LeadType; sourcePath: string; defaultMessage?: string }) {
  const t = useTranslations("forms")
  const locale = useLocale() as "en" | "ar"
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [status, setStatus] = useState<"idle" | "sent" | "failed" | "limited">("idle")
  const startedAt = useRef(0)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])
  const formRef = useRef<HTMLFormElement>(null)

  const err = (k: string) => (errors[k]?.[0] ? t(`errors.${k}` as "errors.name", { default: t("errors.generic") }) : undefined)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data: Record<string, unknown> = { type, locale, sourcePath, startedAt: startedAt.current }
    fd.forEach((v, k) => {
      data[k] = typeof v === "string" ? v : ""
    })
    data.consent = fd.get("consent") === "on" ? true : undefined
    if (type === "event") data.consultation = fd.get("consultation") === "on"
    startTransition(async () => {
      const res = await submitLeadAction(data)
      if (res.ok) {
        setStatus("sent")
        setErrors({})
        return
      }
      setStatus(res.error === "rate_limited" ? "limited" : res.error === "failed" ? "failed" : "idle")
      setErrors(res.fieldErrors ?? {})
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    })
  }

  if (status === "sent") {
    return (
      <div role="status" className="grid gap-4 bg-surface p-8" style={{ borderRadius: "var(--radius)" }}>
        <span className="grid size-10 place-items-center bg-success text-white" style={{ borderRadius: "999px" }}>
          <Check className="size-5" aria-hidden />
        </span>
        <h3 className="text-h2">{t("sentTitle")}</h3>
        <p className="max-w-[48ch] text-muted-foreground">{t(`sentBody.${type}` as "sentBody.contact")}</p>
        <div>
          <Button variant="outline" onClick={() => { setStatus("idle"); startedAt.current = Date.now() }}>
            {t("sendAnother")}
          </Button>
        </div>
      </div>
    )
  }

  const opt = (group: keyof typeof OPTIONS) =>
    OPTIONS[group].map((v) => (
      <option key={v} value={v}>
        {t(`options.${group}.${v}` as "options.need.program")}
      </option>
    ))
  const id = (n: string) => `${type}-${n}`

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-5">
      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id={id("name")} label={t("name")} error={err("name")}>
          {(a) => <Input {...a} name="name" autoComplete="name" required />}
        </FormField>
        {type !== "contact" && (
          <FormField id={id("company")} label={t("company")} error={err("company")} optional={type === "event"} optionalLabel={t("optional")}>
            {(a) => <Input {...a} name="company" autoComplete="organization" required={type === "corporate_quote"} />}
          </FormField>
        )}
        <FormField id={id("email")} label={t("email")} error={err("email")}>
          {(a) => <Input {...a} name="email" type="email" autoComplete="email" inputMode="email" spellCheck={false} required />}
        </FormField>
        <FormField id={id("phone")} label={t("phone")} error={err("phone")} optional optionalLabel={t("optional")} hint={t("phoneHint")}>
          {(a) => <Input {...a} name="phone" type="tel" autoComplete="tel" inputMode="tel" dir="ltr" className="text-start" />}
        </FormField>
      </div>

      {type === "corporate_quote" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id={id("need")} label={t("need")} error={err("need")}>
            {(a) => (
              <NativeSelect {...a} name="need" defaultValue="" required>
                <option value="" disabled>{t("choose")}</option>
                {opt("need")}
              </NativeSelect>
            )}
          </FormField>
          <FormField id={id("frequency")} label={t("frequency")} error={err("frequency")}>
            {(a) => (
              <NativeSelect {...a} name="frequency" defaultValue="" required>
                <option value="" disabled>{t("choose")}</option>
                {opt("frequency")}
              </NativeSelect>
            )}
          </FormField>
          <FormField id={id("emirate")} label={t("emirate")} error={err("emirate")}>
            {(a) => (
              <NativeSelect {...a} name="emirate" defaultValue="" required>
                <option value="" disabled>{t("choose")}</option>
                {opt("emirate")}
              </NativeSelect>
            )}
          </FormField>
          <FormField id={id("locations")} label={t("locations")} error={err("locations")} optional optionalLabel={t("optional")}>
            {(a) => <Input {...a} name="locations" inputMode="numeric" pattern="[0-9]*" />}
          </FormField>
          <FormField id={id("trn")} label={t("trn")} error={err("trn")} optional optionalLabel={t("optional")} hint={t("trnHint")}>
            {(a) => <Input {...a} name="trn" inputMode="numeric" pattern="[0-9]*" maxLength={15} dir="ltr" className="text-start" />}
          </FormField>
        </div>
      )}

      {type === "event" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id={id("eventType")} label={t("eventType")} error={err("eventType")}>
            {(a) => (
              <NativeSelect {...a} name="eventType" defaultValue="" required>
                <option value="" disabled>{t("choose")}</option>
                {opt("eventType")}
              </NativeSelect>
            )}
          </FormField>
          <FormField id={id("eventDate")} label={t("eventDate")} error={err("eventDate")}>
            {(a) => <Input {...a} name="eventDate" type="date" required min={new Date().toISOString().slice(0, 10)} />}
          </FormField>
          <FormField id={id("guests")} label={t("guests")} error={err("guests")}>
            {(a) => <Input {...a} name="guests" inputMode="numeric" pattern="[0-9]*" required />}
          </FormField>
          <FormField id={id("emirate")} label={t("emirate")} error={err("emirate")}>
            {(a) => (
              <NativeSelect {...a} name="emirate" defaultValue="" required>
                <option value="" disabled>{t("choose")}</option>
                {opt("emirate")}
              </NativeSelect>
            )}
          </FormField>
          <FormField id={id("venue")} label={t("venue")} error={err("venue")} optional optionalLabel={t("optional")}>
            {(a) => <Input {...a} name="venue" />}
          </FormField>
          <FormField id={id("budget")} label={t("budget")} error={err("budget")}>
            {(a) => (
              <NativeSelect {...a} name="budget" defaultValue="" required>
                <option value="" disabled>{t("choose")}</option>
                {opt("budget")}
              </NativeSelect>
            )}
          </FormField>
        </div>
      )}

      <FormField id={id("message")} label={type === "contact" ? t("message") : t("details")} error={err("message")} optional={type !== "contact"} optionalLabel={t("optional")}>
        {(a) => <Textarea {...a} name="message" rows={5} defaultValue={defaultMessage} required={type === "contact"} maxLength={2000} className="min-h-32 rounded-[var(--radius)] bg-surface text-base" />}
      </FormField>

      {type === "event" && (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="consultation" className="size-5 accent-[var(--primary)]" />
          {t("consultation")}
        </label>
      )}

      <div className="grid gap-2">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consent" required aria-invalid={!!errors.consent} aria-describedby={`${type}-consent-note`} className="mt-1 size-5 shrink-0 accent-[var(--primary)]" />
          <span>
            {t("consent")} <Link href="/privacy" className="text-primary underline underline-offset-4">{t("privacy")}</Link>.
          </span>
        </label>
        {errors.consent && <p role="alert" className="text-sm text-destructive">{t("errors.consent")}</p>}
        <p id={`${type}-consent-note`} className="text-sm text-muted-foreground">{t("consentNote")}</p>
      </div>

      {status === "failed" && <p role="alert" className="text-destructive">{t("errors.failed")}</p>}
      {status === "limited" && <p role="alert" className="text-destructive">{t("errors.limited")}</p>}

      <div>
        <Button type="submit" size="lg" disabled={pending} className="min-w-48">
          {pending && <Spinner data-icon="inline-start" />}
          {t(`submit.${type}` as "submit.contact")}
        </Button>
      </div>
      <span hidden>{locale}</span>
    </form>
  )
}
