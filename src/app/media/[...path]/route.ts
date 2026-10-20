import { readFile } from "node:fs/promises"
import path from "node:path"

import { localStorageRoot, safeKey } from "@/server/media/storage"

/** Dev-only media origin. In production images are served from the R2 custom domain. */
export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (process.env.STORAGE_DRIVER !== "local" || (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORAGE !== "1")) {
    return new Response("Not found", { status: 404 })
  }
  const { path: parts } = await ctx.params
  try {
    const key = safeKey(parts.join("/"))
    const body = await readFile(path.join(localStorageRoot, key))
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": key.endsWith(".webp") ? "image/webp" : "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
