"use client"

import { useTranslations } from "next-intl"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors")
  useEffect(() => {
    // Visitors see a generic message; the digest ties this to the server log entry.
    console.error("[page error]", error.digest)
  }, [error])
  return (
    <div className="page-grid grid min-h-[50svh] content-center gap-5 py-20">
      <h1 className="text-h1 max-w-[20ch]">{t("errorTitle")}</h1>
      <p className="text-lead max-w-[52ch] text-muted-foreground">{t("errorBody")}</p>
      <div><Button size="lg" onClick={reset}>{t("retry")}</Button></div>
    </div>
  )
}
