"use client"

import { Minus, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId } from "react"

import { cn } from "@/lib/utils"

export function QuantityStepper({
  value, min = 1, max = 100, onChange, label, className, compact = false,
}: {
  value: number
  min?: number
  max?: number
  onChange: (next: number) => void
  label: string
  className?: string
  compact?: boolean
}) {
  const t = useTranslations("common")
  const id = useId()
  const clamp = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? Math.round(n) : min))
  const size = compact ? "size-9" : "size-11"
  return (
    <div role="group" aria-labelledby={id} className={cn("inline-flex items-center border border-input bg-surface", className)} style={{ borderRadius: "var(--radius)" }}>
      <span id={id} className="sr-only">
        {label}
      </span>
      <button type="button" className={cn(size, "pressable grid place-items-center hover:bg-surface-deep disabled:opacity-40")} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={t("decrease")}>
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={label}
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "")
          if (digits) onChange(clamp(Number(digits)))
        }}
        onFocus={(e) => e.currentTarget.select()}
        className={cn("tabular h-full bg-transparent text-center text-base outline-none", compact ? "w-10" : "w-12")}
      />
      <button type="button" className={cn(size, "pressable grid place-items-center hover:bg-surface-deep disabled:opacity-40")} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={t("increase")}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
