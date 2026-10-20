"use client"

import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

type Choice = "granted" | "denied"
const KEY = "athira-consent"

const read = (): Choice | null => {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === "granted" || v === "denied" ? v : null
  } catch {
    return null
  }
}

function loadAnalytics(id: string) {
  if (document.getElementById("ga-loader")) return
  const w = window as unknown as { dataLayer: unknown[] }
  w.dataLayer = w.dataLayer || []
  const gtag = (...args: unknown[]) => { w.dataLayer.push(args) }
  gtag("js", new Date())
  gtag("config", id, { anonymize_ip: true })
  const s = document.createElement("script")
  s.id = "ga-loader"
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(s)
}

/** Analytics load only after an explicit "accept". Rendered only when a GA id is configured. */
export function ConsentBanner({ gaId }: { gaId: string }) {
  const t = useTranslations("consent")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const saved = read()
    if (saved === "granted") loadAnalytics(gaId)
    // Deferred so the first paint never waits on the banner, and so effects stay free of synchronous state writes.
    const timer = window.setTimeout(() => setOpen(saved === null), 0)
    const reopen = () => setOpen(true)
    window.addEventListener("athira:cookie-settings", reopen)
    return () => { window.clearTimeout(timer); window.removeEventListener("athira:cookie-settings", reopen) }
  }, [gaId])

  function choose(choice: Choice) {
    try { window.localStorage.setItem(KEY, choice) } catch { /* private mode: the choice lasts for this page view only */ }
    if (choice === "granted") loadAnalytics(gaId)
    setOpen(false)
  }

  if (!open) return null
  return (
    <section aria-label={t("title")} className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl border bg-background p-4 shadow-lg" style={{ borderRadius: "var(--radius)" }}>
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("body")} <Link href="/privacy" className="underline underline-offset-4">{t("policy")}</Link></p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => choose("granted")}>{t("accept")}</Button>
        <Button size="sm" variant="outline" onClick={() => choose("denied")}>{t("reject")}</Button>
      </div>
    </section>
  )
}

/** Footer link to change the choice later. */
export function CookieSettingsButton({ label }: { label: string }) {
  return <button type="button" className="underline-offset-4 hover:underline" onClick={() => window.dispatchEvent(new Event("athira:cookie-settings"))}>{label}</button>
}
