import "server-only"
import { sql } from "drizzle-orm"

import { db } from "@/db"

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number }

/**
 * DB-backed fixed-window limiter, safe across processes (PM2 cluster) and restarts.
 * `key` should already be namespaced, e.g. "otp:email:<hash>". Never put raw PII in keys.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const k = key.slice(0, 190)
  await db.execute(sql`
    INSERT INTO rate_limits (\`key\`, window_start, hits)
    VALUES (${k}, UTC_TIMESTAMP(3), 1)
    ON DUPLICATE KEY UPDATE
      hits = IF(window_start < UTC_TIMESTAMP(3) - INTERVAL ${windowSeconds} SECOND, 1, hits + 1),
      window_start = IF(window_start < UTC_TIMESTAMP(3) - INTERVAL ${windowSeconds} SECOND, UTC_TIMESTAMP(3), window_start)
  `)
  const [rows] = (await db.execute(
    sql`SELECT hits, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(3), window_start + INTERVAL ${windowSeconds} SECOND) AS ttl FROM rate_limits WHERE \`key\` = ${k}`
  )) as unknown as [{ hits: number; ttl: number }[]]
  const row = rows[0]
  const hits = Number(row?.hits ?? 1)
  return {
    allowed: hits <= limit,
    remaining: Math.max(0, limit - hits),
    retryAfterSeconds: Math.max(1, Number(row?.ttl ?? windowSeconds)),
  }
}

/** Remove a counter (e.g. after a successful login). */
export async function resetRateLimit(key: string): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE \`key\` = ${key.slice(0, 190)}`)
}

/** Purge expired windows. Called by the maintenance job. */
export async function purgeRateLimits(olderThanSeconds = 86_400): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE window_start < UTC_TIMESTAMP(3) - INTERVAL ${olderThanSeconds} SECOND`)
}
