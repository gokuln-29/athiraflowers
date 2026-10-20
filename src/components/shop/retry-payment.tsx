"use client"

import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { retryPaymentAction } from "@/app/(site)/[locale]/order/[token]/actions"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function RetryPayment({ token }: { token: string }) {
  const t = useTranslations("order")
  const [pending, start] = useTransition()
  const [failed, setFailed] = useState(false)
  return (
    <div className="grid gap-2">
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await retryPaymentAction(token)
            if (r.ok) window.location.assign(r.url)
            else setFailed(true)
          })
        }
      >
        {pending && <Spinner data-icon="inline-start" />}
        {t("payNow")}
      </Button>
      {failed && <p role="alert" className="text-sm text-destructive">{t("payFailed")}</p>}
    </div>
  )
}
