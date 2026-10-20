"use client"

import { useEffect, useState } from "react"

import { quoteCartAction } from "@/app/(site)/[locale]/cart/actions"
import type { Quote } from "@/server/cart/quote"

import type { CartItem } from "./cart-provider"

type Settled = { key: string; quote: Quote | null; failed: boolean }

/** Debounced, latest-wins server quote for the cart. Keeps the previous quote on screen while a new one loads. */
export function useQuote(items: CartItem[], locale: string, enabled = true, extra: Record<string, unknown> = {}) {
  const [settled, setSettled] = useState<Settled | null>(null)
  const key = JSON.stringify({ items, locale, extra })
  const active = enabled && items.length > 0

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const result = await quoteCartAction({ items, locale, ...extra })
      if (!cancelled) setSettled({ key, quote: result.ok ? result.quote : null, failed: !result.ok })
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active])

  return {
    quote: items.length ? (settled?.quote ?? null) : null,
    pending: active && settled?.key !== key,
    failed: active && settled?.key === key && settled.failed,
  }
}
