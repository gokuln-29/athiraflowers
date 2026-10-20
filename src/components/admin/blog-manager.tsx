"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { deletePostAction, saveBlogCategoryAction, savePostAction } from "@/app/(admin)/admin/(app)/blog/actions"
import type { MediaItem } from "@/app/(admin)/admin/(app)/media/actions"
import { Field, Panel } from "@/components/admin/fields"
import { MediaPicker, Thumb } from "@/components/admin/media-picker"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import { slugify } from "@/lib/slug"

export type PostRow = {
  id: number; slug: string; titleEn: string; titleAr: string; excerptEn: string; excerptAr: string; bodyEn: string; bodyAr: string
  cover: MediaItem | null; categoryId: number | null; authorName: string; status: "draft" | "scheduled" | "published"; publishAt: string
  publishedAt: string | null; seoTitleEn: string; seoTitleAr: string; seoDescriptionEn: string; seoDescriptionAr: string
}
export type BlogCat = { id: number; nameEn: string }

const blank = (author: string): PostRow => ({ id: 0, slug: "", titleEn: "", titleAr: "", excerptEn: "", excerptAr: "", bodyEn: "", bodyAr: "", cover: null, categoryId: null, authorName: author, status: "draft", publishAt: "", publishedAt: null, seoTitleEn: "", seoTitleAr: "", seoDescriptionEn: "", seoDescriptionAr: "" })

export function BlogManager({ rows, cats, author }: { rows: PostRow[]; cats: BlogCat[]; author: string }) {
  const [editing, setEditing] = useState<PostRow | null>(null)
  if (editing) return <PostEditor key={editing.id} initial={editing} cats={cats} onClose={() => setEditing(null)} />
  return (
    <Panel title="Articles" actions={<Button size="sm" onClick={() => setEditing(blank(author))}><Plus data-icon="inline-start" />New article</Button>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Title</th><th className="py-1 font-medium">Status</th><th className="py-1 font-medium">Date</th><th className="py-1"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{r.titleEn}<span className="meta block">/{r.slug}</span></td>
                <td className="py-2 capitalize">{r.status}</td>
                <td className="py-2">{r.publishedAt ? formatDate(r.publishedAt, "en", { dateStyle: "medium" }) : "-"}</td>
                <td className="py-2 text-right"><Button size="xs" variant="outline" onClick={() => setEditing(r)}>Edit</Button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No articles yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function PostEditor({ initial, cats: initialCats, onClose }: { initial: PostRow; cats: BlogCat[]; onClose: () => void }) {
  const save = useSave()
  const del = useSave()
  const catSave = useSave()
  const [v, setV] = useState(initial)
  const [cats, setCats] = useState(initialCats)
  const [slugTouched, setSlugTouched] = useState(!!initial.id)
  const [newCat, setNewCat] = useState("")
  const set = <K extends keyof PostRow>(k: K, val: PostRow[K]) => setV((c) => ({ ...c, [k]: val }))
  const err = save.err

  function submit(e: React.FormEvent) {
    e.preventDefault()
    save.run(() => savePostAction({ id: v.id || undefined, slug: v.slug, titleEn: v.titleEn, titleAr: v.titleAr, excerptEn: v.excerptEn, excerptAr: v.excerptAr, bodyEn: v.bodyEn, bodyAr: v.bodyAr, coverMediaId: v.cover?.id ?? null, categoryId: v.categoryId, authorName: v.authorName, status: v.status, publishAt: v.publishAt, seoTitleEn: v.seoTitleEn, seoTitleAr: v.seoTitleAr, seoDescriptionEn: v.seoDescriptionEn, seoDescriptionAr: v.seoDescriptionAr }), { ok: v.status === "published" ? "Article published" : "Article saved", onDone: onClose })
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <Panel title={initial.id ? "Edit article" : "New article"} actions={<Button type="button" size="sm" variant="ghost" onClick={onClose}>Back to list</Button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title (English)" error={err("titleEn")}><Input value={v.titleEn} maxLength={200} onChange={(e) => { set("titleEn", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value, "")) }} /></Field>
          <Field label="Title (Arabic)"><Input dir="rtl" value={v.titleAr} maxLength={200} onChange={(e) => set("titleAr", e.target.value)} /></Field>
          <Field label="Web address" error={err("slug")} hint="Lowercase letters, numbers and dashes"><Input value={v.slug} className="num" onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()) }} /></Field>
          <Field label="Author"><Input value={v.authorName} maxLength={120} onChange={(e) => set("authorName", e.target.value)} /></Field>
          <Field label="Summary (English)" hint="Shown on the blog list and in search results"><Textarea rows={2} maxLength={400} value={v.excerptEn} onChange={(e) => set("excerptEn", e.target.value)} /></Field>
          <Field label="Summary (Arabic)"><Textarea rows={2} dir="rtl" maxLength={400} value={v.excerptAr} onChange={(e) => set("excerptAr", e.target.value)} /></Field>
          <Field label="Article (English)" error={err("bodyEn")} hint="Markdown: ## headings, **bold**, lists, [links](https://...)" className="sm:col-span-2"><Textarea rows={16} value={v.bodyEn} onChange={(e) => set("bodyEn", e.target.value)} className="font-mono text-sm" /></Field>
          <Field label="Article (Arabic)" hint="Leave empty to show the English article on the Arabic site" className="sm:col-span-2"><Textarea rows={12} dir="rtl" value={v.bodyAr} onChange={(e) => set("bodyAr", e.target.value)} /></Field>
        </div>
      </Panel>

      <Panel title="Cover and topic">
        <div className="flex flex-wrap items-start gap-6">
          <div className="grid gap-2">
            {v.cover ? <div className="size-32 overflow-hidden rounded-md border"><Thumb item={v.cover} /></div> : <p className="meta">No cover image.</p>}
            <div className="flex gap-2">
              <MediaPicker label="Choose cover" onPick={(p) => p[0] && set("cover", p[0])} />
              {v.cover && <Button type="button" size="xs" variant="ghost" onClick={() => set("cover", null)}>Remove</Button>}
            </div>
          </div>
          <div className="grid min-w-56 gap-2">
            <Field label="Topic">
              <select className="h-11 rounded-[var(--radius)] border border-input bg-surface px-3 text-base" value={v.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : null)}>
                <option value="">No topic</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
              </select>
            </Field>
            <div className="flex gap-2">
              <Input aria-label="New topic name" placeholder="New topic" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="h-9" />
              <Button type="button" size="sm" variant="outline" disabled={catSave.pending || newCat.trim().length < 2} onClick={() => catSave.run(() => saveBlogCategoryAction({ nameEn: newCat, nameAr: "" }), { ok: "Topic added", onDone: (d) => { setCats((c) => [...c, { id: d.id, nameEn: d.nameEn }]); set("categoryId", d.id); setNewCat("") } })}>Add</Button>
            </div>
            {catSave.error && <p role="alert" className="text-sm text-destructive">{catSave.error}</p>}
          </div>
        </div>
      </Panel>

      <Panel title="Search appearance" description="Optional. Defaults to the title and summary.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="SEO title (English)"><Input value={v.seoTitleEn} maxLength={160} onChange={(e) => set("seoTitleEn", e.target.value)} /></Field>
          <Field label="SEO title (Arabic)"><Input dir="rtl" value={v.seoTitleAr} maxLength={160} onChange={(e) => set("seoTitleAr", e.target.value)} /></Field>
          <Field label="SEO description (English)"><Textarea rows={2} maxLength={320} value={v.seoDescriptionEn} onChange={(e) => set("seoDescriptionEn", e.target.value)} /></Field>
          <Field label="SEO description (Arabic)"><Textarea rows={2} dir="rtl" maxLength={320} value={v.seoDescriptionAr} onChange={(e) => set("seoDescriptionAr", e.target.value)} /></Field>
        </div>
      </Panel>

      <Panel title="Publishing">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Status">
            <select className="h-11 rounded-[var(--radius)] border border-input bg-surface px-3 text-base" value={v.status} onChange={(e) => set("status", e.target.value as PostRow["status"])}>
              <option value="draft">Draft (hidden)</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </Field>
          {v.status !== "draft" && <Field label={v.status === "scheduled" ? "Publish at (Dubai time)" : "Publication date (Dubai time)"} error={err("publishAt")}><Input type="datetime-local" value={v.publishAt} onChange={(e) => set("publishAt", e.target.value)} className="num" /></Field>}
          <Button type="submit" disabled={save.pending}>Save article</Button>
          {initial.id > 0 && <Button type="button" variant="ghost" className="text-destructive" disabled={del.pending} onClick={() => { if (window.confirm("Delete this article permanently?")) del.run(() => deletePostAction({ id: initial.id }), { ok: "Article deleted", onDone: onClose }) }}>Delete</Button>}
        </div>
        {(save.error || del.error) && <p role="alert" className="mt-3 text-sm text-destructive">{save.error ?? del.error}</p>}
      </Panel>
    </form>
  )
}
