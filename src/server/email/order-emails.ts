import { absoluteUrl, siteName } from "@/config/site"
import { formatDate, formatMoney } from "@/lib/format"

import { emailLayout, esc } from "./layout"
import type { QueuedEmail } from "./outbox"

export type OrderEmailData = {
  locale: "en" | "ar"
  orderNumber: string
  publicToken: string
  contactName: string
  contactEmail: string
  paymentMethod: "stripe" | "cod" | "tabby" | "tamara"
  paymentStatus: string
  status: string
  deliveryDate: string
  slotLabel: string
  emirate: string
  area: string
  building: string
  totals: { subtotalMinor: number; discountMinor: number; deliveryFeeMinor: number; depositMinor: number; vatMinor: number; totalMinor: number }
  items: { title: string; quantity: number; lineTotalMinor: number }[]
  invoiceRequested: boolean
}

const orderUrl = (d: OrderEmailData) => absoluteUrl(`/${d.locale}/order/${d.publicToken}`)

function table(d: OrderEmailData): string {
  const m = (n: number) => formatMoney(n, d.locale, { compact: true })
  const rows = d.items.map((i) => `<tr><td style="padding:6px 0;">${esc(i.title)} × ${i.quantity}</td><td style="padding:6px 0;text-align:end;white-space:nowrap;">${m(i.lineTotalMinor)}</td></tr>`).join("")
  const line = (label: string, value: string, strong = false) => `<tr><td style="padding:4px 0;${strong ? "font-weight:600;border-top:1px solid #d9d2c8;" : "color:#5a524c;"}">${esc(label)}</td><td style="padding:4px 0;text-align:end;${strong ? "font-weight:600;border-top:1px solid #d9d2c8;" : ""}">${value}</td></tr>`
  const ar = d.locale === "ar"
  return `<table style="border-collapse:collapse;width:100%;font-size:15px;">${rows}
${line(ar ? "المجموع الفرعي" : "Subtotal", m(d.totals.subtotalMinor))}
${d.totals.discountMinor ? line(ar ? "الخصم" : "Discount", "−" + m(d.totals.discountMinor)) : ""}
${line(ar ? "التوصيل" : "Delivery", d.totals.deliveryFeeMinor ? m(d.totals.deliveryFeeMinor) : ar ? "مجاني" : "Free")}
${d.totals.depositMinor ? line(ar ? "تأمين مستردّ" : "Refundable deposit", m(d.totals.depositMinor)) : ""}
${line(ar ? "الإجمالي" : "Total", m(d.totals.totalMinor), true)}
${line(ar ? "منها ضريبة القيمة المضافة 5%" : "Includes VAT at 5%", m(d.totals.vatMinor))}</table>`
}

function details(d: OrderEmailData): string {
  const ar = d.locale === "ar"
  return `<p style="margin:16px 0 4px;color:#5a524c;font-size:13px;">${ar ? "التوصيل" : "Delivery"}</p>
<p style="margin:0;">${esc(formatDate(d.deliveryDate, d.locale, { dateStyle: "full" }))}<br>${esc(d.slotLabel)}<br>${esc(d.building)}, ${esc(d.area)}</p>`
}

export function orderReceivedEmail(d: OrderEmailData): QueuedEmail {
  const ar = d.locale === "ar"
  const cod = d.paymentMethod === "cod"
  const subject = ar ? `استلمنا طلبكم ${d.orderNumber}` : `We received your order ${d.orderNumber}`
  const lead = cod
    ? ar ? "سنؤكد طلبكم قريباً. الدفع نقداً عند الاستلام." : "We will confirm your order shortly. You pay cash on delivery."
    : ar ? "سنؤكد طلبكم فور استلام الدفع." : "We will confirm your order as soon as your payment is received."
  const html = emailLayout(d.locale, {
    preheader: subject,
    title: subject,
    bodyHtml: `<p style="margin:0 0 12px;">${esc(ar ? `شكراً ${d.contactName}.` : `Thank you, ${d.contactName}.`)} ${esc(lead)}</p>${table(d)}${details(d)}
<p style="margin:20px 0 0;"><a href="${orderUrl(d)}" style="color:#2d6a45;">${esc(ar ? "عرض طلبكم" : "View your order")}</a></p>`,
  })
  return { kind: "order.received", to: d.contactEmail, toName: d.contactName, subject, html, text: `${subject}\n\n${lead}\n\n${orderUrl(d)}`, tags: ["order"], dedupeKey: `order:${d.orderNumber}:received` }
}

export function orderPaidEmail(d: OrderEmailData): QueuedEmail {
  const ar = d.locale === "ar"
  const subject = ar ? `تم تأكيد طلبكم ${d.orderNumber}` : `Order ${d.orderNumber} confirmed`
  const lead = ar ? "استلمنا دفعكم وطلبكم مؤكد. سنراسلكم عند خروج الطلب للتوصيل." : "Your payment is received and your order is confirmed. We will email you when it is on its way."
  const invoice = d.invoiceRequested ? `<p style="margin:16px 0 0;"><a href="${absoluteUrl(`/api/orders/${d.publicToken}/invoice`)}" style="color:#2d6a45;">${esc(ar ? "تنزيل الفاتورة الضريبية (PDF)" : "Download tax invoice (PDF)")}</a></p>` : ""
  const html = emailLayout(d.locale, {
    preheader: subject, title: subject,
    bodyHtml: `<p style="margin:0 0 12px;">${esc(lead)}</p>${table(d)}${details(d)}${invoice}<p style="margin:20px 0 0;"><a href="${orderUrl(d)}" style="color:#2d6a45;">${esc(ar ? "عرض طلبكم" : "View your order")}</a></p>`,
  })
  return { kind: "order.paid", to: d.contactEmail, toName: d.contactName, subject, html, text: `${subject}\n\n${lead}\n\n${orderUrl(d)}`, tags: ["order"], dedupeKey: `order:${d.orderNumber}:paid` }
}

const STATUS_COPY: Record<string, { en: [string, string]; ar: [string, string] }> = {
  confirmed: { en: ["Order {n} is confirmed", "We have confirmed your order and will start preparing it."], ar: ["تم تأكيد الطلب {n}", "أكدنا طلبكم وسنبدأ بتحضيره."] },
  preparing: { en: ["Order {n} is being prepared", "Our florists are preparing your order."], ar: ["الطلب {n} قيد التحضير", "تقوم منسقاتنا بتحضير طلبكم."] },
  dispatched: { en: ["Order {n} is on its way", "Your order has left the studio. Please make sure someone can receive it."], ar: ["الطلب {n} في الطريق", "غادر طلبكم الاستوديو. يرجى التأكد من وجود من يستلمه."] },
  delivered: { en: ["Order {n} was delivered", "Your order was delivered. We hope you enjoy it."], ar: ["تم تسليم الطلب {n}", "تم تسليم طلبكم. نتمنى أن ينال إعجابكم."] },
  cancelled: { en: ["Order {n} was cancelled", "Your order was cancelled. If you paid by card, the refund is on its way."], ar: ["تم إلغاء الطلب {n}", "أُلغي طلبكم. إن دفعتم بالبطاقة فالمبلغ المستردّ في الطريق."] },
  refunded: { en: ["Order {n} was refunded", "Your refund has been issued. It can take 5 to 10 working days to appear."], ar: ["تم استرداد مبلغ الطلب {n}", "صدر الاسترداد. قد يستغرق ظهوره من 5 إلى 10 أيام عمل."] },
}

export function orderStatusEmail(d: OrderEmailData, status: string): QueuedEmail | null {
  const copy = STATUS_COPY[status]
  if (!copy) return null
  const [title, lead] = copy[d.locale]
  const subject = title.replace("{n}", d.orderNumber)
  const html = emailLayout(d.locale, { preheader: subject, title: subject, bodyHtml: `<p style="margin:0 0 12px;">${esc(lead)}</p>${details(d)}<p style="margin:20px 0 0;"><a href="${orderUrl(d)}" style="color:#2d6a45;">${esc(d.locale === "ar" ? "عرض طلبكم" : "View your order")}</a></p>` })
  return { kind: `order.${status}`, to: d.contactEmail, toName: d.contactName, subject, html, text: `${subject}\n\n${lead}\n\n${orderUrl(d)}`, tags: ["order"], dedupeKey: `order:${d.orderNumber}:${status}` }
}

export function staffOrderEmail(to: string, d: OrderEmailData, headline: string, adminUrl: string): QueuedEmail {
  const subject = `${headline}: ${d.orderNumber} (${formatMoney(d.totals.totalMinor, "en", { compact: true })}, ${d.paymentMethod.toUpperCase()})`
  const html = emailLayout("en", { preheader: subject, title: subject, bodyHtml: `${table({ ...d, locale: "en" })}${details({ ...d, locale: "en" })}<p style="margin:20px 0 0;"><a href="${adminUrl}" style="color:#2d6a45;">Open in admin</a></p>` })
  return { kind: "order.staff", to, subject, html, text: `${subject}\n${adminUrl}`, tags: ["order-internal"], dedupeKey: `order:${d.orderNumber}:staff:${headline}` }
}

export { siteName }
