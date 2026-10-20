"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { notify } from "@/components/ui/toast"
import type { ActionResult } from "@/server/auth/admin-guards"

/** Runs an admin server action with pending, inline error and field errors, then refreshes the page data. */
export function useSave() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function run<T>(fn: () => Promise<ActionResult<T>>, opts: { ok?: string; onDone?: (data: T) => void } = {}) {
    setError(null)
    setFieldErrors({})
    start(async () => {
      const r = await fn()
      if (r.ok) {
        notify(opts.ok ?? "Saved", "success")
        opts.onDone?.(r.data)
        router.refresh()
      } else {
        setError(r.error)
        setFieldErrors(r.fieldErrors ?? {})
      }
    })
  }
  return { run, pending, error, fieldErrors, err: (k: string) => fieldErrors[k]?.[0], clear: () => { setError(null); setFieldErrors({}) } }
}
