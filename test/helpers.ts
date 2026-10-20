import { sql } from "drizzle-orm"

import { db } from "@/db"
import { adminUsers } from "@/db/schema"
import { hashPassword } from "@/server/auth/password"

import { jar } from "./setup"

export const resetJar = () => jar.clear()

export async function wipe(...tables: string[]) {
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`)
  for (const t of tables) await db.execute(sql.raw(`DELETE FROM \`${t}\``))
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`)
}

export async function makeAdmin(over: Partial<typeof adminUsers.$inferInsert> = {}) {
  const password = over.passwordHash ? "" : "correct horse battery staple"
  const email = over.email ?? `admin-${Math.random().toString(36).slice(2, 8)}@example.test`
  const [row] = await db
    .insert(adminUsers)
    .values({ email, name: "Test admin", role: "owner", passwordHash: await hashPassword("correct horse battery staple"), ...over })
    .$returningId()
  return { id: row.id, email, password: password || "correct horse battery staple" }
}
