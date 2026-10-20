"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { startPayLinkAction } from "@/app/(site)/[locale]/pay/[token]/actions"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function PayLinkButton({ token }: { token: string }) {
  const t = useTranslations("order")
  const locale = useLocale()
  const [pending, start] = useTransition()
  const [failed, setFailed] = useState(false)
  return (
    <div className="grid gap-2">
      <Button size="lg" disabled={pending} onClick={() => start(async () => { const r = await startPayLinkAction(token, locale); if (r.ok) window.location.assign(r.url); else setFailed(true) })}>
        {pending && <Spinner data-icon="inline-start" />}{t("payNow")}
      </Button>
      <p className="text-sm text-muted-foreground">{t("linkSecure")}</p>
      {failed && <p role="alert" className="text-sm text-destructive">{t("payFailed")}</p>}
    </div>
  )
}
