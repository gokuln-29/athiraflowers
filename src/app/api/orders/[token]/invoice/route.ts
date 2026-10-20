import { buildInvoice } from "@/server/invoices/build"
import { rateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"

export const runtime = "nodejs"

/** Customer download, authorised by the unguessable order token. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  if (!/^[0-9a-f]{32}$/.test(token)) return new Response("Not found", { status: 404 })
  const { ipHash } = await requestContext()
  if (!(await rateLimit(`invoice:${ipHash}`, 30, 600)).allowed) return new Response("Too many requests", { status: 429 })
  const invoice = await buildInvoice({ token })
  if (!invoice) return new Response("Not found", { status: 404 })
  return new Response(new Uint8Array(invoice.pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.filename}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  })
}
