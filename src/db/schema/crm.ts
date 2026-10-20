import { boolean, char, index, int, json, mysqlEnum, mysqlTable, text, varchar } from "drizzle-orm/mysql-core"

import { adminUsers } from "./auth"
import { createdAt, fk, pk, updatedAt } from "./_helpers"

export const LEAD_TYPES = ["corporate_quote", "event", "program", "gift_bulk", "contact"] as const
export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const
export type LeadType = (typeof LEAD_TYPES)[number]
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const leads = mysqlTable(
  "leads",
  {
    id: pk(),
    type: mysqlEnum("type", LEAD_TYPES).notNull(),
    status: mysqlEnum("status", LEAD_STATUSES).notNull().default("new"),
    name: varchar("name", { length: 120 }).notNull(),
    company: varchar("company", { length: 160 }),
    email: varchar("email", { length: 254 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    message: text("message"),
    /** Structured answers: event date, guests, budget, emirate, frequency, products of interest. */
    details: json("details").$type<Record<string, string | number | boolean | null>>(),
    sourcePath: varchar("source_path", { length: 200 }),
    locale: mysqlEnum("locale", ["en", "ar"]).notNull().default("en"),
    assignedTo: fk("assigned_to").references(() => adminUsers.id, { onDelete: "set null" }),
    estimatedValueMinor: int("estimated_value_minor"),
    /** Position within its kanban column. */
    position: int("position").notNull().default(0),
    consent: boolean("consent").notNull().default(false),
    ipHash: char("ip_hash", { length: 64 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("leads_status_idx").on(t.status, t.position), index("leads_created_idx").on(t.createdAt), index("leads_email_idx").on(t.email)]
)

export const leadNotes = mysqlTable(
  "lead_notes",
  {
    id: pk(),
    leadId: fk("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    adminId: fk("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("lead_notes_lead_idx").on(t.leadId, t.createdAt)]
)
