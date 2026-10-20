"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/** After returning from Stripe, the webhook may lag a moment. Refresh until the order shows as paid. */
export function OrderPoller({ active }: { active: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    let n = 0
    const id = setInterval(() => {
      router.refresh()
      if (++n >= 12) clearInterval(id)
    }, 2500)
    return () => clearInterval(id)
  }, [active, router])
  return null
}
