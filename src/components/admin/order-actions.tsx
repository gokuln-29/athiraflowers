"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { changeStatusAction, issueInvoiceAction, markCodCollectedAction, refundAction, resendEmailAction, saveStaffNoteAction } from "@/app/(admin)/admin/(app)/orders/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { notify } from "@/components/ui/toast"
import type { OrderStatus } from "@/db/schema"
import { STATUS_LABEL } from "@/server/orders/state"

type Props = {
  orderId: number
  status: OrderStatus
  next: OrderStatus[]
  paymentMethod: string
  paymentStatus: string
  totalMinor: number
  refundableMinor: number
  invoiceRequested: boolean
  invoiceNumber: string | null
  staffNote: string
  canWrite: boolean
}

export function OrderActions(p: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [refund, setRefund] = useState((p.refundableMinor / 100).toFixed(2))
  const [note, setNote] = useState(p.staffNote)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (r.ok) {
        notify(ok, "success")
        router.refresh()
      } else setError(r.error ?? "Something went wrong.")
    })

  if (!p.canWrite) return <p className="meta">You can view this order but not change it.</p>
  const forward = p.next.filter((s) => s !== "cancelled" && s !== "refunded")
  return (
    <div className="grid gap-5">
      {error && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {forward.map((s) => (
          <Button key={s} disabled={pending} onClick={() => run(() => changeStatusAction({ id: p.orderId, to: s }), `Marked ${STATUS_LABEL[s].toLowerCase()}`)}>
            {pending && <Spinner data-icon="inline-start" />}Mark {STATUS_LABEL[s].toLowerCase()}
          </Button>
        ))}
        {p.paymentMethod === "cod" && p.paymentStatus !== "paid" && p.status !== "cancelled" && (
          <Button variant="outline" disabled={pending} onClick={() => run(() => markCodCollectedAction({ id: p.orderId }), "Cash recorded as collected")}>Mark cash collected</Button>
        )}
        {p.next.includes("cancelled") && (
          <Dialog>
            <DialogTrigger render={<Button variant="outline" className="text-destructive" />}>Cancel order</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel this order?</DialogTitle>
                <DialogDescription>Stock is returned to the shelf and the customer is emailed. If it was paid by card, refund it afterwards.</DialogDescription>
              </DialogHeader>
              <label className="grid gap-1 text-sm font-medium">Reason (shown in the audit trail)<Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></label>
              <Button variant="destructive" disabled={pending || reason.trim().length < 3} onClick={() => run(() => changeStatusAction({ id: p.orderId, to: "cancelled", note: reason }), "Order cancelled")}>Cancel order</Button>
            </DialogContent>
          </Dialog>
        )}
        {(p.paymentStatus === "paid" || p.paymentStatus === "partially_refunded") && p.refundableMinor > 0 && (
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Refund</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Refund payment</DialogTitle>
                <DialogDescription>{p.paymentMethod === "stripe" ? "The refund is sent to the customer's card through Stripe." : "Record a refund you have paid by bank transfer."} Up to AED {(p.refundableMinor / 100).toFixed(2)}.</DialogDescription>
              </DialogHeader>
              <label className="grid gap-1 text-sm font-medium">Amount (AED)<Input value={refund} inputMode="decimal" onChange={(e) => setRefund(e.target.value)} className="num" /></label>
              <label className="grid gap-1 text-sm font-medium">Reason<Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} /></label>
              <Button disabled={pending || reason.trim().length < 3} onClick={() => run(() => refundAction({ id: p.orderId, amountMinor: Math.round(Number(refund) * 100), reason }), "Refund submitted")}>Refund</Button>
            </DialogContent>
          </Dialog>
        )}
        {p.next.includes("refunded") && (
          <Button variant="outline" disabled={pending} onClick={() => run(() => changeStatusAction({ id: p.orderId, to: "refunded" }), "Marked refunded")}>Mark refunded</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        {p.invoiceNumber ? (
          <Button variant="outline" size="sm" render={<a href={`/api/admin/orders/${p.orderId}/invoice`} />}>Invoice {p.invoiceNumber} (PDF)</Button>
        ) : (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => issueInvoiceAction({ id: p.orderId }), "Invoice number issued")}>Issue tax invoice</Button>
        )}
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => resendEmailAction({ id: p.orderId }), "Email sent")}>Resend customer email</Button>
      </div>

      <form className="grid gap-2 border-t pt-4" onSubmit={(e) => { e.preventDefault(); run(() => saveStaffNoteAction({ id: p.orderId, note }), "Note saved") }}>
        <label htmlFor="staff-note" className="text-sm font-medium">Internal note</label>
        <Textarea id="staff-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Only staff see this." />
        <div><Button type="submit" size="sm" variant="outline" disabled={pending}>Save note</Button></div>
      </form>
    </div>
  )
}
