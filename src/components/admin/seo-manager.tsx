"use client"

import { useState } from "react"

import { saveSeoAction } from "@/app/(admin)/admin/(app)/seo/actions"
import { Check, Field } from "@/components/admin/fields"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

export type SeoRow = { path: string; label: string; titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string; noindex: boolean; ogMediaId: number | null }

export function SeoManager({ rows }: { rows: SeoRow[] }) {
  const [row, setRow] = useState<SeoRow | null>(null)
  const save = useSave()
  return (
    <>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Page</th><th className="px-3 py-2 font-medium">Title</th><th className="px-3 py-2 font-medium">Description</th><th className="px-3 py-2 font-medium">Search engines</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.path} className="border-t">
                <td className="px-3 py-2"><button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => { save.clear(); setRow(r) }}>{r.label}</button><span className="meta num block">{r.path}</span></td>
                <td className="px-3 py-2">{r.titleEn || <span className="meta">default</span>}</td>
                <td className="px-3 py-2 max-w-xs truncate">{r.descriptionEn || <span className="meta">default</span>}</td>
                <td className="px-3 py-2">{r.noindex ? <span className="text-destructive">Hidden (noindex)</span> : "Indexed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!row} onOpenChange={(o) => !o && setRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{row?.label}</DialogTitle><DialogDescription>Leave a field empty to use the page&apos;s own text. Products and posts have their SEO fields on their own forms.</DialogDescription></DialogHeader>
          {row && (
            <form className="grid gap-3" noValidate onSubmit={(e) => { e.preventDefault(); const { label: _l, ...rest } = row; void _l; save.run(() => saveSeoAction(rest), { onDone: () => setRow(null) }) }}>
              {save.error && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{save.error}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title (English)" hint={`${row.titleEn.length}/60`}><Input value={row.titleEn} onChange={(e) => setRow({ ...row, titleEn: e.target.value })} maxLength={160} /></Field>
                <Field label="Title (Arabic)"><Input dir="rtl" value={row.titleAr} onChange={(e) => setRow({ ...row, titleAr: e.target.value })} maxLength={160} /></Field>
                <Field label="Description (English)" hint={`${row.descriptionEn.length}/155`}><Textarea rows={3} value={row.descriptionEn} onChange={(e) => setRow({ ...row, descriptionEn: e.target.value })} maxLength={320} /></Field>
                <Field label="Description (Arabic)"><Textarea rows={3} dir="rtl" value={row.descriptionAr} onChange={(e) => setRow({ ...row, descriptionAr: e.target.value })} maxLength={320} /></Field>
              </div>
              <Check label="Hide this page from search engines (noindex)" checked={row.noindex} onChange={(v) => setRow({ ...row, noindex: v })} />
              <div className="flex justify-end"><Button type="submit" disabled={save.pending}>{save.pending && <Spinner data-icon="inline-start" />}Save</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
