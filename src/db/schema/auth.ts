import {
  boolean,
  char,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core"

import { createdAt, fk, pk, ROLES, ts, updatedAt } from "./_helpers"

export const adminUsers = mysqlTable(
  "admin_users",
  {
    id: pk(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    role: mysqlEnum("role", ROLES).notNull().default("staff"),
    /** Argon2id hash (PHC string). */
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    passwordChangedAt: ts("password_changed_at"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    /** AES-256-GCM encrypted TOTP secret (base64 iv.tag.ciphertext). */
    mfaSecretEnc: varchar("mfa_secret_enc", { length: 255 }),
    mfaEnabledAt: ts("mfa_enabled_at"),
    status: mysqlEnum("status", ["active", "disabled"]).notNull().default("active"),
    failedLogins: int("failed_logins").notNull().default(0),
    lockedUntil: ts("locked_until"),
    lastLoginAt: ts("last_login_at"),
    createdBy: fk("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("admin_users_email_uq").on(t.email)]
)

export const adminSessions = mysqlTable(
  "admin_sessions",
  {
    /** sha256(token) hex. The raw token only exists in the cookie. */
    id: char("id", { length: 64 }).primaryKey(),
    adminId: fk("admin_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    /** Null until the second factor is verified (or enrolled). */
    mfaVerifiedAt: ts("mfa_verified_at"),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at").notNull(),
    idleExpiresAt: ts("idle_expires_at").notNull(),
    absoluteExpiresAt: ts("absolute_expires_at").notNull(),
    ipHash: char("ip_hash", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
  },
  (t) => [index("admin_sessions_admin_idx").on(t.adminId), index("admin_sessions_exp_idx").on(t.absoluteExpiresAt)]
)

export const adminRecoveryCodes = mysqlTable(
  "admin_recovery_codes",
  {
    id: pk(),
    adminId: fk("admin_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    codeHash: char("code_hash", { length: 64 }).notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [index("admin_recovery_admin_idx").on(t.adminId)]
)

export const customers = mysqlTable(
  "customers",
  {
    id: pk(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 120 }),
    phone: varchar("phone", { length: 32 }),
    preferredLocale: mysqlEnum("preferred_locale", ["en", "ar"]).notNull().default("en"),
    companyName: varchar("company_name", { length: 160 }),
    companyTrn: varchar("company_trn", { length: 20 }),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    marketingConsentAt: ts("marketing_consent_at"),
    lastLoginAt: ts("last_login_at"),
    /** PDPL erasure: row is anonymised, not removed, so order history stays consistent. */
    erasedAt: ts("erased_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("customers_email_uq").on(t.email)]
)

export const customerSessions = mysqlTable(
  "customer_sessions",
  {
    id: char("id", { length: 64 }).primaryKey(),
    customerId: fk("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at").notNull(),
    expiresAt: ts("expires_at").notNull(),
    ipHash: char("ip_hash", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
  },
  (t) => [index("customer_sessions_customer_idx").on(t.customerId), index("customer_sessions_exp_idx").on(t.expiresAt)]
)

export const customerAddresses = mysqlTable(
  "customer_addresses",
  {
    id: pk(),
    customerId: fk("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 60 }).notNull(),
    recipientName: varchar("recipient_name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    emirate: mysqlEnum("emirate", ["dubai", "abu_dhabi", "sharjah"]).notNull(),
    area: varchar("area", { length: 120 }).notNull(),
    street: varchar("street", { length: 160 }),
    building: varchar("building", { length: 160 }).notNull(),
    notes: varchar("notes", { length: 300 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("customer_addresses_customer_idx").on(t.customerId)]
)

/** Email one-time codes. Only an HMAC of the code is stored. */
export const otpCodes = mysqlTable(
  "otp_codes",
  {
    id: pk(),
    email: varchar("email", { length: 254 }).notNull(),
    codeHash: char("code_hash", { length: 64 }).notNull(),
    purpose: mysqlEnum("purpose", ["login"]).notNull().default("login"),
    attempts: int("attempts").notNull().default(0),
    maxAttempts: int("max_attempts").notNull().default(5),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
    ipHash: char("ip_hash", { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [index("otp_email_created_idx").on(t.email, t.createdAt), index("otp_expires_idx").on(t.expiresAt)]
)

/** DB-backed fixed-window rate limits (login, OTP, checkout, upload, leads). */
export const rateLimits = mysqlTable(
  "rate_limits",
  {
    key: varchar("key", { length: 190 }).primaryKey(),
    windowStart: ts("window_start").notNull(),
    hits: int("hits").notNull().default(0),
  },
  (t) => [index("rate_limits_window_idx").on(t.windowStart)]
)

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: pk(),
    actorType: mysqlEnum("actor_type", ["admin", "customer", "system", "webhook"]).notNull(),
    actorId: varchar("actor_id", { length: 64 }),
    actorLabel: varchar("actor_label", { length: 160 }),
    action: varchar("action", { length: 80 }).notNull(),
    entity: varchar("entity", { length: 64 }),
    entityId: varchar("entity_id", { length: 64 }),
    /** Small, sanitised change summary. Never passwords, tokens, payment data or full payloads. */
    meta: json("meta").$type<Record<string, unknown>>(),
    ipHash: char("ip_hash", { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_entity_idx").on(t.entity, t.entityId),
    index("audit_created_idx").on(t.createdAt),
    index("audit_actor_idx").on(t.actorType, t.actorId),
  ]
)

