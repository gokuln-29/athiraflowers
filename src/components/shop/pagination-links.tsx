import { ChevronLeft, ChevronRight } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export async function PaginationLinks({ locale, page, pages, basePath, query }: { locale: string; page: number; pages: number; basePath: string; query: Record<string, string | string[] | undefined> }) {
  if (pages <= 1) return null
  const t = await getTranslations({ locale, namespace: "common" })
  const href = (p: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (k === "page" || v == null) continue
      for (const item of Array.isArray(v) ? v : [v]) sp.append(k, item)
    }
    if (p > 1) sp.set("page", String(p))
    const qs = sp.toString()
    return `${basePath}${qs ? `?${qs}` : ""}`
  }
  const item = "inline-flex size-11 items-center justify-center border border-input hover:bg-surface-deep"
  return (
    <nav aria-label={t("page", { page, pages })} className="mt-14 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={item} aria-label={t("previous")} rel="prev" style={{ borderRadius: "var(--radius)" }}>
          <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      ) : null}
      {Array.from({ length: pages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
        .map((p, i, arr) => (
          <span key={p} className="flex items-center gap-2">
            {i > 0 && arr[i - 1] !== p - 1 ? <span aria-hidden>…</span> : null}
            <Link href={href(p)} aria-current={p === page ? "page" : undefined} className={cn(item, "tabular", p === page && "bg-foreground text-background hover:bg-foreground")} style={{ borderRadius: "var(--radius)" }}>
              {p}
            </Link>
          </span>
        ))}
      {page < pages ? (
        <Link href={href(page + 1)} className={item} aria-label={t("next")} rel="next" style={{ borderRadius: "var(--radius)" }}>
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      ) : null}
    </nav>
  )
}
