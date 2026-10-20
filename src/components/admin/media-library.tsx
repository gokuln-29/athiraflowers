"use client"

import { Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import { deleteMediaAction, updateMediaAction, type MediaItem } from "@/app/(admin)/admin/(app)/media/actions"
import { Thumb } from "@/components/admin/media-picker"
import { useImageUpload } from "@/components/admin/use-image-upload"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { notify } from "@/components/ui/toast"

export function MediaLibrary({ items }: { items: (MediaItem & { createdAt: string; bytes: number | null })[] }) {
  const router = useRouter()
  const { upload, busy, error } = useImageUpload()
  const input = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<MediaItem | null>(null)
  const [alt, setAlt] = useState({ en: "", ar: "", credit: "" })
  const [pending, start] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload images" onChange={async (e) => {
          for (const f of Array.from(e.target.files ?? [])) {
            const up = await upload(f)
            if (up) notify("Image uploaded. Add alt text so it is accessible.", "success")
          }
          e.target.value = ""
          router.refresh()
        }} />
        <Button onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Spinner data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
          Upload images
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      {items.length === 0 ? (
        <p className="meta">No images yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((m) => (
            <li key={m.id} className="panel overflow-hidden">
              <button type="button" className="block aspect-square w-full" onClick={() => { setEditing(m); setAlt({ en: m.altEn, ar: m.altAr, credit: m.credit ?? "" }); setFormError(null) }} aria-label={`Edit ${m.altEn || "image"} ${m.id}`}>
                <Thumb item={m} />
              </button>
              <div className="p-2">
                <p className="truncate text-xs">{m.altEn || <span className="text-destructive">Missing alt text</span>}</p>
                <p className="meta num">{m.width}×{m.height}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image details</DialogTitle>
            <DialogDescription>Alt text describes the photo for screen readers and search engines. Write what is in it, not a keyword list.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); setFormError(null); start(async () => { const r = await updateMediaAction({ id: editing.id, altEn: alt.en, altAr: alt.ar, credit: alt.credit }); if (r.ok) { notify("Saved", "success"); setEditing(null); router.refresh() } else setFormError(r.error) }) }}>
              <div className="aspect-video w-full overflow-hidden rounded-md bg-muted"><Thumb item={editing} size={960} /></div>
              <label className="grid gap-1 text-sm font-medium">Alt text (English)<Input value={alt.en} onChange={(e) => setAlt({ ...alt, en: e.target.value })} maxLength={300} /></label>
              <label className="grid gap-1 text-sm font-medium">Alt text (Arabic)<Input dir="rtl" value={alt.ar} onChange={(e) => setAlt({ ...alt, ar: e.target.value })} maxLength={300} /></label>
              <label className="grid gap-1 text-sm font-medium">Credit<Input value={alt.credit} onChange={(e) => setAlt({ ...alt, credit: e.target.value })} maxLength={200} /></label>
              {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
              <div className="flex justify-between">
                <Button type="button" variant="ghost" className="text-destructive" disabled={pending} onClick={() => start(async () => { const r = await deleteMediaAction({ id: editing.id }); if (r.ok) { notify("Deleted", "success"); setEditing(null); router.refresh() } else setFormError(r.error) })}>Delete</Button>
                <Button type="submit" disabled={pending}>{pending && <Spinner data-icon="inline-start" />}Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
