import { site, siteName } from "@/config/site"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
export { esc }

/** Minimal, table-free, inline-styled email layout. Works in Gmail/Outlook and respects RTL. */
export function emailLayout(locale: "en" | "ar", opts: { preheader: string; title: string; bodyHtml: string; footerHtml?: string }): string {
  const dir = locale === "ar" ? "rtl" : "ltr"
  const font = locale === "ar" ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "'Instrument Sans', Helvetica, Arial, sans-serif"
  return `<!doctype html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;background:#f1ede7;color:#1e1a18;font-family:${font};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</span>
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <p style="font-size:22px;margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;">${esc(siteName(locale))}</p>
  <div style="background:#f8f6f2;padding:28px 24px;font-size:16px;line-height:1.6;">
    <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;">${esc(opts.title)}</h1>
    ${opts.bodyHtml}
  </div>
  <p style="font-size:13px;color:#5a524c;margin:20px 0 0;line-height:1.5;">${opts.footerHtml ?? `${esc(siteName(locale))} · <a href="${site.url}" style="color:#2d6a45;">${esc(site.domain)}</a>`}</p>
</div></body></html>`
}
