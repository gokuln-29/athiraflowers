import { z } from "zod"

import { adminRoute } from "@/server/auth/admin-guards"
import { buildReport, REPORTS, type ReportType } from "@/server/admin/reports"
import { audit } from "@/server/security/audit"
import { dubaiNow, addDays } from "@/lib/time"

export const runtime = "nodejs"

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const GET = adminRoute("reports:read", async (request, admin, params) => {
  const type = params.type as ReportType
  if (!(type in REPORTS)) return new Response("Not found", { status: 404 })
  const url = new URL(request.url)
  const today = dubaiNow().day
  const from = dateSchema.safeParse(url.searchParams.get("from")).data ?? addDays(today, -30)
  const to = dateSchema.safeParse(url.searchParams.get("to")).data ?? today
  if (from > to || (Date.parse(to) - Date.parse(from)) / 86_400_000 > 800) return new Response("Invalid range", { status: 400 })
  const csv = await buildReport(type, from, to)
  await audit({ actorType: "admin", actorId: admin.adminId, actorLabel: admin.email, action: "report.exported", entity: "report", entityId: type, meta: { from, to }, ipHash: admin.ipHash })
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${type}_${from}_${to}.csv"`, "Cache-Control": "private, no-store" } })
})
