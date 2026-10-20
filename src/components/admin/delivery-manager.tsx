"use client"

import { useState } from "react"

import { addBlackoutAction, deleteBlackoutAction, saveSlotAction, saveZoneAction } from "@/app/(admin)/admin/(app)/delivery/actions"
import { Check, Field, Panel } from "@/components/admin/fields"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { formatMoney } from "@/lib/format"

export type ZoneRow = { id?: number; emirate: "dubai" | "abu_dhabi" | "sharjah"; nameEn: string; nameAr: string; fee: number; freeOver: number | null; minOrder: number; sameDayAvailable: boolean; isActive: boolean; sort: number }
export type SlotRow = { id?: number; labelEn: string; labelAr: string; startTime: string; endTime: string; sameDayCutoff: string | null; extraFee: number; capacityPerDay: number; daysMask: number; isActive: boolean; sort: number }
export type BlackoutRow = { id: number; day: string; emirate: string | null; reasonEn: string }

const EMIRATE_LABEL = { dubai: "Dubai", abu_dhabi: "Abu Dhabi", sharjah: "Sharjah" }
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const num = (s: string) => (s === "" ? 0 : Number(s.replace(/[^\d.]/g, "")) || 0)

export function DeliveryManager({ zones, slots, blackouts, canWrite }: { zones: ZoneRow[]; slots: SlotRow[]; blackouts: BlackoutRow[]; canWrite: boolean }) {
  const [zone, setZone] = useState<ZoneRow | null>(null)
  const [slot, setSlot] = useState<SlotRow | null>(null)
  const zs = useSave()
  const ss = useSave()
  const bs = useSave()
  const [bo, setBo] = useState({ day: "", emirate: "", reasonEn: "" })

  return (
    <div className="grid gap-6">
      <Panel title="Delivery zones" description="Fee, free-delivery threshold and minimum order per area. Shown at checkout before payment." actions={canWrite ? <Button size="sm" onClick={() => { zs.clear(); setZone({ emirate: "dubai", nameEn: "", nameAr: "", fee: 25, freeOver: 400, minOrder: 150, sameDayAvailable: true, isActive: true, sort: zones.length }) }}>Add zone</Button> : undefined}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Zone</th><th className="py-1 text-right font-medium">Fee</th><th className="py-1 text-right font-medium">Free over</th><th className="py-1 text-right font-medium">Minimum</th><th className="py-1 font-medium">Same day</th><th className="py-1 font-medium">State</th></tr></thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className="border-t">
                <td className="py-2">{canWrite ? <button type="button" className="text-start font-medium text-primary underline-offset-4 hover:underline" onClick={() => { zs.clear(); setZone(z) }}>{z.nameEn}</button> : z.nameEn}<span className="meta block">{EMIRATE_LABEL[z.emirate]}</span></td>
                <td className="num py-2 text-right">{formatMoney(Math.round(z.fee * 100), "en", { compact: true })}</td>
                <td className="num py-2 text-right">{z.freeOver == null ? "never" : formatMoney(Math.round(z.freeOver * 100), "en", { compact: true })}</td>
                <td className="num py-2 text-right">{formatMoney(Math.round(z.minOrder * 100), "en", { compact: true })}</td>
                <td className="py-2">{z.sameDayAvailable ? "Yes" : "No"}</td>
                <td className="py-2">{z.isActive ? "Active" : <span className="text-muted-foreground">Off</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Delivery windows" description="Capacity is orders per day. The same-day cut-off is the latest local time (Dubai) to order for that window on the delivery day; leave empty to require ordering the day before." actions={canWrite ? <Button size="sm" onClick={() => { ss.clear(); setSlot({ labelEn: "", labelAr: "", startTime: "09:00", endTime: "12:00", sameDayCutoff: "08:00", extraFee: 0, capacityPerDay: 20, daysMask: 127, isActive: true, sort: slots.length }) }}>Add window</Button> : undefined}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Window</th><th className="py-1 font-medium">Time</th><th className="py-1 font-medium">Same-day cut-off</th><th className="py-1 text-right font-medium">Extra fee</th><th className="py-1 text-right font-medium">Capacity</th><th className="py-1 font-medium">State</th></tr></thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="py-2">{canWrite ? <button type="button" className="text-start font-medium text-primary underline-offset-4 hover:underline" onClick={() => { ss.clear(); setSlot(s) }}>{s.labelEn}</button> : s.labelEn}</td>
                <td className="num py-2">{s.startTime} to {s.endTime}</td>
                <td className="num py-2">{s.sameDayCutoff ?? "day before"}</td>
                <td className="num py-2 text-right">{s.extraFee ? formatMoney(Math.round(s.extraFee * 100), "en", { compact: true }) : "none"}</td>
                <td className="num py-2 text-right">{s.capacityPerDay}</td>
                <td className="py-2">{s.isActive ? "Active" : <span className="text-muted-foreground">Off</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Blackout dates" description="Public holidays and days you cannot deliver. Customers cannot choose these dates.">
        {blackouts.length === 0 ? <p className="meta">No blackout dates.</p> : (
          <ul className="mb-4 grid gap-1 text-sm">
            {blackouts.map((b) => (
              <li key={b.id} className="flex items-center justify-between border-t py-1.5"><span><span className="num font-medium">{b.day}</span> {b.emirate ? `(${EMIRATE_LABEL[b.emirate as keyof typeof EMIRATE_LABEL]})` : "(all emirates)"} · {b.reasonEn}</span>{canWrite && <Button variant="ghost" size="xs" disabled={bs.pending} onClick={() => bs.run(() => deleteBlackoutAction({ id: b.id }), { ok: "Removed" })}>Remove</Button>}</li>
            ))}
          </ul>
        )}
        {canWrite && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); bs.run(() => addBlackoutAction({ day: bo.day, emirate: (bo.emirate || null) as "dubai" | null, reasonEn: bo.reasonEn, reasonAr: "" }), { ok: "Added", onDone: () => setBo({ day: "", emirate: "", reasonEn: "" }) }) }}>
            <Field label="Date" error={bs.err("day")}><Input type="date" value={bo.day} onChange={(e) => setBo({ ...bo, day: e.target.value })} required /></Field>
            <Field label="Emirate"><NativeSelect value={bo.emirate} onChange={(e) => setBo({ ...bo, emirate: e.target.value })}><option value="">All</option>{Object.entries(EMIRATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field>
            <Field label="Reason" error={bs.err("reasonEn")} className="min-w-56"><Input value={bo.reasonEn} onChange={(e) => setBo({ ...bo, reasonEn: e.target.value })} required /></Field>
            <Button type="submit" size="sm" disabled={bs.pending}>Add date</Button>
            {bs.error && <p role="alert" className="w-full text-sm text-destructive">{bs.error}</p>}
          </form>
        )}
      </Panel>

      <Dialog open={!!zone} onOpenChange={(o) => !o && setZone(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{zone?.id ? "Edit zone" : "New zone"}</DialogTitle><DialogDescription>Amounts are in AED and include VAT.</DialogDescription></DialogHeader>
          {zone && (
            <form className="grid gap-3" noValidate onSubmit={(e) => { e.preventDefault(); zs.run(() => saveZoneAction(zone), { onDone: () => setZone(null) }) }}>
              {zs.error && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{zs.error}</p>}
              <Field label="Emirate"><NativeSelect value={zone.emirate} onChange={(e) => setZone({ ...zone, emirate: e.target.value as ZoneRow["emirate"] })}>{Object.entries(EMIRATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field>
              <Field label="Name (English)" error={zs.err("nameEn")}><Input value={zone.nameEn} onChange={(e) => setZone({ ...zone, nameEn: e.target.value })} /></Field>
              <Field label="Name (Arabic)"><Input dir="rtl" value={zone.nameAr} onChange={(e) => setZone({ ...zone, nameAr: e.target.value })} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Delivery fee"><Input inputMode="decimal" value={zone.fee} onChange={(e) => setZone({ ...zone, fee: num(e.target.value) })} className="num" /></Field>
                <Field label="Free over" hint="Empty = never"><Input inputMode="decimal" value={zone.freeOver ?? ""} onChange={(e) => setZone({ ...zone, freeOver: e.target.value === "" ? null : num(e.target.value) })} className="num" /></Field>
                <Field label="Minimum order"><Input inputMode="decimal" value={zone.minOrder} onChange={(e) => setZone({ ...zone, minOrder: num(e.target.value) })} className="num" /></Field>
              </div>
              <Check label="Same-day delivery available" checked={zone.sameDayAvailable} onChange={(v) => setZone({ ...zone, sameDayAvailable: v })} />
              <Check label="Active" checked={zone.isActive} onChange={(v) => setZone({ ...zone, isActive: v })} />
              <div className="flex justify-end"><Button type="submit" disabled={zs.pending}>{zs.pending && <Spinner data-icon="inline-start" />}Save zone</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!slot} onOpenChange={(o) => !o && setSlot(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{slot?.id ? "Edit window" : "New window"}</DialogTitle><DialogDescription>Times are local (Asia/Dubai).</DialogDescription></DialogHeader>
          {slot && (
            <form className="grid gap-3" noValidate onSubmit={(e) => { e.preventDefault(); ss.run(() => saveSlotAction(slot), { onDone: () => setSlot(null) }) }}>
              {ss.error && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{ss.error}</p>}
              <Field label="Label (English)" error={ss.err("labelEn")}><Input value={slot.labelEn} onChange={(e) => setSlot({ ...slot, labelEn: e.target.value })} placeholder="Morning, 9:00 to 12:00" /></Field>
              <Field label="Label (Arabic)"><Input dir="rtl" value={slot.labelAr} onChange={(e) => setSlot({ ...slot, labelAr: e.target.value })} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Starts" error={ss.err("startTime")}><Input type="time" value={slot.startTime} onChange={(e) => setSlot({ ...slot, startTime: e.target.value })} className="num" /></Field>
                <Field label="Ends" error={ss.err("endTime")}><Input type="time" value={slot.endTime} onChange={(e) => setSlot({ ...slot, endTime: e.target.value })} className="num" /></Field>
                <Field label="Same-day cut-off" error={ss.err("sameDayCutoff")} hint="Empty = day before"><Input type="time" value={slot.sameDayCutoff ?? ""} onChange={(e) => setSlot({ ...slot, sameDayCutoff: e.target.value || null })} className="num" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Extra fee (AED)"><Input inputMode="decimal" value={slot.extraFee} onChange={(e) => setSlot({ ...slot, extraFee: num(e.target.value) })} className="num" /></Field>
                <Field label="Orders per day"><Input inputMode="numeric" value={slot.capacityPerDay} onChange={(e) => setSlot({ ...slot, capacityPerDay: Math.round(num(e.target.value)) })} className="num" /></Field>
              </div>
              <fieldset><legend className="mb-1 text-sm font-medium">Days available</legend>
                <div className="flex flex-wrap gap-3">{DAYS.map((d, i) => <Check key={d} label={d} checked={!!((slot.daysMask >> i) & 1)} onChange={(v) => setSlot({ ...slot, daysMask: v ? slot.daysMask | (1 << i) : slot.daysMask & ~(1 << i) })} />)}</div>
              </fieldset>
              <Check label="Active" checked={slot.isActive} onChange={(v) => setSlot({ ...slot, isActive: v })} />
              <div className="flex justify-end"><Button type="submit" disabled={ss.pending}>{ss.pending && <Spinner data-icon="inline-start" />}Save window</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
