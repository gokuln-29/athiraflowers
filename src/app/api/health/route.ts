import { sql } from "drizzle-orm"

import { db } from "@/db"

export const dynamic = "force-dynamic"

/** Liveness plus a database round trip. Reveals nothing about configuration or versions. */
export async function GET() {
  try {
    await db.execute(sql`select 1`)
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } })
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } })
  }
}
