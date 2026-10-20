import { adminRoute } from "@/server/auth/admin-guards"
import { buildInvoice } from "@/server/invoices/build"

export const runtime = "nodejs"

export const GET = adminRoute("orders:read", async (_req, _admin, params) => {
  const id = Number(params.id)
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 })
  const invoice = await buildInvoice({ id })
  if (!invoice) return new Response("No invoice has been issued for this order", { status: 404 })
  return new Response(new Uint8Array(invoice.pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.filename}"`, "Cache-Control": "private, no-store" } })
})
