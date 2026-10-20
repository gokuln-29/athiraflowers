"use client"

import { useState } from "react"

import { saveSettingsAction } from "@/app/(admin)/admin/(app)/settings/actions"
import type { MediaItem } from "@/app/(admin)/admin/(app)/media/actions"
import { Check, Field, Panel } from "@/components/admin/fields"
import { MediaPicker, Thumb } from "@/components/admin/media-picker"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { StoreSettings } from "@/server/queries/content"

type Group = "contact" | "business" | "social" | "checkout" | "heroes"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SettingValue = any

function GroupForm({ group, title, description, initial, children }: { group: Group; title: string; description: string; initial: Record<string, unknown>; children: (v: Record<string, SettingValue>, set: (k: string, val: unknown) => void, err: (k: string) => string | undefined) => React.ReactNode }) {
  const [v, setV] = useState<Record<string, SettingValue>>(initial)
  const save = useSave()
  return (
    <Panel title={title} description={description}>
      <form noValidate className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.run(() => saveSettingsAction({ group, value: v }), { ok: `${title} saved` }) }}>
        {save.error && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{save.error}</p>}
        {children(v, (k, val) => setV((p) => ({ ...p, [k]: val })), save.err)}
        <div><Button type="submit" size="sm" disabled={save.pending}>{save.pending && <Spinner data-icon="inline-start" />}Save {title.toLowerCase()}</Button></div>
      </form>
    </Panel>
  )
}

export function SettingsForms({ settings, heroMedia }: { settings: StoreSettings; heroMedia: Record<string, MediaItem | null> }) {
  const s = settings as unknown as Record<string, Record<string, SettingValue>>
  const [heroes, setHeroes] = useState<Record<string, MediaItem | null>>(heroMedia)
  const heroSave = useSave()
  return (
    <div className="grid gap-6">
      <GroupForm group="business" title="Business details" description="Shown on the website footer and on every tax invoice. UAE tax invoices must show your Tax Registration Number (TRN)." initial={s.business}>
        {(v, set, err) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Legal name" error={err("legalName")}><Input value={v.legalName} onChange={(e) => set("legalName", e.target.value)} /></Field>
            <Field label="TRN" error={err("trn")} hint="15 digits"><Input value={v.trn} inputMode="numeric" maxLength={15} onChange={(e) => set("trn", e.target.value.replace(/\D/g, ""))} className="num" /></Field>
            <Field label="Trade licence number"><Input value={v.licenceNo} onChange={(e) => set("licenceNo", e.target.value)} /></Field>
            <Field label="Address on invoices"><Input value={v.invoiceAddress} onChange={(e) => set("invoiceAddress", e.target.value)} /></Field>
            <Field label="Bank details for invoices" className="sm:col-span-2"><Textarea rows={2} value={v.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} /></Field>
          </div>
        )}
      </GroupForm>

      <GroupForm group="contact" title="Contact" description="WhatsApp click-to-chat, phone, email, hours and address, shown across the site." initial={s.contact}>
        {(v, set, err) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp number" error={err("whatsapp")} hint="International format. Leave empty to hide the WhatsApp buttons."><Input value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className="num" dir="ltr" /></Field>
            <Field label="Phone"><Input value={v.phone} onChange={(e) => set("phone", e.target.value)} className="num" dir="ltr" /></Field>
            <Field label="Email" error={err("email")}><Input type="email" autoComplete="off" spellCheck={false} value={v.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <span />
            <Field label="Address (English)"><Input value={v.addressEn} onChange={(e) => set("addressEn", e.target.value)} /></Field>
            <Field label="Address (Arabic)"><Input dir="rtl" value={v.addressAr} onChange={(e) => set("addressAr", e.target.value)} /></Field>
            <Field label="Hours (English)"><Input value={v.hoursEn} onChange={(e) => set("hoursEn", e.target.value)} /></Field>
            <Field label="Hours (Arabic)"><Input dir="rtl" value={v.hoursAr} onChange={(e) => set("hoursAr", e.target.value)} /></Field>
            <Field label="WhatsApp opening message (English)"><Input value={v.whatsappMessageEn} onChange={(e) => set("whatsappMessageEn", e.target.value)} /></Field>
            <Field label="WhatsApp opening message (Arabic)"><Input dir="rtl" value={v.whatsappMessageAr} onChange={(e) => set("whatsappMessageAr", e.target.value)} /></Field>
          </div>
        )}
      </GroupForm>

      <GroupForm group="checkout" title="Checkout" description="Minimums, payment methods and the policy text customers see at checkout." initial={s.checkout}>
        {(v, set, err) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Minimum order (AED)" error={err("minOrderMinor")}><Input inputMode="decimal" value={(v.minOrderMinor / 100).toString()} onChange={(e) => set("minOrderMinor", Math.round((Number(e.target.value.replace(/[^\d.]/g, "")) || 0) * 100))} className="num" /></Field>
            <Field label="Cash on delivery limit (AED)"><Input inputMode="decimal" value={(v.codMaxMinor / 100).toString()} onChange={(e) => set("codMaxMinor", Math.round((Number(e.target.value.replace(/[^\d.]/g, "")) || 0) * 100))} className="num" /></Field>
            <Check label="Offer cash on delivery" checked={v.codEnabled} onChange={(x) => set("codEnabled", x)} />
            <Check label="Offer card payment (Stripe)" checked={v.stripeEnabled} onChange={(x) => set("stripeEnabled", x)} />
            <Field label="Substitution policy (English)"><Textarea rows={2} value={v.substitutionPolicyEn} onChange={(e) => set("substitutionPolicyEn", e.target.value)} /></Field>
            <Field label="Substitution policy (Arabic)"><Textarea rows={2} dir="rtl" value={v.substitutionPolicyAr} onChange={(e) => set("substitutionPolicyAr", e.target.value)} /></Field>
            <Field label="Deposit note (English)"><Textarea rows={2} value={v.depositNoteEn} onChange={(e) => set("depositNoteEn", e.target.value)} /></Field>
            <Field label="Deposit note (Arabic)"><Textarea rows={2} dir="rtl" value={v.depositNoteAr} onChange={(e) => set("depositNoteAr", e.target.value)} /></Field>
          </div>
        )}
      </GroupForm>

      <GroupForm group="social" title="Social links" description="Shown in the footer when filled in." initial={s.social}>
        {(v, set, err) => (
          <div className="grid gap-3 sm:grid-cols-2">
            {(["instagram", "facebook", "linkedin", "tiktok"] as const).map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)} error={err(k)}><Input value={v[k]} onChange={(e) => set(k, e.target.value)} placeholder="https://" dir="ltr" /></Field>)}
          </div>
        )}
      </GroupForm>

      <Panel title="Page images" description="The large photograph at the top of each page.">
        <div className="grid gap-4 sm:grid-cols-3">
          {(["corporate", "events", "about", "contact", "offers", "blog"] as const).map((k) => (
            <div key={k} className="grid gap-2">
              <p className="text-sm font-medium capitalize">{k}</p>
              <div className="aspect-[3/2] overflow-hidden rounded-md bg-muted">{heroes[k] && <Thumb item={heroes[k]!} size={480} />}</div>
              <MediaPicker label={heroes[k] ? "Change" : "Choose"} onPick={(p) => setHeroes((h) => ({ ...h, [k]: p[0] ?? null }))} />
            </div>
          ))}
        </div>
        {heroSave.error && <p role="alert" className="mt-2 text-sm text-destructive">{heroSave.error}</p>}
        <div className="mt-4"><Button size="sm" disabled={heroSave.pending} onClick={() => heroSave.run(() => saveSettingsAction({ group: "heroes", value: Object.fromEntries(Object.entries(heroes).map(([k, m]) => [k, m?.id ?? null])) }), { ok: "Page images saved" })}>Save page images</Button></div>
      </Panel>
    </div>
  )
}
