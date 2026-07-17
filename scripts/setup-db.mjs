// One-shot database setup: creates the schema and imports both raw CSVs.
//
// Usage:  node scripts/setup-db.mjs
// Needs SUPABASE_DB_URL in .env.local — the "Session pooler" connection
// string from Supabase Dashboard → Connect (IPv4-compatible).
//
// CSV quirks handled here: CP949 encoding, quoted multi-line error fields,
// and the NICE/CRETOP num_grade<->char_grade column swap.

import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { parse } from "csv-parse/sync"
import iconv from "iconv-lite"
import pg from "pg"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const FINAL_TABLE_CSV = path.join(root, "final_table_202607141528.csv")
const RESULT_BS_CSV = path.join(root, "result_bs_202607161720.csv")
const MIGRATIONS_DIR = path.join(root, "supabase", "migrations")

// --- load SUPABASE_DB_URL from .env.local ---
const envFile = readFileSync(path.join(root, ".env.local"), "utf8")
const dbUrl =
  process.env.SUPABASE_DB_URL ??
  envFile.match(/^SUPABASE_DB_URL=(.+)$/m)?.[1]?.trim()
if (!dbUrl) {
  console.error(
    "SUPABASE_DB_URL not found. Add it to .env.local (Supabase Dashboard → Connect → Session pooler URI)."
  )
  process.exit(1)
}

const readCsv = (file, opts = {}) =>
  parse(iconv.decode(readFileSync(file), "cp949"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    ...opts,
  })

const nullIfEmpty = (v) => (v === "" || v === undefined ? null : v)
const toInt = (v) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}
const toDate = (v) =>
  /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : null

// --- parse final_table (rating requests) ---
const requestRows = []
const seen = new Set()
let skipped = 0
for (const r of readCsv(FINAL_TABLE_CSV)) {
  const noReq = r.no_req?.trim()
  const daCalc = toDate(r.da_calc ?? "")
  if (!noReq || !noReq.startsWith("CV") || !daCalc || seen.has(noReq)) {
    skipped++
    continue
  }
  seen.add(noReq)
  requestRows.push([
    noReq,
    r.md5_no_biz,
    daCalc,
    nullIfEmpty(r.grade_type),
    nullIfEmpty(r.dm_base),
    toInt(r.num_grade),
    nullIfEmpty(r.char_grade),
    nullIfEmpty(r.n_dm_base),
    toInt(r.n_char_grade), // swapped in source: n_char_grade holds the number
    nullIfEmpty(r.n_num_grade), // swapped in source: n_num_grade holds the letter
    nullIfEmpty(r.k_dm_base),
    toInt(r.k_char_grade), // swapped in source
    nullIfEmpty(r.k_num_grade), // swapped in source
    nullIfEmpty(r.mis_cd_error),
    nullIfEmpty(r.mis_msg_error),
    nullIfEmpty(r.fs_cd_error),
    nullIfEmpty(r.fs_msg_error),
  ])
}
console.log(`rating_requests: ${requestRows.length} rows parsed, ${skipped} skipped`)

// --- parse result_bs (financial statements) ---
// trim: false — leading spaces in acct_nm encode the account hierarchy depth
const fsRows = []
let fsSkipped = 0
for (const r of readCsv(RESULT_BS_CSV, { trim: false })) {
  const noReq = r.no_req?.trim()
  const dataGb = r.fn_data_gb?.trim()
  if (!noReq || !seen.has(noReq) || !["BS", "IS"].includes(dataGb)) {
    fsSkipped++
    continue
  }
  fsRows.push([
    noReq,
    toDate(r.da_calc?.trim() ?? ""),
    nullIfEmpty(r.dm_base?.trim()),
    toInt(r.gisu),
    nullIfEmpty(r.dm_fndbegin?.trim()),
    nullIfEmpty(r.dm_fndend?.trim()),
    dataGb,
    nullIfEmpty(r.acct_cd?.trim()),
    nullIfEmpty(r.acct_nm?.replace(/\s+$/, "")),
    r.amt === "" || r.amt === undefined ? null : String(r.amt).trim(),
  ])
}
console.log(`financial_statements: ${fsRows.length} rows parsed, ${fsSkipped} skipped`)

// --- create schema and bulk insert ---
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
})
await client.connect()

async function bulkInsert(table, columns, rows, batchSize) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const params = batch.flat()
    const placeholders = batch
      .map(
        (row, r) =>
          `(${row.map((_, c) => `$${r * columns.length + c + 1}`).join(",")})`
      )
      .join(",")
    await client.query(
      `insert into ${table} (${columns.join(",")}) values ${placeholders}`,
      params
    )
    process.stdout.write(
      `\r${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length}`
    )
  }
  process.stdout.write("\n")
}

try {
  console.log("Applying schema (drops & recreates tables)...")
  for (const f of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    console.log(`  migration: ${f}`)
    await client.query(readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
  }

  await bulkInsert(
    "rating_requests",
    [
      "no_req", "md5_no_biz", "da_calc", "grade_type",
      "cv_dm_base", "cv_num_grade", "cv_char_grade",
      "n_dm_base", "n_num_grade", "n_char_grade",
      "k_dm_base", "k_num_grade", "k_char_grade",
      "mis_cd_error", "mis_msg_error", "fs_cd_error", "fs_msg_error",
    ],
    requestRows,
    500
  )
  await bulkInsert(
    "financial_statements",
    [
      "no_req", "da_calc", "dm_base", "gisu", "dm_fndbegin", "dm_fndend",
      "fn_data_gb", "acct_cd", "acct_nm", "amt",
    ],
    fsRows,
    1000
  )

  const counts = await client.query(
    `select
       (select count(*) from rating_requests) as requests,
       (select count(*) from financial_statements) as fs_rows,
       (select count(distinct no_req) from financial_statements) as fs_companies`
  )
  console.log("Done:", counts.rows[0])
} finally {
  await client.end()
}
