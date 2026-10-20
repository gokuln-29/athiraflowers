import "server-only"
import { z } from "zod"

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined))

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_SECRET: optional,
  ALLOWED_ORIGINS: optional,
  DATABASE_URL: z.string().min(1),
  STORAGE_DRIVER: z.enum(["r2", "local"]).default("local"),
  /** Explicit opt-in to disk storage in a production build (local rehearsals only; never set on the VPS). */
  ALLOW_LOCAL_STORAGE: optional,
  R2_ACCOUNT_ID: optional,
  R2_ACCESS_KEY_ID: optional,
  R2_SECRET_ACCESS_KEY: optional,
  R2_BUCKET: optional,
  UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
  UPLOAD_MAX_BYTES: z.coerce.number().int().default(10 * 1024 * 1024),
  BREVO_API_KEY: optional,
  BREVO_SENDER_EMAIL: optional,
  BREVO_SENDER_NAME: optional,
  NOTIFY_EMAIL: optional,
  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
})

export type Env = z.infer<typeof schema>

let cached: Env | undefined

/** Validated server environment. Throws a generic error (details logged) if invalid. */
export function env(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    console.error("[env] invalid environment:", z.flattenError(parsed.error).fieldErrors)
    throw new Error("Server is not configured correctly")
  }
  const value = parsed.data
  if (value.NODE_ENV === "production") {
    if (!value.APP_SECRET || value.APP_SECRET.length < 32) {
      console.error("[env] APP_SECRET must be set (32+ chars) in production")
      throw new Error("Server is not configured correctly")
    }
    if (value.STORAGE_DRIVER === "local" && value.ALLOW_LOCAL_STORAGE !== "1") {
      console.error("[env] STORAGE_DRIVER=local is not allowed in production")
      throw new Error("Server is not configured correctly")
    }
  }
  cached = value
  return value
}

/** Secret used for HMAC. A fixed dev secret is used outside production only. */
export function appSecret(): string {
  const e = env()
  if (e.APP_SECRET) return e.APP_SECRET
  return "dev-only-secret-change-me-dev-only-secret"
}

export const isProd = () => env().NODE_ENV === "production"
