import "server-only"
import { createHash } from "node:crypto"
import sharp, { type Metadata } from "sharp"

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const
export type AllowedMime = (typeof ALLOWED_MIME)[number]

export const MAX_PIXELS = 50_000_000
export const MAX_DIMENSION = 12_000
export const VARIANT_WIDTHS = [320, 640, 960, 1440, 2000] as const

const FORMAT_TO_MIME: Record<string, AllowedMime> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

export class ImageRejected extends Error {
  constructor(public reason: string) {
    super(reason)
  }
}

/** Real file signature check: never trust the extension or the browser's Content-Type. */
export function sniffMime(buf: Buffer): AllowedMime | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp"
  return null
}

export type ProcessedVariant = { w: number; h: number; bytes: number; data: Buffer }
export type ProcessedImage = {
  mime: AllowedMime
  width: number
  height: number
  checksum: string
  dominant: string
  variants: ProcessedVariant[]
}

/**
 * Validates, decodes and re-encodes an untrusted image.
 * Output is WebP only, EXIF/GPS/ICC metadata is dropped, orientation is applied, derivatives are generated.
 */
export async function processImage(input: Buffer, maxBytes: number): Promise<ProcessedImage> {
  if (input.length === 0 || input.length > maxBytes) throw new ImageRejected("File size is outside the allowed range")
  const sniffed = sniffMime(input)
  if (!sniffed) throw new ImageRejected("Only JPEG, PNG and WebP images are accepted")

  let meta: Metadata
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" }).metadata()
  } catch {
    throw new ImageRejected("The image could not be decoded")
  }
  if (!meta.format || FORMAT_TO_MIME[meta.format] !== sniffed) throw new ImageRejected("File contents do not match the declared type")
  const oriented = (meta.orientation ?? 1) >= 5
  const width = oriented ? meta.height : meta.width
  const height = oriented ? meta.width : meta.height
  if (!width || !height || width > MAX_DIMENSION || height > MAX_DIMENSION) throw new ImageRejected("Image dimensions are too large")
  if (width < 200 || height < 200) throw new ImageRejected("Image must be at least 200 pixels on each side")

  const checksum = createHash("sha256").update(input).digest("hex")
  const base = () => sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" }).rotate()

  let dominant: string
  try {
    const stats = await base().resize(32, 32, { fit: "inside" }).stats()
    const [r, g, b] = stats.channels.map((c) => Math.round(c.mean))
    dominant = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`
  } catch {
    // Header looked fine but the pixel data is truncated or corrupt.
    throw new ImageRejected("The image could not be decoded")
  }

  const targets: number[] = VARIANT_WIDTHS.filter((w) => w < width)
  targets.push(Math.min(width, VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]))
  const unique = [...new Set(targets)].sort((a, b) => a - b)

  const variants: ProcessedVariant[] = []
  try {
    for (const w of unique) {
      const { data, info } = await base()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer({ resolveWithObject: true })
      variants.push({ w: info.width, h: info.height, bytes: data.length, data })
    }
  } catch {
    throw new ImageRejected("The image could not be re-encoded")
  }

  return { mime: sniffed, width, height, checksum, dominant, variants }
}
