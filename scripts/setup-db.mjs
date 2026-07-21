// One-shot database setup: creates the schema and imports the raw data.
//
// Usage:  node scripts/setup-db.mjs
// Needs SUPABASE_DB_URL in .env.local — the "Session pooler" connection
// string from Supabase Dashboard → Connect (IPv4-compatible).
//
// Sources:
//  - final_table_최종.xlsx  (rating requests + model threshold sheets)
//  - result_bs_202607161720.csv  (BS/IS financial statements, CP949)
//
// Source quirks handled here:
//  - NICE/CRETOP num_grade<->char_grade columns are swapped in the sheet
//  - "X" is a no-grade placeholder → null
//  - grade_type is spelled "FS+MIS" in the sheet → normalized to "MIS+FS"
//    (the spelling every view and UI label uses)
//  - the sheet has two ni_growth columns; the second (영업이익 증가율) is
//    imported as op_growth
//  - error codes no longer exist: MIS/FS 미산출사유 text goes into
//    mis_cd_error / fs_cd_error as the grouping key, *_msg_error stay null
//  - result_bs CSV: CP949 encoding, quoted multi-line fields, leading spaces
//    in acct_nm encode hierarchy depth

import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { parse } from "csv-parse/sync"
import iconv from "iconv-lite"
import pg from "pg"
import XLSX from "xlsx"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const FINAL_TABLE_XLSX = path.join(root, "final_table_최종.xlsx")
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

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}
const gradeText = (v) => {
  const s = nullIfEmpty(v)
  return s === "X" ? null : s // "X" = no grade in the new source
}
const toInt = (v) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}
const toNum = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null)
const toDate = (v) => {
  const s = String(v ?? "")
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null
}

// --- parse 학습 데이터 sheet (rating requests) ---
// Read as index-based arrays: the header row has two "ni_growth" columns
// (index 18 = 당기순이익 증가율, index 29 = 영업이익 증가율 → op_growth).
const wb = XLSX.readFile(FINAL_TABLE_XLSX)
const sheetRows = XLSX.utils.sheet_to_json(wb.Sheets["학습 데이터"], {
  header: 1,
  raw: true,
})
const RATIO_COLS = [
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
] // asset_growth … nrgts_ratio in sheet order (29 = op_growth)

const requestRows = []
const seen = new Set()
let skipped = 0
for (const r of sheetRows.slice(1)) {
  const noReq = nullIfEmpty(r[0])
  const daCalc = toDate(r[2])
  if (!noReq || !noReq.startsWith("CV") || !daCalc || seen.has(noReq)) {
    skipped++
    continue
  }
  seen.add(noReq)
  const gradeType = nullIfEmpty(r[3])
  requestRows.push([
    noReq,
    nullIfEmpty(r[1]),
    daCalc,
    gradeType === "FS+MIS" ? "MIS+FS" : gradeType,
    nullIfEmpty(r[4]),
    toInt(r[5]),
    gradeText(r[6]),
    nullIfEmpty(r[7]),
    toInt(r[9]), // swapped in source: n_char_grade column holds the number
    gradeText(r[8]), // swapped in source: n_num_grade column holds the letter
    nullIfEmpty(r[10]),
    toInt(r[12]), // swapped in source
    gradeText(r[11]), // swapped in source
    nullIfEmpty(r[14]), // MIS 미산출사유 → mis_cd_error (grouping key)
    null, // mis_msg_error — no separate message in the new source
    nullIfEmpty(r[15]), // FS 미산출사유 → fs_cd_error
    null, // fs_msg_error
    nullIfEmpty(r[13]) === "발급", // cert_issued
    ...RATIO_COLS.map((i) => toNum(r[i])),
  ])
}
console.log(`rating_requests: ${requestRows.length} rows parsed, ${skipped} skipped`)

// --- parse threshold sheets ---
const misThresholds = XLSX.utils.sheet_to_json(wb.Sheets["MIS 모형 임계값"], {
  header: 1,
})
  .slice(1)
  .filter((r) => nullIfEmpty(r[0]))
  .map((r) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => nullIfEmpty(r[i])))

const fsThresholds = XLSX.utils.sheet_to_json(
  wb.Sheets["FS 및 결합 모형 임계값"],
  { header: 1 }
)
  .slice(1)
  .filter((r) => nullIfEmpty(r[1]))
  .map((r) => {
    const cols = [1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => nullIfEmpty(r[i]))
    // 기타/ni_growth is 영업이익 증가율 — matches the op_growth data column
    if (cols[0] === "ni_growth" && cols[2]?.includes("영업이익")) cols[0] = "op_growth"
    return cols
  })
console.log(
  `thresholds: MIS ${misThresholds.length} rows, FS ${fsThresholds.length} rows`
)

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
    r.acct_nm === undefined ? null : nullIfEmpty(r.acct_nm.replace(/\s+$/, "")),
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

  // weekly_summaries survives the migration replay (create if not exists) —
  // clear it so cached AI comments can't describe the previous dataset.
  await client.query("delete from weekly_summaries")

  await bulkInsert(
    "rating_requests",
    [
      "no_req", "md5_no_biz", "da_calc", "grade_type",
      "cv_dm_base", "cv_num_grade", "cv_char_grade",
      "n_dm_base", "n_num_grade", "n_char_grade",
      "k_dm_base", "k_num_grade", "k_char_grade",
      "mis_cd_error", "mis_msg_error", "fs_cd_error", "fs_msg_error",
      "cert_issued",
      "asset_growth", "sale_growth", "ni_growth", "op_margin", "op_roa",
      "np_sale", "de_rt", "ic_rt", "ba_rt", "ar_turnover", "inv_turnover",
      "asset_turnover", "cash_growth", "op_growth", "gp_growth",
      "sale_ratio", "dd_ratio", "aptp_ratio", "nrgts_ratio",
    ],
    requestRows,
    500
  )
  await bulkInsert(
    "mis_model_thresholds",
    [
      "var_code", "column_name", "label", "direction",
      "good", "normal", "caution", "risk", "strong_risk", "interpretation",
    ],
    misThresholds,
    100
  )
  await bulkInsert(
    "fs_model_thresholds",
    [
      "column_name", "area", "indicator", "formula", "unit", "direction",
      "good", "normal", "caution", "risk", "notes",
    ],
    fsThresholds,
    100
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
       (select count(*) from rating_requests where mis_cd_error is not null) as mis_reasons,
       (select count(*) from rating_requests where cert_issued) as certs,
       (select count(*) from rating_requests where sale_ratio is not null) as ratio_rows,
       (select count(*) from mis_model_thresholds) as mis_thresholds,
       (select count(*) from fs_model_thresholds) as fs_thresholds,
       (select count(*) from financial_statements) as fs_rows,
       (select count(distinct no_req) from financial_statements) as fs_companies`
  )
  console.log("Done:", counts.rows[0])
} finally {
  await client.end()
}
