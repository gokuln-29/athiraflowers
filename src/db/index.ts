import "server-only"
import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"

import { env } from "@/lib/env"

import * as schema from "./schema"

declare global {
  var __athiraPool: mysql.Pool | undefined
}

function createPool(): mysql.Pool {
  const pool = mysql.createPool({
    uri: env().DATABASE_URL,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 100,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
    namedPlaceholders: false,
  })
  // All timestamps are UTC regardless of server configuration.
  pool.pool.on("connection", (conn) => {
    conn.query("SET time_zone = '+00:00'")
  })
  return pool
}

const pool = globalThis.__athiraPool ?? createPool()
if (process.env.NODE_ENV !== "production") globalThis.__athiraPool = pool

export const db = drizzle(pool, { schema, mode: "default" })
export type Db = typeof db
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]
export { pool, schema }
