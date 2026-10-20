"use client"

import { ImagePlus, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { listMediaAction, type MediaItem } from "@/app/(admin)/admin/(app)/media/actions"
import { useImageUpload } from "@/components/admin/use-image-upload"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { mediaUrl, pickVariant } from "@/lib/media"

export function Thumb({ item, size = 240 }: { item: Pick<MediaItem, "variants" | "key" | "altEn">; size?: number }) {
  const v = pickVariant(item.variants, size)
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaUrl(v?.key ?? item.key)} alt={item.altEn} loading="lazy" className="size-full object-cover" />
}

/** Choose images from the library or upload new ones. Selection is by media id. */
export function MediaPicker({
  label, multiple = false, onPick, trigger,
}: {
  label: string
  multiple?: boolean
  onPick: (items: MediaItem[]) => void
  trigger?: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<MediaItem[]>([])
  const [selected, setSelected] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const { upload, busy, error } = useImageUpload()
  const input = useRef<HTMLInputElement>(null)

  function load() {
    setLoading(true)
    listMediaAction({ page: 1 }).then((r) => {
      if (r.ok) setItems(r.data)
      setLoading(false)
    })
  }

  const toggle = (m: MediaItem) => setSelected((cur) => (cur.some((c) => c.id === m.id) ? cur.filter((c) => c.id !== m.id) : multiple ? [...cur, m] : [m]))

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelected([]); else load() }}>
      <DialogTrigger render={trigger ?? <Button type="button" variant="outline" size="sm" />}>
        {trigger ? undefined : (<><ImagePlus data-icon="inline-start" />{label}</>)}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Choose from the image library or upload a JPEG, PNG or WebP photo (up to 10 MB). Metadata is removed and responsive sizes are created automatically.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload an image" onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const up = await upload(f)
            if (up) {
              const item: MediaItem = { id: up.id, key: up.key, width: up.width, height: up.height, altEn: "", altAr: "", credit: null, variants: up.variants }
              setItems((cur) => [item, ...cur])
              setSelected((cur) => (multiple ? [...cur, item] : [item]))
            }
            e.target.value = ""
          }} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Spinner data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
            Upload
          </Button>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <p className="meta">Loading…</p>
          ) : items.length === 0 ? (
            <p className="meta">No images yet. Upload the first one.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {items.map((m) => {
                const on = selected.some((s) => s.id === m.id)
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => toggle(m)} aria-pressed={on} className={`relative block aspect-square w-full overflow-hidden rounded-md border ${on ? "ring-2 ring-primary" : ""}`} title={m.altEn || m.key}>
                      <Thumb item={m} size={240} />
                      {on && <span className="absolute end-1 top-1 rounded bg-primary px-1.5 text-xs text-primary-foreground">Selected</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" size="sm" disabled={selected.length === 0} onClick={() => { onPick(selected); setOpen(false); setSelected([]) }}>
            Use {selected.length > 1 ? `${selected.length} images` : "image"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
