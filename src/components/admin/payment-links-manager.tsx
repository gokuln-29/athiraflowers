"use client"

import { Copy } from "lucide-react"
import { useState } from "react"

import { cancelPaymentLinkAction, createPaymentLinkAction } from "@/app/(admin)/admin/(app)/payment-links/actions"
import { Field, Panel } from "@/components/admin/fields"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { notify } from "@/components/ui/toast"
import { formatDate, formatMoney } from "@/lib/format"

export type LinkRow = { id: number; token: string; title: string; amountMinor: number; status: string; customer: string | null; expiresAt: string | null; paidAt: string | null; url: string }

export function PaymentLinksManager({ rows }: { rows: LinkRow[] }) {
  const save = useSave()
  const cancel = useSave()
  const [f, setF] = useState({ title: "", description: "", amount: "", customerName: "", customerEmail: "", expiresInDays: "7" })
  const [created, setCreated] = useState<string | null>(null)
  return (
    <div className="grid gap-6">
      <Panel title="Create a payment link" description="For deposits, balances and one-off charges. The customer pays by card on a secure Stripe page; the link is marked paid only when Stripe confirms the payment.">
        <form className="grid gap-3 sm:grid-cols-3" noValidate onSubmit={(e) => { e.preventDefault(); save.run(() => createPaymentLinkAction({ title: f.title, description: f.description, amount: Number(f.amount), customerName: f.customerName, customerEmail: f.customerEmail, expiresInDays: Number(f.expiresInDays) }), { ok: "Link created", onDone: (d) => { setCreated(d.url); setF({ title: "", description: "", amount: "", customerName: "", customerEmail: "", expiresInDays: "7" }) } }) }}>
          <Field label="What is it for?" error={save.err("title")} className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Event deposit, Al Noor Trading" /></Field>
          <Field label="Amount (AED, incl. VAT)" error={save.err("amount")}><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, "") })} className="num" /></Field>
          <Field label="Customer name" hint="Optional"><Input value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} /></Field>
          <Field label="Customer email" error={save.err("customerEmail")} hint="Optional, pre-fills the payment page"><Input type="email" autoComplete="off" spellCheck={false} value={f.customerEmail} onChange={(e) => setF({ ...f, customerEmail: e.target.value })} /></Field>
          <Field label="Valid for (days)"><Input inputMode="numeric" value={f.expiresInDays} onChange={(e) => setF({ ...f, expiresInDays: e.target.value.replace(/\D/g, "") })} className="num" /></Field>
          <Field label="Note shown to the customer" className="sm:col-span-3"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={400} /></Field>
          {save.error && <p role="alert" className="text-sm text-destructive sm:col-span-3">{save.error}</p>}
          <div><Button type="submit" disabled={save.pending}>Create link</Button></div>
        </form>
        {created && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
            <input readOnly value={created} aria-label="Payment link" className="num h-8 flex-1 bg-transparent" onFocus={(e) => e.currentTarget.select()} />
            <Button size="xs" variant="outline" onClick={async () => { await navigator.clipboard.writeText(created); notify("Link copied", "success") }}><Copy data-icon="inline-start" />Copy</Button>
          </div>
        )}
      </Panel>

      <Panel title="Links">
        {cancel.error && <p role="alert" className="mb-2 text-sm text-destructive">{cancel.error}</p>}
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">For</th><th className="py-1 text-right font-medium">Amount</th><th className="py-1 font-medium">Status</th><th className="py-1 font-medium">Expires</th><th className="py-1"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.title}{r.customer && <span className="meta block">{r.customer}</span>}</td>
                  <td className="num py-2 text-right">{formatMoney(r.amountMinor, "en")}</td>
                  <td className="py-2">{r.status === "paid" ? <span className="font-medium text-success">Paid {r.paidAt ? formatDate(r.paidAt, "en", { dateStyle: "medium" }) : ""}</span> : r.status}</td>
                  <td className="py-2">{r.expiresAt ? formatDate(r.expiresAt, "en", { dateStyle: "medium" }) : "never"}</td>
                  <td className="py-2 text-right">
                    {r.status === "active" && (
                      <span className="inline-flex gap-1">
                        <Button size="xs" variant="outline" onClick={async () => { await navigator.clipboard.writeText(r.url); notify("Link copied", "success") }}>Copy link</Button>
                        <Button size="xs" variant="ghost" className="text-destructive" disabled={cancel.pending} onClick={() => cancel.run(() => cancelPaymentLinkAction({ id: r.id }), { ok: "Link cancelled" })}>Cancel</Button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No payment links yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
