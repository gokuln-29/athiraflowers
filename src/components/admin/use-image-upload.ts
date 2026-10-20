"use client"

import { useState } from "react"

const TYPES = ["image/jpeg", "image/png", "image/webp"]

export type UploadedImage = { id: number; key: string; width: number; height: number; variants: { w: number; h: number; key: string }[]; altEn: string; altAr: string }

/** Direct-to-storage upload: intent -> PUT to the presigned URL -> server verifies and re-encodes. */
export function useImageUpload(maxBytes = 10 * 1024 * 1024) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File, meta: { altEn?: string; altAr?: string; credit?: string } = {}): Promise<UploadedImage | null> {
    setError(null)
    if (!TYPES.includes(file.type)) return fail("Only JPEG, PNG or WebP images are accepted. SVG is not allowed.")
    if (file.size > maxBytes) return fail(`Images can be up to ${Math.round(maxBytes / 1_048_576)} MB.`)
    setBusy(true)
    try {
      const intentRes = await fetch("/api/admin/uploads/intent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contentType: file.type, bytes: file.size }) })
      const intent = await intentRes.json()
      if (!intentRes.ok) return fail(intent.error ?? "Upload was not allowed.")
      const put = await fetch(intent.uploadUrl, { method: intent.method, headers: intent.headers, body: file })
      if (!put.ok) return fail("The upload to storage failed. Try again.")
      const doneRes = await fetch("/api/admin/uploads/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mediaId: intent.mediaId, altEn: meta.altEn ?? "", altAr: meta.altAr ?? "", credit: meta.credit }) })
      const done = await doneRes.json()
      if (!doneRes.ok) return fail(done.error ?? "The image could not be processed.")
      return done as UploadedImage
    } catch {
      return fail("Network error. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  function fail(message: string) {
    setError(message)
    setBusy(false)
    return null
  }
  return { upload, busy, error }
}
