import { readFileSync } from "node:fs"
import mysql from "mysql2/promise"

/** Clears DB-backed rate limits so repeated local runs are deterministic. Dev database only. */
export default async function globalSetup() {
  const env = readFileSync(".env", "utf8")
  const url = env.split("\n").find((l) => l.startsWith("DATABASE_MIGRATE_URL="))!.slice("DATABASE_MIGRATE_URL=".length).replace(/"/g, "")
  if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error("Refusing to reset rate limits on a non-local database")
  const conn = await mysql.createConnection(url)
  await conn.query("DELETE FROM rate_limits")
  await conn.query("UPDATE admin_users SET failed_logins = 0, locked_until = NULL")
  await conn.end()
}
