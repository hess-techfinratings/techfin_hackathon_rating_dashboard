// Apply a SQL file to the Supabase database.
// Usage: node scripts/apply-sql.mjs supabase/migrations/0002_grade_analyses.sql

import { readFileSync } from "node:fs"
import pg from "pg"

const file = process.argv[2]
if (!file) {
  console.error("usage: node scripts/apply-sql.mjs <path-to-sql>")
  process.exit(1)
}

const dbUrl =
  process.env.SUPABASE_DB_URL ??
  readFileSync(".env.local", "utf8").match(/^SUPABASE_DB_URL=(.+)$/m)?.[1]?.trim()
if (!dbUrl) {
  console.error("SUPABASE_DB_URL not found in environment or .env.local")
  process.exit(1)
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(readFileSync(file, "utf8"))
  console.log(`applied: ${file}`)
} finally {
  await client.end()
}
