"use client"

import { useState } from "react"

import { addLeadNoteAction, getLeadAction, moveLeadAction, updateLeadAction } from "@/app/(admin)/admin/(app)/leads/actions"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { LEAD_STATUSES, type LeadStatus } from "@/db/schema"
import { formatDate, formatMoney } from "@/lib/format"

export type LeadCard = { id: number; name: string; company: string | null; type: string; status: LeadStatus; createdAt: string; valueMinor: number | null; assignee: string | null }
type Detail = { lead: { id: number; name: string; company: string | null; email: string; phone: string | null; message: string | null; details: Record<string, unknown> | null; type: string; status: LeadStatus; assignedTo: number | null; estimatedValueMinor: number | null; sourcePath: string | null; locale: string; createdAt: string }; notes: { id: number; body: string; who: string; at: string }[] }

const TITLES: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", qualified: "Qualified", proposal: "Proposal sent", won: "Won", lost: "Lost" }
const TYPES: Record<string, string> = { corporate_quote: "Corporate quote", event: "Event", program: "Program", gift_bulk: "Bulk gifts", contact: "Message" }

export function LeadsBoard({ leads: initial, admins, canWrite }: { leads: LeadCard[]; admins: { id: number; name: string }[]; canWrite: boolean }) {
  const [leads, setLeads] = useState(initial)
  const [open, setOpen] = useState<Detail | null>(null)
  const [overCol, setOverCol] = useState<LeadStatus | null>(null)
  const [note, setNote] = useState("")
  const [value, setValue] = useState("")
  const save = useSave()

  async function move(id: number, status: LeadStatus) {
    const prev = leads
    setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, status } : l))) // optimistic
    const r = await moveLeadAction({ id, status })
    if (!r.ok) setLeads(prev)
  }
  async function load(id: number) {
    const r = await getLeadAction({ id })
    if (r.ok) { setOpen(r.data as Detail); setValue(r.data.lead.estimatedValueMinor ? String(r.data.lead.estimatedValueMinor / 100) : ""); setNote("") }
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4" role="list" aria-label="Lead pipeline">
        {LEAD_STATUSES.map((s) => {
          const col = leads.filter((l) => l.status === s)
          return (
            <section
              key={s}
              role="listitem"
              aria-label={`${TITLES[s]}, ${col.length} leads`}
              onDragOver={(e) => { if (canWrite) { e.preventDefault(); setOverCol(s) } }}
              onDragLeave={() => setOverCol((c) => (c === s ? null : c))}
              onDrop={(e) => { e.preventDefault(); setOverCol(null); const id = Number(e.dataTransfer.getData("text/lead")); if (id && canWrite) move(id, s) }}
              className={`w-64 shrink-0 rounded-lg bg-muted/60 p-2 ${overCol === s ? "ring-2 ring-primary" : ""}`}
            >
              <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold">{TITLES[s]}<span className="meta num font-normal">{col.length}</span></h2>
              <ul className="grid gap-2">
                {col.map((l) => (
                  <li key={l.id}>
                    <button type="button" draggable={canWrite} onDragStart={(e) => e.dataTransfer.setData("text/lead", String(l.id))} onClick={() => load(l.id)} className="panel block w-full p-3 text-start text-sm hover:border-foreground/30">
                      <span className="block font-medium">{l.name}</span>
                      {l.company && <span className="meta block">{l.company}</span>}
                      <span className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs"><span>{TYPES[l.type] ?? l.type}</span><span className="meta num">{formatDate(l.createdAt, "en", { day: "numeric", month: "short" })}</span></span>
                      {l.valueMinor ? <span className="num mt-1 block text-xs font-medium">{formatMoney(l.valueMinor, "en", { compact: true })}</span> : null}
                    </button>
                  </li>
                ))}
                {col.length === 0 && <li className="meta px-1 py-4 text-center">Empty</li>}
              </ul>
            </section>
          )
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.lead.name}{open.lead.company ? `, ${open.lead.company}` : ""}</DialogTitle>
                <DialogDescription>{TYPES[open.lead.type] ?? open.lead.type} received {formatDate(open.lead.createdAt, "en", { dateStyle: "medium", timeStyle: "short" })} via {open.lead.sourcePath ?? "the website"} ({open.lead.locale === "ar" ? "Arabic" : "English"})</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1 text-sm">
                  <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${open.lead.email}`}>{open.lead.email}</a>
                  {open.lead.phone && <a className="num text-primary underline-offset-4 hover:underline" dir="ltr" href={`tel:${open.lead.phone.replace(/\s/g, "")}`}>{open.lead.phone}</a>}
                  {open.lead.message && <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2">{open.lead.message}</p>}
                </div>
                <dl className="grid content-start gap-1 text-sm">
                  {Object.entries(open.lead.details ?? {}).filter(([, v]) => v !== null && v !== "").map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="meta">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</dt><dd className="num text-end">{String(v)}</dd></div>)}
                </dl>
              </div>
              {canWrite && (
                <form className="grid gap-3 border-t pt-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); const to = LEAD_STATUSES.includes(form.get("status") as LeadStatus) ? (form.get("status") as LeadStatus) : open.lead.status; const assigned = Number(form.get("assignee")) || null; save.run(async () => { if (to !== open.lead.status) await move(open.lead.id, to); return updateLeadAction({ id: open.lead.id, assignedTo: assigned, estimatedValue: value === "" ? null : Number(value) }) }, { ok: "Lead updated" }) }}>
                  <label className="grid gap-1 text-sm font-medium">Stage<NativeSelect name="status" defaultValue={open.lead.status}>{LEAD_STATUSES.map((s) => <option key={s} value={s}>{TITLES[s]}</option>)}</NativeSelect></label>
                  <label className="grid gap-1 text-sm font-medium">Owner<NativeSelect name="assignee" defaultValue={open.lead.assignedTo ?? ""}><option value="">Unassigned</option>{admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</NativeSelect></label>
                  <label className="grid gap-1 text-sm font-medium">Estimated value (AED)<Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} className="num" /></label>
                  {save.error && <p role="alert" className="text-sm text-destructive sm:col-span-3">{save.error}</p>}
                  <div className="sm:col-span-3"><Button type="submit" size="sm" disabled={save.pending}>Save changes</Button></div>
                </form>
              )}
              <div className="border-t pt-3">
                <h3 className="mb-2 text-sm font-semibold">Notes</h3>
                <ul className="mb-3 grid gap-2 text-sm">{open.notes.map((n) => <li key={n.id} className="rounded-md bg-muted p-2"><span className="whitespace-pre-wrap">{n.body}</span><span className="meta block">{n.who} · {formatDate(n.at, "en", { dateStyle: "short", timeStyle: "short" })}</span></li>)}{open.notes.length === 0 && <li className="meta">No notes yet.</li>}</ul>
                {canWrite && (
                  <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; save.run(() => addLeadNoteAction({ id: open.lead.id, body: note }), { ok: "Note added", onDone: () => { setNote(""); load(open.lead.id) } }) }}>
                    <label htmlFor="lead-note" className="sr-only">Add a note</label>
                    <Textarea id="lead-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Call summary, quote sent, next step…" maxLength={2000} />
                    <div><Button type="submit" size="sm" variant="outline" disabled={save.pending || !note.trim()}>Add note</Button></div>
                  </form>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
