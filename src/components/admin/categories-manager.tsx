"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { deleteCategoryAction, saveCategoryAction } from "@/app/(admin)/admin/(app)/categories/actions"
import type { MediaItem } from "@/app/(admin)/admin/(app)/media/actions"
import { Check, Field } from "@/components/admin/fields"
import { MediaPicker, Thumb } from "@/components/admin/media-picker"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

export type CategoryRow = {
  id?: number; slug: string; nameEn: string; nameAr: string; descriptionEn: string; descriptionAr: string; sort: number; isActive: boolean
  seoTitleEn: string; seoTitleAr: string; seoDescriptionEn: string; seoDescriptionAr: string; image: MediaItem | null; products: number
}
const blank: CategoryRow = { slug: "", nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", sort: 0, isActive: true, seoTitleEn: "", seoTitleAr: "", seoDescriptionEn: "", seoDescriptionAr: "", image: null, products: 0 }

export function CategoriesManager({ rows, canWrite }: { rows: CategoryRow[]; canWrite: boolean }) {
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const save = useSave()
  const set = <K extends keyof CategoryRow>(k: K, v: CategoryRow[K]) => setEditing((e) => (e ? { ...e, [k]: v } : e))
  return (
    <>
      {canWrite && <div className="mb-4"><Button onClick={() => { save.clear(); setEditing({ ...blank, sort: rows.length }) }}><Plus data-icon="inline-start" />New category</Button></div>}
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="w-14 px-3 py-2"><span className="sr-only">Image</span></th><th className="px-3 py-2 font-medium">Category</th><th className="px-3 py-2 font-medium">Web address</th><th className="px-3 py-2 text-right font-medium">Products</th><th className="px-3 py-2 font-medium">State</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/40">
                <td className="px-3 py-2"><div className="size-10 overflow-hidden rounded bg-muted">{r.image && <Thumb item={r.image} size={120} />}</div></td>
                <td className="px-3 py-2">{canWrite ? <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => { save.clear(); setEditing(r) }}>{r.nameEn}</button> : r.nameEn}<span className="meta block" dir="rtl">{r.nameAr}</span></td>
                <td className="num px-3 py-2">/shop/{r.slug}</td>
                <td className="num px-3 py-2 text-right">{r.products}</td>
                <td className="px-3 py-2">{r.isActive ? "Visible" : <span className="text-muted-foreground">Hidden</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit category" : "New category"}</DialogTitle><DialogDescription>Shown in the shop navigation and on the home page.</DialogDescription></DialogHeader>
          {editing && (
            <form className="grid gap-3" noValidate onSubmit={(e) => { e.preventDefault(); const { image, products: _p, ...rest } = editing; void _p; save.run(() => saveCategoryAction({ ...rest, imageId: image?.id ?? null }), { onDone: () => setEditing(null) }) }}>
              {save.error && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{save.error}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name (English)" error={save.err("nameEn")}><Input value={editing.nameEn} onChange={(e) => set("nameEn", e.target.value)} /></Field>
                <Field label="Name (Arabic)"><Input dir="rtl" value={editing.nameAr} onChange={(e) => set("nameAr", e.target.value)} /></Field>
                <Field label="Web address" error={save.err("slug")} hint="Leave empty to generate from the name"><Input value={editing.slug} onChange={(e) => set("slug", e.target.value)} className="num" /></Field>
                <Field label="Display order"><Input inputMode="numeric" value={editing.sort} onChange={(e) => set("sort", Number(e.target.value.replace(/\D/g, "")) || 0)} className="num" /></Field>
                <Field label="Description (English)"><Textarea rows={3} value={editing.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} /></Field>
                <Field label="Description (Arabic)"><Textarea rows={3} dir="rtl" value={editing.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} /></Field>
                <Field label="SEO title (English)"><Input value={editing.seoTitleEn} onChange={(e) => set("seoTitleEn", e.target.value)} /></Field>
                <Field label="SEO title (Arabic)"><Input dir="rtl" value={editing.seoTitleAr} onChange={(e) => set("seoTitleAr", e.target.value)} /></Field>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-16 overflow-hidden rounded bg-muted">{editing.image && <Thumb item={editing.image} size={160} />}</div>
                <MediaPicker label={editing.image ? "Change image" : "Choose image"} onPick={(p) => set("image", p[0] ?? null)} />
                {editing.image && <Button type="button" variant="ghost" size="sm" onClick={() => set("image", null)}>Remove</Button>}
              </div>
              <Check label="Visible in the shop" checked={editing.isActive} onChange={(v) => set("isActive", v)} />
              <div className="flex justify-between">
                {editing.id ? <Button type="button" variant="ghost" className="text-destructive" disabled={save.pending} onClick={() => save.run(() => deleteCategoryAction({ id: editing.id! }), { ok: "Deleted", onDone: () => setEditing(null) })}>Delete</Button> : <span />}
                <Button type="submit" disabled={save.pending}>{save.pending && <Spinner data-icon="inline-start" />}Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
