/** Apply pending migrations using the DDL-capable user. The running app never has these rights. */
import { drizzle } from "drizzle-orm/mysql2"
import { migrate } from "drizzle-orm/mysql2/migrator"
import mysql from "mysql2/promise"

const url = process.env.DATABASE_MIGRATE_URL
if (!url) {
  console.error("DATABASE_MIGRATE_URL is not set")
  process.exit(1)
}

const conn = await mysql.createConnection({ uri: url, charset: "utf8mb4", timezone: "Z" })
await conn.query("SET time_zone = '+00:00'")
try {
  await migrate(drizzle(conn), { migrationsFolder: "./drizzle" })
  console.log("migrations applied")
} finally {
  await conn.end()
}
