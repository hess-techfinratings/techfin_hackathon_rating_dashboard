<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project guide

Corporate credit-rating dashboard (TechFin hackathon): 5,267 rating requests compared across three agencies (크레디뷰/나이스/크레탑), with 2-year financial statements for 30 companies. Stack: Next.js 16 (App Router, Turbopack) · Tailwind v4 · shadcn/ui · Supabase · Vercel. Maintained via the `/claude-md` skill.

## Rules
- shadcn/ui only — do NOT add NextUI/HeroUI or Chakra UI (styling systems conflict; decided 2026-07-17).
- This shadcn is the **base-ui variant**: compose with `render={<Link … />}`, never Radix's `asChild` (fails typecheck).
- Raw CSVs are CP949-encoded and **gitignored** — never commit them, never parse them line-by-line (quoted multi-line fields), always decode cp949.
- In the raw CSVs, NICE/CRETOP `*_num_grade`↔`*_char_grade` are swapped; DB columns are already corrected — trust the DB, not the CSV headers.
- `.env.local` holds `SUPABASE_DB_URL` (DB password!) — never commit it, never add it to Vercel; the deployed app only needs the two `NEXT_PUBLIC_SUPABASE_*` vars.
- Session auth refresh lives in `src/proxy.ts` (Next 16 convention, not middleware.ts); it no-ops when env vars are missing.
- Schema changes go in `supabase/migrations/` and are applied by `node scripts/setup-db.mjs` (drops & recreates tables + reimports).

## Design & UI/UX conventions
- UI copy is Korean; identifiers (no_req) and route/nav labels stay English.
- Chart colors: `--chart-1..5` in `globals.css` hold a CVD-validated palette (separate light/dark values) — use via `var(--chart-N)`, don't invent hues.
- Charts use the shadcn chart wrapper (recharts): single series → no legend; ≥2 series → `ChartLegend`; always `ChartTooltip`; bars get `radius={[4,4,0,0]}` and a `maxBarSize`.
- Money: `formatKRW` (억/만 compact) for cards & summaries, `formatWon` (원 with separators) for statement tables, chart axes in 억원; numeric cells get `tabular-nums` + `text-right`.
- Dates: `formatYmd` / `fiscalYear` from `@/lib/format` — never hand-slice date strings in components.
- Grade display: `Badge variant="secondary"` for grade_type, `variant="outline"` for 미산출; grades render as plain text, "–" for null.

## Page & function harmony — adding a new page
1. Place it under `src/app/(dashboard)/<route>/page.tsx` so it inherits the sidebar layout.
2. Start the JSX with `<PageHeader title="…">` (back-links go inside it, `ml-auto`).
3. Add `export const dynamic = "force-dynamic"` (data lives in Supabase, not the build).
4. Guard first: `if (!isSupabaseConfigured())` → return `<SetupNotice …>`; then `const supabase = await createClient()` from `@/lib/supabase/server`.
5. On any query `error`, return `<SetupNotice error={error.message} />` — pages must never 500.
6. Aggregations belong in SQL views (add to the migration), not in JS over full-table fetches; per-entity detail fetches are fine (≤1,000 rows/request PostgREST cap).
7. Register the route in `navItems` in `src/components/app-sidebar.tsx` (top-level pages only).
8. Types for query results go in `src/lib/types.ts`; client components only for recharts/tabs interactivity.

## Data model
- `rating_requests` (PK no_req, 5,267 rows) ← `financial_statements` (long format, 15,900 rows, 30 companies × 2 fiscal years). Views: `v_overview_stats`, `v_grade_distribution`, `v_companies`. Schema: `supabase/migrations/0001_init.sql`.
- Key acct_cd: 115000 자산총계 · 118000 부채총계 · 118900 자본총계 · 121000 매출액 · 125000 영업이익 · 129000 당기순이익. Leading spaces in `acct_nm` encode hierarchy depth.
- Grades: num_grade 1=best…22=D (sort key); char grades differ per agency (크레디뷰 A/CCC, 나이스 BBB0, 크레탑 BBB+).
- RLS: anon = read-only. Writes/DDL require `SUPABASE_DB_URL` via the setup script.

## What was done
- 2026-07-17 Scaffolded Next.js 16 + Tailwind v4 + shadcn/ui (base-ui) + Supabase clients; pushed to GitHub, connected Vercel.
- 2026-07-17 Built data pipeline: migration (tables/views/RLS) + `scripts/setup-db.mjs` (cp949, multi-line CSV, grade-column swap fix); imported 5,267 requests + 15,900 financial rows.
- 2026-07-17 Built pages: Overview (stats, per-agency grade distribution, recent requests), Companies (30 with financials), Company detail (grade cards, 2-year key-metric chart, BS/IS tables).
- 2026-07-17 Hardened missing-env case (SetupNotice instead of 500) after Vercel deploy failed without env vars.

## What to do next
- [ ] Verify production site loads after Supabase env vars are added in Vercel (blocked: user adds `NEXT_PUBLIC_SUPABASE_*` and redeploys).
- [ ] Agency agreement analysis — grade divergence (notches) between 크레디뷰/나이스/크레탑, e.g. scatter or diff distribution.
- [ ] Filters/search on rating requests (date range, grade_type, error code).
- [ ] Error-code breakdown page for the 825 미산출 cases.
