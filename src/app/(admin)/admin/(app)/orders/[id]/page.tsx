import { notFound } from "next/navigation"
import Link from "next/link"

import { OrderActions } from "@/components/admin/order-actions"
import { PageHeader } from "@/components/admin/shell"
import { OrderStatusBadge } from "@/components/shop/order-status-badge"
import { formatDate, formatMoney } from "@/lib/format"
import { requirePage } from "@/server/auth/admin-guards"
import { can } from "@/server/auth/permissions"
import { getOrderDetail } from "@/server/admin/orders-queries"
import { STATUS_LABEL, TRANSITIONS } from "@/server/orders/state"

export const metadata = { title: "Order" }

export default async function OrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  const ctx = await requirePage("orders:read")
  const { id } = await params
  const detail = Number.isInteger(Number(id)) ? await getOrderDetail(Number(id)) : null
  if (!detail) notFound()
  const { order: o, items, history, payments } = detail
  const m = (n: number) => formatMoney(n, "en")
  const refunded = payments.filter((p) => p.kind === "refund" && p.status === "succeeded").reduce((n, p) => n + p.amountMinor, 0)
  const refundable = o.paymentStatus === "paid" || o.paymentStatus === "partially_refunded" ? o.totalMinor - refunded : 0

  return (
    <>
      <PageHeader
        title={o.orderNumber}
        description={`Placed ${formatDate(o.createdAt, "en", { dateStyle: "medium", timeStyle: "short" })} in ${o.locale === "ar" ? "Arabic" : "English"}`}
        actions={<Link href="/admin/orders" className="text-sm text-primary underline-offset-4 hover:underline">All orders</Link>}
      />
      <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-2">
        <OrderStatusBadge status={o.status} label={STATUS_LABEL[o.status]} className="text-base" />
        <span className="text-sm">{o.paymentMethod === "cod" ? "Cash on delivery" : "Card"} · <strong className="font-medium">{o.paymentStatus.replace("_", " ")}</strong>{o.paidAt ? ` on ${formatDate(o.paidAt, "en", { dateStyle: "medium" })}` : ""}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="grid content-start gap-6 lg:col-span-8">
          <section className="panel p-4" aria-labelledby="items-h">
            <h2 id="items-h" className="mb-3 text-sm font-semibold">Items</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Product</th><th className="py-1 text-right font-medium">Unit</th><th className="py-1 text-right font-medium">Qty</th><th className="py-1 text-right font-medium">Total</th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="py-2">{i.titleEn}<span className="meta block num">{i.sku}{i.pricingType !== "one_time" ? ` · ${i.pricingType}` : ""}{i.depositUnitMinor ? ` · deposit ${m(i.depositUnitMinor)} each` : ""}</span></td>
                    <td className="num py-2 text-right">{m(i.unitPriceMinor)}</td>
                    <td className="num py-2 text-right">{i.quantity}</td>
                    <td className="num py-2 text-right">{m(i.lineTotalMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 ms-auto grid max-w-xs gap-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="num">{m(o.subtotalMinor)}</dd></div>
              {o.discountMinor > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Discount {o.couponCode ? `(${o.couponCode})` : ""}</dt><dd className="num">−{m(o.discountMinor)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="num">{m(o.deliveryFeeMinor)}</dd></div>
              {o.depositMinor > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Refundable deposit</dt><dd className="num">{m(o.depositMinor)}</dd></div>}
              <div className="flex justify-between border-t pt-1 font-semibold"><dt>Total</dt><dd className="num">{m(o.totalMinor)}</dd></div>
              <div className="meta flex justify-between"><dt>Includes VAT {o.vatBps / 100}%</dt><dd className="num">{m(o.vatMinor)}</dd></div>
              {refunded > 0 && <div className="flex justify-between text-destructive"><dt>Refunded</dt><dd className="num">−{m(refunded)}</dd></div>}
            </dl>
          </section>

          {ctx && (
            <section className="panel p-4" aria-labelledby="actions-h">
              <h2 id="actions-h" className="mb-3 text-sm font-semibold">Actions</h2>
              <OrderActions orderId={o.id} status={o.status} next={[...TRANSITIONS[o.status]]} paymentMethod={o.paymentMethod} paymentStatus={o.paymentStatus} totalMinor={o.totalMinor} refundableMinor={refundable} invoiceRequested={o.invoiceRequested} invoiceNumber={o.invoiceNumber} staffNote={o.staffNote ?? ""} canWrite={can(ctx.role, "orders:write")} />
            </section>
          )}

          <section className="panel p-4" aria-labelledby="hist-h">
            <h2 id="hist-h" className="mb-3 text-sm font-semibold">History</h2>
            <ol className="grid gap-3">
              {history.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="meta num w-36 shrink-0">{formatDate(h.createdAt, "en", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span>{h.fromStatus ? `${STATUS_LABEL[h.fromStatus]} → ` : ""}<strong className="font-medium">{STATUS_LABEL[h.toStatus]}</strong> <span className="meta">by {h.actorType}{h.note ? `: ${h.note}` : ""}</span></span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="grid content-start gap-6 lg:col-span-4">
          <section className="panel p-4 text-sm" aria-labelledby="del-h">
            <h2 id="del-h" className="mb-2 text-sm font-semibold">Delivery</h2>
            <p className="font-medium">{formatDate(o.deliveryDate, "en", { dateStyle: "full" })}</p>
            <p className="text-muted-foreground">{o.slotLabel}</p>
            <p className="mt-2">{o.recipientName}</p>
            <p className="num text-muted-foreground" dir="ltr">{o.recipientPhone}</p>
            <p className="mt-2 text-muted-foreground">{o.building}{o.street ? `, ${o.street}` : ""}, {o.area}<br />{o.zoneName}</p>
            {o.addressNotes && <p className="mt-2 rounded-md bg-muted p-2">{o.addressNotes}</p>}
          </section>
          <section className="panel p-4 text-sm" aria-labelledby="cust-h">
            <h2 id="cust-h" className="mb-2 text-sm font-semibold">Customer</h2>
            <p className="font-medium">{o.contactName}</p>
            <p className="text-muted-foreground">{o.contactEmail}</p>
            <p className="num text-muted-foreground" dir="ltr">{o.contactPhone}</p>
            {o.customerNote && <p className="mt-2 rounded-md bg-muted p-2">{o.customerNote}</p>}
          </section>
          {o.isGift && (
            <section className="panel p-4 text-sm" aria-labelledby="gift-h">
              <h2 id="gift-h" className="mb-2 text-sm font-semibold">Gift card</h2>
              <p className="whitespace-pre-wrap">{o.giftMessage}</p>
              <p className="meta mt-2">{o.hideSender ? "Do not show the sender's name." : `From ${o.giftFrom || o.contactName}`}</p>
            </section>
          )}
          {o.invoiceRequested && (
            <section className="panel p-4 text-sm" aria-labelledby="inv-h">
              <h2 id="inv-h" className="mb-2 text-sm font-semibold">Tax invoice</h2>
              <p>{o.companyName}</p>
              <p className="num text-muted-foreground">TRN {o.companyTrn}</p>
              {o.poNumber && <p className="text-muted-foreground">PO {o.poNumber}</p>}
              {o.billingAddress && <p className="text-muted-foreground">{o.billingAddress}</p>}
              <p className="meta mt-2">{o.invoiceNumber ? `Issued as ${o.invoiceNumber}` : "Number is issued once paid or delivered."}</p>
            </section>
          )}
          <section className="panel p-4 text-sm" aria-labelledby="pay-h">
            <h2 id="pay-h" className="mb-2 text-sm font-semibold">Payments</h2>
            {payments.length === 0 ? <p className="meta">No payment recorded yet.</p> : (
              <ul className="grid gap-1">{payments.map((p) => <li key={p.id} className="flex justify-between"><span>{p.kind} · {p.provider}</span><span className="num">{p.kind === "refund" ? "−" : ""}{m(p.amountMinor)}</span></li>)}</ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
