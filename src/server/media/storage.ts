import "server-only"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import { env } from "@/lib/env"

export type PresignedPut = {
  url: string
  method: "PUT"
  headers: Record<string, string>
  expiresInSeconds: number
}

export interface StorageDriver {
  readonly name: "r2" | "local"
  put(key: string, body: Buffer, contentType: string, cacheControl?: string): Promise<void>
  get(key: string, maxBytes: number): Promise<Buffer | null>
  head(key: string): Promise<{ bytes: number } | null>
  remove(key: string): Promise<void>
  presignPut(key: string, contentType: string, bytes: number, ttlSeconds: number): Promise<PresignedPut>
}

const LOCAL_ROOT = path.resolve(process.cwd(), ".storage")

/** Reject anything that could escape the storage root. */
export function safeKey(key: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,200}$/.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error("Invalid storage key")
  }
  return key
}

class LocalDriver implements StorageDriver {
  readonly name = "local" as const
  private file(key: string) {
    return path.join(LOCAL_ROOT, safeKey(key))
  }
  async put(key: string, body: Buffer) {
    const file = this.file(key)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, body)
  }
  async get(key: string, maxBytes: number) {
    try {
      const file = this.file(key)
      const info = await stat(file)
      if (info.size > maxBytes) throw new Error("Object too large")
      return await readFile(file)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
      throw error
    }
  }
  async head(key: string) {
    try {
      return { bytes: (await stat(this.file(key))).size }
    } catch {
      return null
    }
  }
  async remove(key: string) {
    await rm(this.file(key), { force: true })
  }
  async presignPut(key: string, contentType: string, bytes: number, ttlSeconds: number): Promise<PresignedPut> {
    // Development only: a signed token addressed to our own dev-storage endpoint.
    const { signDevUpload } = await import("./dev-upload-token")
    return {
      url: `/api/dev-storage?token=${encodeURIComponent(signDevUpload(key, contentType, bytes, ttlSeconds))}`,
      method: "PUT",
      headers: { "Content-Type": contentType },
      expiresInSeconds: ttlSeconds,
    }
  }
}

class R2Driver implements StorageDriver {
  readonly name = "r2" as const
  private client: S3Client
  private bucket: string
  constructor() {
    const e = env()
    if (!e.R2_ACCOUNT_ID || !e.R2_ACCESS_KEY_ID || !e.R2_SECRET_ACCESS_KEY || !e.R2_BUCKET) {
      throw new Error("R2 is not configured")
    }
    this.bucket = e.R2_BUCKET
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY },
    })
  }
  async put(key: string, body: Buffer, contentType: string, cacheControl = "public, max-age=31536000, immutable") {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), Body: body, ContentType: contentType, CacheControl: cacheControl })
    )
  }
  async get(key: string, maxBytes: number) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }))
      if ((res.ContentLength ?? 0) > maxBytes) throw new Error("Object too large")
      const bytes = await res.Body?.transformToByteArray()
      if (!bytes) return null
      if (bytes.byteLength > maxBytes) throw new Error("Object too large")
      return Buffer.from(bytes)
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") return null
      throw error
    }
  }
  async head(key: string) {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }))
      return { bytes: res.ContentLength ?? 0 }
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      if (status === 404) return null
      throw error
    }
  }
  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }))
  }
  async presignPut(key: string, contentType: string, bytes: number, ttlSeconds: number): Promise<PresignedPut> {
    // Content-Type and Content-Length are signed: the URL authorises exactly one object of this type and size.
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), ContentType: contentType, ContentLength: bytes }),
      { expiresIn: ttlSeconds, signableHeaders: new Set(["content-type", "content-length"]) }
    )
    return { url, method: "PUT", headers: { "Content-Type": contentType }, expiresInSeconds: ttlSeconds }
  }
}

let driver: StorageDriver | undefined

export function storage(): StorageDriver {
  if (driver) return driver
  const e = env()
  if (e.STORAGE_DRIVER === "local" && e.NODE_ENV === "production" && e.ALLOW_LOCAL_STORAGE !== "1") {
    throw new Error("Local storage is not allowed in production")
  }
  driver = e.STORAGE_DRIVER === "r2" ? new R2Driver() : new LocalDriver()
  return driver
}

export const localStorageRoot = LOCAL_ROOT
