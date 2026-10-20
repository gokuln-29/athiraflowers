import { siteName } from "@/config/site"

import type { QueuedEmail } from "./outbox"
import { emailLayout, esc } from "./layout"

const TYPE_LABEL: Record<string, { en: string; ar: string }> = {
  corporate_quote: { en: "corporate quote request", ar: "طلب عرض سعر للشركات" },
  event: { en: "event enquiry", ar: "استفسار عن فعالية" },
  program: { en: "program enquiry", ar: "استفسار عن برنامج" },
  gift_bulk: { en: "bulk gift enquiry", ar: "استفسار عن هدايا بالجملة" },
  contact: { en: "message", ar: "رسالة" },
}

export function leadAcknowledgement(locale: "en" | "ar", opts: { to: string; name: string; type: string }): QueuedEmail {
  const ar = locale === "ar"
  const label = TYPE_LABEL[opts.type]?.[locale] ?? TYPE_LABEL.contact[locale]
  const subject = ar ? `استلمنا ${label}` : `We received your ${label}`
  const lead = ar
    ? `شكراً ${opts.name}. استلمنا ${label} وسيرد عليكم فريقنا عادةً خلال يوم عمل.`
    : `Thank you, ${opts.name}. We received your ${label} and a member of our team will reply, usually within one working day.`
  const urgent = ar ? "للأمور العاجلة تواصلوا معنا عبر واتساب من صفحة التواصل." : "If it is urgent, message us on WhatsApp from the contact page."
  return {
    kind: "lead.ack",
    to: opts.to,
    toName: opts.name,
    subject,
    html: emailLayout(locale, { preheader: subject, title: subject, bodyHtml: `<p style="margin:0 0 12px;">${esc(lead)}</p><p style="margin:0;color:#5a524c;font-size:14px;">${esc(urgent)}</p>` }),
    text: `${lead}\n\n${urgent}\n\n${siteName(locale)}`,
    tags: ["lead"],
  }
}

export function leadNotification(opts: { to: string; type: string; name: string; email: string; phone: string | null; company: string | null; message: string | null; details: Record<string, unknown> }): QueuedEmail {
  const label = TYPE_LABEL[opts.type]?.en ?? "enquiry"
  const subject = `New ${label}: ${opts.name}${opts.company ? ` (${opts.company})` : ""}`
  const rows: [string, string][] = [
    ["Name", opts.name], ["Company", opts.company ?? "-"], ["Email", opts.email], ["Phone", opts.phone ?? "-"],
    ...Object.entries(opts.details).filter(([, v]) => v !== null && v !== "").map(([k, v]) => [k, String(v)] as [string, string]),
    ["Message", opts.message ?? "-"],
  ]
  const html = emailLayout("en", {
    preheader: subject,
    title: subject,
    bodyHtml: `<table style="border-collapse:collapse;width:100%;font-size:14px;">${rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#5a524c;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;">${esc(v)}</td></tr>`).join("")}</table><p style="margin:16px 0 0;font-size:13px;color:#5a524c;">Open the lead in the admin (Leads) to follow up.</p>`,
  })
  return { kind: "lead.notify", to: opts.to, subject, html, text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"), replyTo: opts.email, tags: ["lead"] }
}
