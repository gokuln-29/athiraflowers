"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { saveCouponAction } from "@/app/(admin)/admin/(app)/offers/actions"
import { Check, Field } from "@/components/admin/fields"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

export type CouponRow = {
  id?: number; code: string; kind: "percent" | "fixed"; value: number; minOrder: number; maxDiscount: number | null; startsOn: string; endsOn: string; maxUses: number | null
  perCustomerLimit: number; isActive: boolean; isPublic: boolean; titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string; usedCount: number
}
const blank: CouponRow = { code: "", kind: "percent", value: 10, minOrder: 0, maxDiscount: null, startsOn: "", endsOn: "", maxUses: null, perCustomerLimit: 1, isActive: true, isPublic: false, titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", usedCount: 0 }
const n = (s: string) => Number(s.replace(/[^\d.]/g, "")) || 0

export function OffersManager({ rows }: { rows: CouponRow[] }) {
  const [c, setC] = useState<CouponRow | null>(null)
  const save = useSave()
  const set = <K extends keyof CouponRow>(k: K, v: CouponRow[K]) => setC((p) => (p ? { ...p, [k]: v } : p))
  return (
    <>
      <div className="mb-4"><Button onClick={() => { save.clear(); setC(blank) }}><Plus data-icon="inline-start" />New offer</Button></div>
      <div className="panel relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Discount</th><th className="px-3 py-2 font-medium">Valid</th><th className="px-3 py-2 text-right font-medium">Used</th><th className="px-3 py-2 font-medium">State</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/40">
                <td className="px-3 py-2"><button type="button" className="num font-medium text-primary underline-offset-4 hover:underline" onClick={() => { save.clear(); setC(r) }}>{r.code}</button><span className="meta block">{r.titleEn}</span></td>
                <td className="num px-3 py-2">{r.kind === "percent" ? `${r.value}%` : `AED ${r.value}`}{r.minOrder ? <span className="meta block">min AED {r.minOrder}</span> : null}</td>
                <td className="num px-3 py-2">{r.startsOn || "any time"} to {r.endsOn || "no end"}</td>
                <td className="num px-3 py-2 text-right">{r.usedCount}{r.maxUses ? ` / ${r.maxUses}` : ""}</td>
                <td className="px-3 py-2">{r.isActive ? "Active" : "Off"}{r.isPublic ? " · Public" : ""}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">No offers yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={!!c} onOpenChange={(o) => !o && setC(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{c?.id ? "Edit offer" : "New offer"}</DialogTitle><DialogDescription>Public offers appear on the Offers page. Others work only when the code is entered.</DialogDescription></DialogHeader>
          {c && (
            <form className="grid gap-3" noValidate onSubmit={(e) => { e.preventDefault(); const { usedCount: _u, ...rest } = c; void _u; save.run(() => saveCouponAction(rest), { onDone: () => setC(null) }) }}>
              {save.error && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{save.error}</p>}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Code" error={save.err("code")}><Input value={c.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="num" dir="ltr" /></Field>
                <Field label="Type"><NativeSelect value={c.kind} onChange={(e) => set("kind", e.target.value as "percent" | "fixed")}><option value="percent">Percent off</option><option value="fixed">Amount off (AED)</option></NativeSelect></Field>
                <Field label={c.kind === "percent" ? "Percent" : "Amount (AED)"} error={save.err("value")}><Input inputMode="decimal" value={c.value} onChange={(e) => set("value", n(e.target.value))} className="num" /></Field>
                <Field label="Minimum order (AED)"><Input inputMode="decimal" value={c.minOrder} onChange={(e) => set("minOrder", n(e.target.value))} className="num" /></Field>
                <Field label="Maximum discount (AED)" hint="Optional cap"><Input inputMode="decimal" value={c.maxDiscount ?? ""} onChange={(e) => set("maxDiscount", e.target.value === "" ? null : n(e.target.value))} className="num" /></Field>
                <Field label="Total uses" hint="Empty = unlimited"><Input inputMode="numeric" value={c.maxUses ?? ""} onChange={(e) => set("maxUses", e.target.value === "" ? null : Math.round(n(e.target.value)))} className="num" /></Field>
                <Field label="Starts on" hint="Dubai date"><Input type="date" value={c.startsOn} onChange={(e) => set("startsOn", e.target.value)} /></Field>
                <Field label="Ends on" error={save.err("endsOn")}><Input type="date" value={c.endsOn} onChange={(e) => set("endsOn", e.target.value)} /></Field>
                <Field label="Uses per customer" hint="0 = unlimited"><Input inputMode="numeric" value={c.perCustomerLimit} onChange={(e) => set("perCustomerLimit", Math.round(n(e.target.value)))} className="num" /></Field>
                <Field label="Title (English)"><Input value={c.titleEn} onChange={(e) => set("titleEn", e.target.value)} /></Field>
                <Field label="Title (Arabic)"><Input dir="rtl" value={c.titleAr} onChange={(e) => set("titleAr", e.target.value)} /></Field>
                <span />
                <Field label="Description (English)" className="sm:col-span-3"><Textarea rows={2} value={c.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} /></Field>
                <Field label="Description (Arabic)" className="sm:col-span-3"><Textarea rows={2} dir="rtl" value={c.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} /></Field>
              </div>
              <div className="flex gap-6"><Check label="Active" checked={c.isActive} onChange={(v) => set("isActive", v)} /><Check label="Show on the Offers page" checked={c.isPublic} onChange={(v) => set("isPublic", v)} /></div>
              <div className="flex justify-end"><Button type="submit" disabled={save.pending}>{save.pending && <Spinner data-icon="inline-start" />}Save offer</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
