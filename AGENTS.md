<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project guide

Corporate credit-rating dashboard (TechFin hackathon): 5,267 rating requests compared across three agencies (크레디뷰/나이스/크레탑), with 2-year financial statements for 30 companies. Stack: Next.js 16 (App Router, Turbopack) · Tailwind v4 · shadcn/ui · Supabase · Vercel. Maintained via the `/claude-md` skill.

Production: https://techfin-hackathon-rating-dashboard.vercel.app (auto-deploys from `main` at github.com/hess-techfinratings/techfin_hackathon_rating_dashboard). Pages: `/` Overview · `/analytics` · `/companies` (+`/[no_req]` detail) · `/errors` 미산출 분석.

## Rules
- shadcn/ui only — do NOT add NextUI/HeroUI or Chakra UI (styling systems conflict; decided 2026-07-17).
- This shadcn is the **base-ui variant**: compose with `render={<Link … />}`, never Radix's `asChild` (fails typecheck).
- Raw CSVs are CP949-encoded and **gitignored** — never commit them, never parse them line-by-line (quoted multi-line fields), always decode cp949.
- In the raw CSVs, NICE/CRETOP `*_num_grade`↔`*_char_grade` are swapped; DB columns are already corrected — trust the DB, not the CSV headers.
- `.env.local` holds `SUPABASE_DB_URL` (DB password!) — never commit it, never add it to Vercel; the deployed app only needs the two `NEXT_PUBLIC_SUPABASE_*` vars.
- Session auth refresh lives in `src/proxy.ts` (Next 16 convention, not middleware.ts); it no-ops when env vars are missing.
- Schema changes go in `supabase/migrations/`. Additive changes: `node scripts/apply-sql.mjs <file>`. Full reset: `node scripts/setup-db.mjs` (drops & recreates everything + reimports — wipes `grade_analyses` cache too).

## Design & UI/UX conventions
- UI copy is Korean; identifiers (no_req) and route/nav labels stay English.
- Chart colors: `--chart-1..8` in `globals.css` hold a CVD-validated palette (separate light/dark values) — use via `var(--chart-N)`, don't invent hues.
- Grade bands are the visual language: 투자적격(1–10)=chart-1 · 투기(11–16)=chart-3 · 부실위험(17–22)=chart-6, defined once in `src/lib/grade.ts`. Grades render via `GradeBadge` (band dot + ink text); the detail page's `RatingSpectrum` puts all agencies on the 22-notch scale.
- Charts use the shadcn chart wrapper (recharts): single series → no legend; ≥2 series → `ChartLegend`; always `ChartTooltip`; bars get `radius={[4,4,0,0]}`, a `maxBarSize`, and `isAnimationActive={false}` (instant render, reduced-motion friendly).
- Dark mode via next-themes (class strategy); `ThemeToggle` lives in `PageHeader` — every page gets it for free.
- Money: `formatKRW` (억/만 compact) for cards & summaries, `formatWon` (원 with separators) for statement tables, chart axes in 억원; numeric cells get `tabular-nums` + `text-right`.
- Dates: `formatYmd` / `fiscalYear` from `@/lib/format` — never hand-slice date strings in components.
- Grade display: `Badge variant="secondary"` for grade_type, `variant="outline"` for 미산출; grades render as plain text, "–" for null.
- AI analysis: OpenAI chat completions via `/api/analysis/[no_req]` (POST, `?force=1` regenerates); model from `OPENAI_MODEL` (default gpt-4o-mini); results cached in `grade_analyses`; "낮은 등급" = `cv_num_grade ≥ 17` (`LOW_GRADE_THRESHOLD` in `src/lib/analysis.ts`); missing `OPENAI_API_KEY` must degrade to a notice, never an error.

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
- `rating_requests` (PK no_req, 5,267 rows) ← `financial_statements` (long format, 15,900 rows, 30 companies × 2 fiscal years) · `grade_analyses` (AI analysis cache, anon-writable). Views: `v_overview_stats`, `v_grade_distribution`, `v_companies` (0001) · `v_monthly_trend`, `v_agency_divergence`, `v_error_codes` (0003) · `v_agency_correlation` (0004, Spearman) · `v_weekly_stats` (0005, rolling 7-day windows anchored on max da_calc — data ends 2026-07-03, so calendar weeks would be empty).
- Key acct_cd: 115000 자산총계 · 118000 부채총계 · 118900 자본총계 · 121000 매출액 · 125000 영업이익 · 129000 당기순이익 · 111519 단기차입금 · 116000 유동부채 · 118100 자본금 (risk flags). Leading spaces in `acct_nm` encode hierarchy depth.
- Grades: num_grade 1=best…22=D (sort key); char grades differ per agency (크레디뷰 A/CCC, 나이스 BBB0, 크레탑 BBB+).
- RLS: anon = read-only. Writes/DDL require `SUPABASE_DB_URL` via the setup script.

## Legacy report lessons (크레디뷰 등급 산출 현황 주간보고, PDF)
- Adopted: KPI 목표치 (산출불가율 0%, MIS 산출 비율 70%) on Overview; Spearman 상관계수 + BB+ 이하 비중 (`v_agency_correlation`, migration 0004); rule-based 위험 신호 flags (`src/lib/risk-flags.ts`, F01~F04 rule family) on detail pages.
- Avoid: 3D pie charts, raw multi-thousand-row table dumps, full red/yellow/green cell matrices, hardcoded numbers in prose — always aggregate → drill-down instead.

## What was done
- 2026-07-20 Weekly volume KPI on Overview: `v_weekly_stats` view (migration 0005) + "최근 1주 신청" card with 전주 대비 diff; KPI grid now `xl:grid-cols-3` (6 cards).
- 2026-07-17 Scaffolded Next.js 16 + Tailwind v4 + shadcn/ui (base-ui) + Supabase clients; pushed to GitHub, connected Vercel.
- 2026-07-17 Built data pipeline: migration (tables/views/RLS) + `scripts/setup-db.mjs` (cp949, multi-line CSV, grade-column swap fix); imported 5,267 requests + 15,900 financial rows.
- 2026-07-17 Built pages: Overview (stats, per-agency grade distribution, recent requests), Companies (30 with financials), Company detail (grade cards, 2-year key-metric chart, BS/IS tables).
- 2026-07-17 Hardened missing-env case (SetupNotice instead of 500) after Vercel deploy failed without env vars.
- 2026-07-17 AI grade-reason analysis: `grade_analyses` cache table (migration 0002 + `scripts/apply-sql.mjs`), OpenAI-backed API route, `GradeAnalysisCard` on detail pages of C계열-이하 companies (13 of 30).
- 2026-07-17 UI/UX overhaul: grade-band system (GradeBadge, RatingSpectrum, BandComposition), Analytics page (agency divergence + monthly trend, views in migration 0003), 미산출 분석 page, Companies search/band filter, dark mode, loading skeletons; verified with headless-Edge screenshots.
- 2026-07-17 Legacy-report-inspired upgrades: target KPIs (산출불가율/MIS 비율), Spearman correlation + BB+ 이하 비중 on Analytics (크레탑 0.65, 나이스 0.46), deterministic 위험 신호 flags on company detail.
- 2026-07-17 Production went live after user added `NEXT_PUBLIC_SUPABASE_*` to Vercel; verified serving real data.

## What to do next
- [ ] End-to-end test of AI analysis generation (blocked: user adds `OPENAI_API_KEY` to `.env.local` and Vercel — key not yet present in any location we can read).
- [ ] Filters/search on the full rating-requests list (date range, grade_type, error code) — Companies has it; the 5,267-row request list has no page yet.
- [ ] Lock down `grade_analyses` anon write policy (service-role key) if the project outlives the hackathon.
