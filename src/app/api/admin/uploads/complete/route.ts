import { NextResponse } from "next/server"

import { adminRoute } from "@/server/auth/admin-guards"
import { completeUpload } from "@/server/media/uploads"

export const runtime = "nodejs"
export const maxDuration = 60

export const POST = adminRoute("media:write", async (request, admin) => {
  const result = await completeUpload(admin, await request.json().catch(() => null))
  return NextResponse.json(result.body, { status: result.status })
})
