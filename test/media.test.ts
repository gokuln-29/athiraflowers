import { eq } from "drizzle-orm"
import sharp from "sharp"
import { beforeEach, describe, expect, it } from "vitest"

import { db } from "@/db"
import { media } from "@/db/schema"
import type { AdminContext } from "@/server/auth/admin-session"
import { ImageRejected, processImage, sniffMime } from "@/server/media/process"
import { storage } from "@/server/media/storage"
import { completeUpload, createUploadIntent, purgeAbandonedUploads } from "@/server/media/uploads"
import { verifyDevUpload } from "@/server/media/dev-upload-token"

import { makeAdmin, wipe } from "./helpers"

const MAX = 10 * 1024 * 1024
const solid = (w: number, h: number, fmt: "jpeg" | "png" | "webp") => sharp({ create: { width: w, height: h, channels: 3, background: "#8a2b3f" } })[fmt]().toBuffer()

async function jpegWithGps() {
  return sharp({ create: { width: 1200, height: 800, channels: 3, background: "#336699" } })
    .jpeg()
    .withExif({ IFD0: { Copyright: "secret-copyright" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "25/1 12/1 0/1" } })
    .toBuffer()
}

let admin: AdminContext
beforeEach(async () => {
  await wipe("media", "audit_log", "rate_limits", "admin_sessions", "admin_users")
  const a = await makeAdmin()
  admin = { adminId: a.id, email: a.email, name: "T", role: "owner", sessionId: "x", mfaVerified: true, mfaEnabled: true, mustChangePassword: false, ipHash: "h".repeat(64) }
})

describe("processImage", () => {
  it("accepts JPEG, PNG and WebP and always outputs WebP derivatives no wider than the original", async () => {
    for (const fmt of ["jpeg", "png", "webp"] as const) {
      const out = await processImage(await solid(1400, 900, fmt), MAX)
      expect(out.variants.length).toBeGreaterThanOrEqual(3)
      for (const v of out.variants) {
        expect(v.w).toBeLessThanOrEqual(1400)
        expect((await sharp(v.data).metadata()).format).toBe("webp")
      }
      expect(out.checksum).toHaveLength(64)
    }
  })

  it("rejects SVG, HTML, text, GIF and empty files by their real bytes", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><script>alert(1)</script></svg>'.padEnd(2000, " "))
    for (const bad of [svg, Buffer.from("<html><script>1</script></html>".padEnd(2000, " ")), Buffer.from("GIF89a" + "x".repeat(2000)), Buffer.alloc(0), Buffer.from("not an image at all, just text".repeat(100))]) {
      await expect(processImage(bad, MAX)).rejects.toBeInstanceOf(ImageRejected)
    }
    expect(sniffMime(svg)).toBeNull()
  })

  it("rejects truncated or corrupt images, tiny images, and oversize files", async () => {
    const good = await solid(800, 800, "jpeg")
    await expect(processImage(good.subarray(0, 300), MAX)).rejects.toBeInstanceOf(ImageRejected)
    await expect(processImage(await solid(100, 100, "png"), MAX)).rejects.toBeInstanceOf(ImageRejected)
    await expect(processImage(good, 100)).rejects.toBeInstanceOf(ImageRejected)
  })

  it("strips EXIF and GPS metadata from every derivative", async () => {
    const input = await jpegWithGps()
    expect((await sharp(input).metadata()).exif).toBeTruthy()
    const out = await processImage(input, MAX)
    for (const v of out.variants) {
      const meta = await sharp(v.data).metadata()
      expect(meta.exif).toBeUndefined()
      expect(v.data.includes(Buffer.from("secret-copyright"))).toBe(false)
    }
  })
})

describe("upload flow (intent, direct PUT, complete)", () => {
  it("issues a short-lived, single-object, size-bound grant and publishes after verifying the bytes", async () => {
    const bytes = await jpegWithGps()
    const intent = await createUploadIntent(admin, { contentType: "image/jpeg", bytes: bytes.length })
    expect(intent.status).toBe(200)
    const body = intent.body as { mediaId: number; uploadUrl: string; expiresInSeconds: number; headers: Record<string, string> }
    expect(body.expiresInSeconds).toBeLessThanOrEqual(300)
    const grant = verifyDevUpload(decodeURIComponent(body.uploadUrl.split("token=")[1]))
    expect(grant).toMatchObject({ t: "image/jpeg", b: bytes.length })
    expect(grant!.k).toMatch(/^staging\/[0-9a-f-]{36}$/) // random key, never a filename

    await storage().put(grant!.k, bytes, "image/jpeg")
    const done = await completeUpload(admin, { mediaId: body.mediaId, altEn: "A bouquet", altAr: "باقة" })
    expect(done.status).toBe(200)
    const [row] = await db.select().from(media).where(eq(media.id, body.mediaId))
    expect(row).toMatchObject({ status: "ready", mime: "image/webp", altEn: "A bouquet", width: 1200, height: 800 })
    expect(row.checksum).toHaveLength(64)
    expect(row.variants!.length).toBeGreaterThan(1)
    expect(await storage().head(grant!.k)).toBeNull() // staging object removed
    for (const v of row.variants!) expect(await storage().head(v.key)).not.toBeNull()
  })

  it("refuses an SVG renamed as a PNG: rejected, staging object deleted, audit event written", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'.padEnd(2048, " "))
    const intent = await createUploadIntent(admin, { contentType: "image/png", bytes: svg.length })
    const body = intent.body as { mediaId: number; uploadUrl: string }
    const grant = verifyDevUpload(decodeURIComponent(body.uploadUrl.split("token=")[1]))!
    await storage().put(grant.k, svg, "image/png")
    const done = await completeUpload(admin, { mediaId: body.mediaId })
    expect(done.status).toBe(422)
    const [row] = await db.select().from(media).where(eq(media.id, body.mediaId))
    expect(row.status).toBe("rejected")
    expect(await storage().head(grant.k)).toBeNull()
  })

  it("refuses a PUT whose size differs from the intent, and unsupported types or oversize declarations", async () => {
    const bytes = await solid(900, 900, "jpeg")
    const intent = await createUploadIntent(admin, { contentType: "image/jpeg", bytes: bytes.length })
    const body = intent.body as { mediaId: number; uploadUrl: string }
    const grant = verifyDevUpload(decodeURIComponent(body.uploadUrl.split("token=")[1]))!
    await storage().put(grant.k, Buffer.concat([bytes, Buffer.from("extra")]), "image/jpeg")
    expect((await completeUpload(admin, { mediaId: body.mediaId })).status).toBe(422)
    expect((await createUploadIntent(admin, { contentType: "image/svg+xml", bytes: 5000 })).status).toBe(400)
    expect((await createUploadIntent(admin, { contentType: "image/gif", bytes: 5000 })).status).toBe(400)
    expect((await createUploadIntent(admin, { contentType: "image/png", bytes: MAX + 1 })).status).toBe(413)
  })

  it("only the admin who created an intent can complete it, and a completed upload cannot be completed twice", async () => {
    const bytes = await solid(900, 900, "png")
    const intent = await createUploadIntent(admin, { contentType: "image/png", bytes: bytes.length })
    const body = intent.body as { mediaId: number; uploadUrl: string }
    const grant = verifyDevUpload(decodeURIComponent(body.uploadUrl.split("token=")[1]))!
    await storage().put(grant.k, bytes, "image/png")
    expect((await completeUpload({ ...admin, adminId: admin.adminId + 999 }, { mediaId: body.mediaId })).status).toBe(404)
    expect((await completeUpload(admin, { mediaId: body.mediaId })).status).toBe(200)
    expect((await completeUpload(admin, { mediaId: body.mediaId })).status).toBe(404)
  })

  it("a tampered dev upload token is rejected", () => {
    expect(verifyDevUpload("abc.def")).toBeNull()
    expect(verifyDevUpload("")).toBeNull()
  })

  it("rate-limits upload intents", async () => {
    let last = 200
    for (let i = 0; i < 62; i++) last = (await createUploadIntent(admin, { contentType: "image/png", bytes: 5000 })).status
    expect(last).toBe(429)
  })

  it("abandoned pending uploads are purged", async () => {
    const intent = await createUploadIntent(admin, { contentType: "image/png", bytes: 5000 })
    const id = (intent.body as { mediaId: number }).mediaId
    await db.update(media).set({ createdAt: new Date(Date.now() - 3 * 3600_000) }).where(eq(media.id, id))
    expect(await purgeAbandonedUploads(60)).toBeGreaterThanOrEqual(1)
    expect(await db.select().from(media).where(eq(media.id, id))).toHaveLength(0)
  })
})
