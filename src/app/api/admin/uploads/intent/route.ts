import { NextResponse } from "next/server"

import { adminRoute } from "@/server/auth/admin-guards"
import { createUploadIntent } from "@/server/media/uploads"

export const runtime = "nodejs"

export const POST = adminRoute("media:write", async (request, admin) => {
  const result = await createUploadIntent(admin, await request.json().catch(() => null))
  return NextResponse.json(result.body, { status: result.status })
})
