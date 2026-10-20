"use client"

import { Check, Copy } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function CopyCode({ code }: { code: string }) {
  const t = useTranslations("offers")
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          /* clipboard unavailable: the code stays visible to copy by hand */
        }
      }}
      aria-label={t("copyCode", { code })}
    >
      {copied ? <Check data-icon="inline-start" aria-hidden /> : <Copy data-icon="inline-start" aria-hidden />}
      <span className="tabular tracking-wider" dir="ltr">{code}</span>
      <span className="sr-only" role="status">{copied ? t("copied") : ""}</span>
    </Button>
  )
}
