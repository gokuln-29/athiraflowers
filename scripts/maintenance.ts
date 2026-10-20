/** Housekeeping job: `npm run maintenance`. Exits non-zero if any step errored so the timer can alert. */
import { pool } from "@/db"
import { runMaintenance } from "@/server/maintenance"

const report = await runMaintenance()
console.log(JSON.stringify({ at: new Date().toISOString(), ...report }))
await pool.end()
process.exit(Object.values(report).some((v) => typeof v === "string") ? 1 : 0)
