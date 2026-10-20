import { bigint, datetime } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

/** Auto-increment primary key (never exposed publicly; public ids are random tokens). */
export const pk = () => bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey()

export const fk = (name: string) => bigint(name, { mode: "number", unsigned: true })

/** UTC timestamps. The connection pins time_zone to +00:00. */
export const createdAt = () =>
  datetime("created_at", { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`)

export const updatedAt = () =>
  datetime("updated_at", { mode: "date", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date())

export const ts = (name: string) => datetime(name, { mode: "date", fsp: 3 })

export const EMIRATES = ["dubai", "abu_dhabi", "sharjah"] as const
export type Emirate = (typeof EMIRATES)[number]

export const ROLES = ["owner", "manager", "staff"] as const
export type Role = (typeof ROLES)[number]
