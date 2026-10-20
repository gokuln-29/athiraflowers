/**
 * Create an admin account in any environment (the seed refuses to run in production).
 *   npm run admin:create -- --email owner@example.com --name "Name" --role owner
 * A one-time temporary password is written to a 0600 file, never printed. The person must change it at first sign-in and enrol two-step verification.
 */
import "./_use-migrate-user"
import { writeFile } from "node:fs/promises"
import { parseArgs } from "node:util"

import { eq } from "drizzle-orm"

import { db, pool } from "@/db"
import { adminUsers } from "@/db/schema"
import { hashPassword } from "@/server/auth/password"
import { randomToken } from "@/server/security/crypto"

const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" }, role: { type: "string", default: "owner" }, out: { type: "string" } } })
const email = values.email?.trim().toLowerCase()
const name = values.name?.trim()
const role = values.role
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || !["owner", "manager", "staff"].includes(role!)) {
  console.error('usage: npm run admin:create -- --email <email> --name "<name>" --role owner|manager|staff [--out <file>]')
  process.exit(2)
}
if ((await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1)).length) {
  console.error("An admin with that email already exists.")
  process.exit(1)
}
const temp = randomToken(12)
await db.insert(adminUsers).values({ email, name, role: role as "owner" | "manager" | "staff", passwordHash: await hashPassword(temp), passwordChangedAt: new Date(), mustChangePassword: true })
const out = values.out ?? `.admin-credentials-${Date.now()}`
await writeFile(out, `EMAIL=${email}\nTEMPORARY_PASSWORD=${temp}\n`, { mode: 0o600 })
console.log(`Created ${role} ${email}. The temporary password is in ${out} (mode 600). Read it once, then delete the file.`)
await pool.end()
