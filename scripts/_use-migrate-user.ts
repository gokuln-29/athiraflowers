// Import this FIRST in maintenance scripts: they need DDL/TRUNCATE rights the running app does not have.
if (process.env.DATABASE_MIGRATE_URL) process.env.DATABASE_URL = process.env.DATABASE_MIGRATE_URL
export {}
