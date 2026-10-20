"use client"

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import type { MediaItem } from "@/app/(admin)/admin/(app)/media/actions"
import {
  deleteFaqAction, deleteLogoAction, deleteTestimonialAction, moveHomeSectionAction, saveFaqAction, saveHomeSectionAction, saveLogoAction, savePageAction, saveTestimonialAction,
} from "@/app/(admin)/admin/(app)/pages/actions"
import { Check, Field, Panel } from "@/components/admin/fields"
import { MediaPicker, Thumb } from "@/components/admin/media-picker"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export type PageRow = { key: string; titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; seoTitleEn: string; seoTitleAr: string; seoDescriptionEn: string; seoDescriptionAr: string; reviewedAt: string | null }
export type SectionRow = { id: number; type: string; isActive: boolean; data: Record<string, unknown> }
export type FaqRow = { id: number; group: "general" | "delivery" | "corporate" | "events" | "payment"; questionEn: string; questionAr: string; answerEn: string; answerAr: string; sort: number; isActive: boolean }
export type TestimonialRow = { id: number; authorName: string; authorRole: string; company: string; quoteEn: string; quoteAr: string; isSample: boolean; sort: number; isActive: boolean }
export type LogoRow = { id: number; name: string; url: string; sort: number; isActive: boolean; image: MediaItem | null }

export function ContentManager(props: { pages: PageRow[]; sections: SectionRow[]; faqs: FaqRow[]; testimonials: TestimonialRow[]; logos: LogoRow[] }) {
  return (
    <Tabs defaultValue="home">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="home">Homepage</TabsTrigger>
        <TabsTrigger value="pages">Pages</TabsTrigger>
        <TabsTrigger value="faqs">FAQs</TabsTrigger>
        <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
        <TabsTrigger value="logos">Client logos</TabsTrigger>
      </TabsList>
      <TabsContent value="home"><div className="grid gap-4">{props.sections.map((s, i) => <SectionCard key={s.id} s={s} first={i === 0} last={i === props.sections.length - 1} />)}</div></TabsContent>
      <TabsContent value="pages"><div className="grid gap-4">{props.pages.map((p) => <PageCard key={p.key} p={p} />)}</div></TabsContent>
      <TabsContent value="faqs"><FaqTab rows={props.faqs} /></TabsContent>
      <TabsContent value="testimonials"><TestimonialTab rows={props.testimonials} /></TabsContent>
      <TabsContent value="logos"><LogoTab rows={props.logos} /></TabsContent>
    </Tabs>
  )
}

/* ---------- Static pages ---------- */
function PageCard({ p }: { p: PageRow }) {
  const save = useSave()
  const [v, setV] = useState(p)
  const [reviewed, setReviewed] = useState(false)
  const [open, setOpen] = useState(false)
  const set = <K extends keyof PageRow>(k: K, val: PageRow[K]) => setV((c) => ({ ...c, [k]: val }))
  return (
    <Panel title={`${p.titleEn} (/${p.key})`} description={p.reviewedAt ? `Reviewed ${p.reviewedAt.slice(0, 10)}` : "Not yet reviewed by a local legal advisor."} actions={<Button size="xs" variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Edit"}</Button>}>
      {open && (
        <form noValidate className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.run(() => savePageAction({ key: v.key, titleEn: v.titleEn, titleAr: v.titleAr, bodyEn: v.bodyEn, bodyAr: v.bodyAr, seoTitleEn: v.seoTitleEn, seoTitleAr: v.seoTitleAr, seoDescriptionEn: v.seoDescriptionEn, seoDescriptionAr: v.seoDescriptionAr, markReviewed: reviewed }), { ok: "Page saved" }) }}>
          <Field label="Title (English)" error={save.err("titleEn")}><Input value={v.titleEn} onChange={(e) => set("titleEn", e.target.value)} /></Field>
          <Field label="Title (Arabic)"><Input dir="rtl" value={v.titleAr} onChange={(e) => set("titleAr", e.target.value)} /></Field>
          <Field label="Content (English)" hint="Markdown" error={save.err("bodyEn")} className="sm:col-span-2"><Textarea rows={14} className="font-mono text-sm" value={v.bodyEn} onChange={(e) => set("bodyEn", e.target.value)} /></Field>
          <Field label="Content (Arabic)" className="sm:col-span-2"><Textarea rows={12} dir="rtl" value={v.bodyAr} onChange={(e) => set("bodyAr", e.target.value)} /></Field>
          <Field label="SEO title (English)"><Input value={v.seoTitleEn} onChange={(e) => set("seoTitleEn", e.target.value)} /></Field>
          <Field label="SEO title (Arabic)"><Input dir="rtl" value={v.seoTitleAr} onChange={(e) => set("seoTitleAr", e.target.value)} /></Field>
          <Field label="SEO description (English)"><Textarea rows={2} value={v.seoDescriptionEn} onChange={(e) => set("seoDescriptionEn", e.target.value)} /></Field>
          <Field label="SEO description (Arabic)"><Textarea rows={2} dir="rtl" value={v.seoDescriptionAr} onChange={(e) => set("seoDescriptionAr", e.target.value)} /></Field>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <Check label="A local legal advisor has reviewed this text" checked={reviewed} onChange={setReviewed} />
            <Button type="submit" disabled={save.pending}>Save page</Button>
          </div>
          {save.error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{save.error}</p>}
        </form>
      )}
    </Panel>
  )
}

/* ---------- Homepage sections: a generic editor over the stored JSON ---------- */
const isLocalized = (x: unknown): x is { en: string; ar: string } => !!x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).sort().join() === "ar,en"
const humanise = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
const SECTION_LABEL: Record<string, string> = { hero: "Hero", pathways: "Pathways", featured: "Featured products", categories: "Categories", program: "Corporate programme", banner: "Banner", steps: "How it works", testimonials: "Testimonials", logos: "Client logos", faq: "FAQ", cta: "Closing call to action" }

function SectionCard({ s, first, last }: { s: SectionRow; first: boolean; last: boolean }) {
  const save = useSave()
  const move = useSave()
  const [data, setData] = useState(s.data)
  const [active, setActive] = useState(s.isActive)
  const [open, setOpen] = useState(false)
  return (
    <Panel
      title={SECTION_LABEL[s.type] ?? s.type}
      description={active ? undefined : "Hidden from the homepage"}
      actions={
        <div className="flex gap-1">
          <Button size="icon-xs" variant="ghost" aria-label="Move up" disabled={first || move.pending} onClick={() => move.run(() => moveHomeSectionAction({ id: s.id, dir: "up" }), { ok: "Moved" })}><ArrowUp /></Button>
          <Button size="icon-xs" variant="ghost" aria-label="Move down" disabled={last || move.pending} onClick={() => move.run(() => moveHomeSectionAction({ id: s.id, dir: "down" }), { ok: "Moved" })}><ArrowDown /></Button>
          <Button size="xs" variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Edit"}</Button>
        </div>
      }
    >
      {open && (
        <form noValidate className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.run(() => saveHomeSectionAction({ id: s.id, data, isActive: active }), { ok: "Section saved" }) }}>
          <Check label="Show this section on the homepage" checked={active} onChange={setActive} />
          <Node value={data} onChange={(v) => setData(v as Record<string, unknown>)} path="" />
          {save.error && <p role="alert" className="text-sm text-destructive">{save.error}</p>}
          <div><Button type="submit" disabled={save.pending}>Save section</Button></div>
        </form>
      )}
    </Panel>
  )
}

function Node({ value, onChange, path, label }: { value: unknown; onChange: (v: unknown) => void; path: string; label?: string }) {
  if (value === null) return null
  if (isLocalized(value)) {
    const long = value.en.length > 90 || value.ar.length > 90
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${label ?? "Text"} (English)`}>{long ? <Textarea rows={3} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} /> : <Input value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} />}</Field>
        <Field label={`${label ?? "Text"} (Arabic)`}>{long ? <Textarea rows={3} dir="rtl" value={value.ar} onChange={(e) => onChange({ ...value, ar: e.target.value })} /> : <Input dir="rtl" value={value.ar} onChange={(e) => onChange({ ...value, ar: e.target.value })} />}</Field>
      </div>
    )
  }
  if (typeof value === "string") return <Field label={label ?? "Value"}><Input value={value} onChange={(e) => onChange(e.target.value)} /></Field>
  if (typeof value === "number") return <Field label={label ?? "Number"}><Input inputMode="numeric" className="num w-32" value={String(value)} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
  if (Array.isArray(value)) {
    const blank = value[0] === undefined ? "" : JSON.parse(JSON.stringify(value[0], (_k, x) => (typeof x === "string" ? "" : x)))
    return (
      <div className="grid gap-3">
        {value.map((item, i) => (
          <div key={i} className="grid gap-3 rounded-md border p-3">
            <div className="flex items-center justify-between"><span className="text-sm font-medium">{label ?? "Item"} {i + 1}</span><Button type="button" size="icon-xs" variant="ghost" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 /></Button></div>
            <Node value={item} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} path={`${path}.${i}`} />
          </div>
        ))}
        <div><Button type="button" size="xs" variant="outline" onClick={() => onChange([...value, blank])}><Plus data-icon="inline-start" />Add {label?.toLowerCase() ?? "item"}</Button></div>
      </div>
    )
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>
    return (
      <div className="grid gap-3">
        {Object.entries(o).map(([k, v]) => {
          if (k === "imageMediaId") return <ImageField key={k} id={v as number | null} onChange={(nv) => onChange({ ...o, [k]: nv })} />
          if (k === "group") return <Field key={k} label="Question group"><select className="h-11 rounded-[var(--radius)] border border-input bg-surface px-3 text-base" value={String(v)} onChange={(e) => onChange({ ...o, [k]: e.target.value })}>{["all", "general", "delivery", "corporate", "events", "payment"].map((g) => <option key={g}>{g}</option>)}</select></Field>
          return <Node key={k} label={humanise(k)} value={v} onChange={(nv) => onChange({ ...o, [k]: nv })} path={`${path}.${k}`} />
        })}
      </div>
    )
  }
  return null
}

function ImageField({ id, onChange }: { id: number | null; onChange: (v: number | null) => void }) {
  const [item, setItem] = useState<MediaItem | null>(null)
  return (
    <div className="flex items-center gap-3">
      {item ? <div className="size-16 overflow-hidden rounded-md border"><Thumb item={item} size={160} /></div> : <span className="meta">{id ? `Image #${id}` : "No image"}</span>}
      <MediaPicker label="Choose image" onPick={(p) => { if (p[0]) { setItem(p[0]); onChange(p[0].id) } }} />
      {id && <Button type="button" size="xs" variant="ghost" onClick={() => { setItem(null); onChange(null) }}>Remove</Button>}
    </div>
  )
}

/* ---------- FAQs ---------- */
const sel = "h-11 rounded-[var(--radius)] border border-input bg-surface px-3 text-base"
function FaqTab({ rows }: { rows: FaqRow[] }) {
  const [editing, setEditing] = useState<FaqRow | null>(null)
  return (
    <div className="grid gap-4">
      {editing ? <FaqForm key={editing.id} initial={editing} onClose={() => setEditing(null)} /> : (
        <Panel title="Questions" actions={<Button size="sm" onClick={() => setEditing({ id: 0, group: "general", questionEn: "", questionAr: "", answerEn: "", answerAr: "", sort: (rows.at(-1)?.sort ?? 0) + 10, isActive: true })}><Plus data-icon="inline-start" />New question</Button>}>
          <ul className="divide-y text-sm">
            {rows.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2"><span>{r.questionEn}<span className="meta block">{r.group}{r.isActive ? "" : " · hidden"}</span></span><Button size="xs" variant="outline" onClick={() => setEditing(r)}>Edit</Button></li>)}
            {rows.length === 0 && <li className="py-6 text-center text-muted-foreground">No questions yet.</li>}
          </ul>
        </Panel>
      )}
    </div>
  )
}
function FaqForm({ initial, onClose }: { initial: FaqRow; onClose: () => void }) {
  const save = useSave(); const del = useSave(); const [v, setV] = useState(initial)
  const set = <K extends keyof FaqRow>(k: K, val: FaqRow[K]) => setV((c) => ({ ...c, [k]: val }))
  return (
    <Panel title={initial.id ? "Edit question" : "New question"} actions={<Button size="sm" variant="ghost" onClick={onClose}>Back</Button>}>
      <form noValidate className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.run(() => saveFaqAction({ ...v, id: v.id || undefined }), { onDone: onClose }) }}>
        <Field label="Question (English)" error={save.err("questionEn")}><Input value={v.questionEn} onChange={(e) => set("questionEn", e.target.value)} /></Field>
        <Field label="Question (Arabic)"><Input dir="rtl" value={v.questionAr} onChange={(e) => set("questionAr", e.target.value)} /></Field>
        <Field label="Answer (English)" error={save.err("answerEn")}><Textarea rows={4} value={v.answerEn} onChange={(e) => set("answerEn", e.target.value)} /></Field>
        <Field label="Answer (Arabic)"><Textarea rows={4} dir="rtl" value={v.answerAr} onChange={(e) => set("answerAr", e.target.value)} /></Field>
        <Field label="Group"><select className={sel} value={v.group} onChange={(e) => set("group", e.target.value as FaqRow["group"])}>{["general", "delivery", "corporate", "events", "payment"].map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Order"><Input inputMode="numeric" className="num w-28" value={String(v.sort)} onChange={(e) => set("sort", Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2"><Check label="Visible" checked={v.isActive} onChange={(c) => set("isActive", c)} /><Button type="submit" disabled={save.pending}>Save</Button>{initial.id > 0 && <Button type="button" variant="ghost" className="text-destructive" disabled={del.pending} onClick={() => { if (window.confirm("Delete this question?")) del.run(() => deleteFaqAction({ id: initial.id }), { ok: "Deleted", onDone: onClose }) }}>Delete</Button>}</div>
        {(save.error || del.error) && <p role="alert" className="text-sm text-destructive sm:col-span-2">{save.error ?? del.error}</p>}
      </form>
    </Panel>
  )
}

/* ---------- Testimonials ---------- */
function TestimonialTab({ rows }: { rows: TestimonialRow[] }) {
  const [editing, setEditing] = useState<TestimonialRow | null>(null)
  if (editing) return <TestimonialForm key={editing.id} initial={editing} onClose={() => setEditing(null)} />
  return (
    <Panel title="Testimonials" description="Samples are marked and should be replaced by real, permissioned quotes before launch." actions={<Button size="sm" onClick={() => setEditing({ id: 0, authorName: "", authorRole: "", company: "", quoteEn: "", quoteAr: "", isSample: false, sort: (rows.at(-1)?.sort ?? 0) + 10, isActive: true })}><Plus data-icon="inline-start" />New testimonial</Button>}>
      <ul className="divide-y text-sm">
        {rows.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2"><span>{r.authorName}{r.company && `, ${r.company}`}<span className="meta block">{r.isSample ? "Sample text · " : ""}{r.isActive ? "visible" : "hidden"}</span></span><Button size="xs" variant="outline" onClick={() => setEditing(r)}>Edit</Button></li>)}
        {rows.length === 0 && <li className="py-6 text-center text-muted-foreground">None yet.</li>}
      </ul>
    </Panel>
  )
}
function TestimonialForm({ initial, onClose }: { initial: TestimonialRow; onClose: () => void }) {
  const save = useSave(); const del = useSave(); const [v, setV] = useState(initial)
  const set = <K extends keyof TestimonialRow>(k: K, val: TestimonialRow[K]) => setV((c) => ({ ...c, [k]: val }))
  return (
    <Panel title={initial.id ? "Edit testimonial" : "New testimonial"} actions={<Button size="sm" variant="ghost" onClick={onClose}>Back</Button>}>
      <form noValidate className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); save.run(() => saveTestimonialAction({ ...v, id: v.id || undefined }), { onDone: onClose }) }}>
        <Field label="Name" error={save.err("authorName")}><Input value={v.authorName} onChange={(e) => set("authorName", e.target.value)} /></Field>
        <Field label="Role"><Input value={v.authorRole} onChange={(e) => set("authorRole", e.target.value)} /></Field>
        <Field label="Company"><Input value={v.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field label="Quote (English)" error={save.err("quoteEn")} className="sm:col-span-3"><Textarea rows={3} value={v.quoteEn} onChange={(e) => set("quoteEn", e.target.value)} /></Field>
        <Field label="Quote (Arabic)" className="sm:col-span-3"><Textarea rows={3} dir="rtl" value={v.quoteAr} onChange={(e) => set("quoteAr", e.target.value)} /></Field>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-3"><Check label="Sample text (not a real customer yet)" checked={v.isSample} onChange={(c) => set("isSample", c)} /><Check label="Visible" checked={v.isActive} onChange={(c) => set("isActive", c)} /><Button type="submit" disabled={save.pending}>Save</Button>{initial.id > 0 && <Button type="button" variant="ghost" className="text-destructive" disabled={del.pending} onClick={() => { if (window.confirm("Delete this testimonial?")) del.run(() => deleteTestimonialAction({ id: initial.id }), { ok: "Deleted", onDone: onClose }) }}>Delete</Button>}</div>
        {(save.error || del.error) && <p role="alert" className="text-sm text-destructive sm:col-span-3">{save.error ?? del.error}</p>}
      </form>
    </Panel>
  )
}

/* ---------- Client logos ---------- */
function LogoTab({ rows }: { rows: LogoRow[] }) {
  const [editing, setEditing] = useState<LogoRow | null>(null)
  if (editing) return <LogoForm key={editing.id} initial={editing} onClose={() => setEditing(null)} />
  return (
    <Panel title="Client logos" description="Only add a logo with the client's permission." actions={<Button size="sm" onClick={() => setEditing({ id: 0, name: "", url: "", sort: (rows.at(-1)?.sort ?? 0) + 10, isActive: true, image: null })}><Plus data-icon="inline-start" />New logo</Button>}>
      <ul className="divide-y text-sm">
        {rows.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2"><span className="flex items-center gap-3">{r.image && <span className="size-10 overflow-hidden rounded border bg-surface"><Thumb item={r.image} size={96} /></span>}{r.name}</span><Button size="xs" variant="outline" onClick={() => setEditing(r)}>Edit</Button></li>)}
        {rows.length === 0 && <li className="py-6 text-center text-muted-foreground">No logos yet.</li>}
      </ul>
    </Panel>
  )
}
function LogoForm({ initial, onClose }: { initial: LogoRow; onClose: () => void }) {
  const save = useSave(); const del = useSave(); const [v, setV] = useState(initial)
  const set = <K extends keyof LogoRow>(k: K, val: LogoRow[K]) => setV((c) => ({ ...c, [k]: val }))
  return (
    <Panel title={initial.id ? "Edit logo" : "New logo"} actions={<Button size="sm" variant="ghost" onClick={onClose}>Back</Button>}>
      <form noValidate className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.run(() => saveLogoAction({ id: v.id || undefined, name: v.name, mediaId: v.image?.id ?? null, url: v.url, sort: v.sort, isActive: v.isActive }), { onDone: onClose }) }}>
        <Field label="Company" error={save.err("name")}><Input value={v.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Website" hint="Optional, https://" error={save.err("url")}><Input value={v.url} onChange={(e) => set("url", e.target.value)} /></Field>
        <div className="flex items-center gap-3 sm:col-span-2">{v.image && <div className="size-16 overflow-hidden rounded border bg-surface"><Thumb item={v.image} size={160} /></div>}<MediaPicker label="Choose logo" onPick={(p) => p[0] && set("image", p[0])} /></div>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2"><Check label="Visible" checked={v.isActive} onChange={(c) => set("isActive", c)} /><Button type="submit" disabled={save.pending}>Save</Button>{initial.id > 0 && <Button type="button" variant="ghost" className="text-destructive" disabled={del.pending} onClick={() => { if (window.confirm("Delete this logo?")) del.run(() => deleteLogoAction({ id: initial.id }), { ok: "Deleted", onDone: onClose }) }}>Delete</Button>}</div>
        {(save.error || del.error) && <p role="alert" className="text-sm text-destructive sm:col-span-2">{save.error ?? del.error}</p>}
      </form>
    </Panel>
  )
}
