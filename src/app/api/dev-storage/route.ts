import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { env } from "@/lib/env"
import { localStorageRoot, safeKey } from "@/server/media/storage"
import { verifyDevUpload } from "@/server/media/dev-upload-token"

export const runtime = "nodejs"

/** Development stand-in for an R2 presigned PUT. Disabled unless STORAGE_DRIVER=local. */
export async function PUT(request: Request) {
  if (env().STORAGE_DRIVER !== "local") return new Response("Not found", { status: 404 })
  const token = new URL(request.url).searchParams.get("token") ?? ""
  const grant = verifyDevUpload(token)
  if (!grant) return new Response("Forbidden", { status: 403 })
  if (request.headers.get("content-type") !== grant.t) return new Response("Wrong content type", { status: 400 })
  const body = Buffer.from(await request.arrayBuffer())
  if (body.length !== grant.b) return new Response("Wrong size", { status: 400 })
  const file = path.join(localStorageRoot, safeKey(grant.k))
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, body)
  return new Response(null, { status: 200 })
}
