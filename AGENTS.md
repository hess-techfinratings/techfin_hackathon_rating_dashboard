<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project guide

Corporate credit-rating dashboard (TechFin hackathon): 5,267 rating requests compared across three agencies (크레디뷰/나이스/크레탑), with 2-year financial statements for 30 companies. Stack: Next.js 16 (App Router, Turbopack) · Tailwind v4 · shadcn/ui · Supabase · Vercel. Maintained via the `/claude-md` skill.

Production: https://techfin-hackathon-rating-dashboard.vercel.app (auto-deploys from `main` at github.com/hess-techfinratings/techfin_hackathon_rating_dashboard). Pages: `/` Overview · `/analytics` · `/grades` 타사 등급 · `/companies` (+`/[no_req]` detail) · `/requests` 평가 신청 목록 · `/errors` 미산출 분석.

## Rules
- shadcn/ui only — do NOT add NextUI/HeroUI or Chakra UI (styling systems conflict; decided 2026-07-17).
- This shadcn is the **base-ui variant**: compose with `render={<Link … />}`, never Radix's `asChild` (fails typecheck).
- Constants shared between a server page and a client component live in `src/lib/` — exporting them from a `"use client"` file hands the server a client-reference proxy (`.find is not a function` at runtime, not build time).
- Raw data files (`*.csv`, `*.xlsx`) are **gitignored** — never commit them. The result_bs CSV is CP949-encoded with quoted multi-line fields; always decode cp949, never parse line-by-line.
- In both raw sources, NICE/CRETOP `*_num_grade`↔`*_char_grade` are swapped; DB columns are already corrected — trust the DB, not the source headers. The xlsx also uses `"X"` as a no-grade placeholder and spells grade_type `FS+MIS` — the importer nulls/normalizes both (DB says `MIS+FS`).
- Error **codes no longer exist** (2026-07-21 source): `mis_cd_error`/`fs_cd_error` hold the 미산출 사유 text itself as the grouping key; `*_msg_error` are always null. UI copy says 사유, not 오류코드.
- `.env.local` holds `SUPABASE_DB_URL` (DB password!) — never commit it, never add it to Vercel; the deployed app only needs the two `NEXT_PUBLIC_SUPABASE_*` vars.
- Session auth refresh lives in `src/proxy.ts` (Next 16 convention, not middleware.ts); it no-ops when env vars are missing.
- Schema changes go in `supabase/migrations/`. Additive changes: `node scripts/apply-sql.mjs <file>`. Full reset: `node scripts/setup-db.mjs` (drops & recreates everything + reimports — wipes `grade_analyses` cache too).

## Design & UI/UX conventions
- UI copy is Korean; identifiers (no_req) and route/nav labels stay English.
- Chart colors: `--chart-1..8` in `globals.css` hold a CVD-validated palette (separate light/dark values) — use via `var(--chart-N)`, don't invent hues.
- Grade bands are the visual language: 투자적격(1–8, ~BBB+)=chart-1 · 투기(9–16)=chart-3 · 부실위험(17–22)=chart-6, defined once in `src/lib/grade.ts` (boundary set to BBB+ per user 2026-07-21). Grades render via `GradeBadge` (band dot + ink text); the detail page's `RatingSpectrum` puts all agencies on the 22-notch scale.
- Charts use the shadcn chart wrapper (recharts): single series → no legend; ≥2 series → `ChartLegend`; always `ChartTooltip`; bars get `radius={[4,4,0,0]}`, a `maxBarSize`, and `isAnimationActive={false}` (instant render, reduced-motion friendly).
- Dark mode via next-themes (class strategy); `ThemeToggle` lives in `PageHeader` — every page gets it for free.
- Money: `formatKRW` (억/만 compact) for cards & summaries, `formatWon` (원 with separators) for statement tables, chart axes in 억원; numeric cells get `tabular-nums` + `text-right`.
- Dates: `formatYmd` / `fiscalYear` from `@/lib/format` — never hand-slice date strings in components.
- Grade display: `Badge variant="secondary"` for grade_type, `variant="outline"` for 미산출; grades render as plain text, "–" for null.
- AI analysis: OpenAI chat completions via `/api/analysis/[no_req]` and `/api/weekly-summary` (POST, `?force=1` regenerates); model from `OPENAI_MODEL` (default gpt-4o-mini); results cached in `grade_analyses` / `weekly_summaries`; "낮은 등급" = `cv_num_grade ≥ 17` (`LOW_GRADE_THRESHOLD` in `src/lib/analysis.ts`); missing `OPENAI_API_KEY` must degrade to a notice, never an error; prompts must forbid inventing facts not in the supplied data.

## Page & function harmony — adding a new page
1. Place it under `src/app/(dashboard)/<route>/page.tsx` so it inherits the sidebar layout.
2. Start the JSX with `<PageHeader title="…">` (back-links go inside it, `ml-auto`).
3. Add `export const dynamic = "force-dynamic"` (data lives in Supabase, not the build).
4. Guard first: `if (!isSupabaseConfigured())` → return `<SetupNotice …>`; then `const supabase = await createClient()` from `@/lib/supabase/server`.
5. On any query `error`, return `<SetupNotice error={error.message} />` — pages must never 500.
6. Aggregations belong in SQL views (add to the migration), not in JS over full-table fetches; per-entity detail fetches are fine (≤1,000 rows/request PostgREST cap).
7. Register the route in `navItems` in `src/components/app-sidebar.tsx` (top-level pages only).
8. Types for query results go in `src/lib/types.ts`; client components only for recharts/tabs interactivity.
9. Date filtering: page takes `searchParams` (a Promise — await it), parses with `parseDateRange` from `@/lib/date-range`, renders `<DateRangeFilter min max>` (bounds via `getDateBounds`) at the top of `<main>`; aggregates go through the `fn_*` RPC twins (null params = unbounded), week/month-bucketed views get `.gte/.lte` on the bucket column (`weekStartOf` for the from-edge). Filter state lives only in `?from/?to` URL params.

## Data model
- Sources: `final_table_최종.xlsx` (학습 데이터 sheet = requests; MIS/FS 임계값 sheets = model thresholds) + `result_bs_202607161720.csv` (BS/IS). Import via `node scripts/setup-db.mjs`.
- `rating_requests` (PK no_req, 5,267 rows; since 0011 also `cert_issued` 확인서 발급 + 19 ratio columns `asset_growth`…`nrgts_ratio` — populated for only a 10-row sample; the sheet's duplicate `ni_growth` header = 영업이익 증가율 is stored as `op_growth`) ← `financial_statements` (long format, 15,900 rows, 30 companies × 2 fiscal years) · `mis_model_thresholds` (4 rows) / `fs_model_thresholds` (15 rows) — ratio risk bands 양호/보통/주의/위험 · `grade_analyses` (AI analysis cache, anon-writable) · `weekly_summaries` (AI weekly-comment cache, PK week_end, anon-writable, 0008; cleared on every setup-db run). Views: `v_overview_stats`, `v_grade_distribution`, `v_companies` (0001) · `v_monthly_trend`, `v_agency_divergence`, `v_error_codes` (0003) · `v_agency_correlation` (0004, Spearman) · `v_weekly_stats` (0005/0008, MIS/FS/미산출 window counts) · `v_weekly_trend` (0006) · `v_weekly_errors` (0007, MIS/FS errors per week — grouped not stacked, same request can carry both). All weekly views use **Sunday–Saturday calendar weeks** (0009); `v_weekly_stats` anchors on the week containing max da_calc (data ends Fri 2026-07-03 → latest week 06-28~07-04, partial; today's calendar week would be empty). Date-range twins of the aggregate views live in 0010 as `fn_overview_stats/fn_grade_distribution/fn_agency_divergence/fn_agency_correlation/fn_error_codes(d_from, d_to)` (sql, stable, security invoker).
- Key acct_cd: 115000 자산총계 · 118000 부채총계 · 118900 자본총계 · 121000 매출액 · 125000 영업이익 · 129000 당기순이익 · 111519 단기차입금 · 116000 유동부채 · 118100 자본금 (risk flags). Leading spaces in `acct_nm` encode hierarchy depth.
- Grades: num_grade 1=best…22=D (sort key); char grades differ per agency (크레디뷰 A/CCC, 나이스 BBB0, 크레탑 BBB+).
- RLS: anon = read-only. Writes/DDL require `SUPABASE_DB_URL` via the setup script.

## Legacy report lessons (크레디뷰 등급 산출 현황 주간보고, PDF)
- Adopted: KPI 목표치 (산출불가율 0%, MIS 산출 비율 70%) on Overview; Spearman 상관계수 + BB+ 이하 비중 (`v_agency_correlation`, migration 0004); rule-based 위험 신호 flags (`src/lib/risk-flags.ts`, F01~F04 rule family) on detail pages.
- Avoid: 3D pie charts, raw multi-thousand-row table dumps, full red/yellow/green cell matrices, hardcoded numbers in prose — always aggregate → drill-down instead.

## What was done
- 2026-07-21 주간 변화 요약 card now shows 평가 신청/등급 정상 산출/미산출 (graded = this_week − ungraded; replaced the MIS/FS error items).
- 2026-07-21 Migrated to new source `final_table_최종.xlsx` (full DB reset): error codes → 미산출 사유 text keys, `cert_issued` + 19 ratio columns + threshold tables (migration 0011, importer rewrite); UI/AI prompts now say 사유; 0001 drops made cascade-safe.
- 2026-07-21 New 타사 등급 page (`/grades`): moved 등급 분포 + 등급대 구성 there from Overview (date filter included); Overview now pairs 최근 평가 신청 with the type-count cards.
- 2026-07-21 Calendar date-range filter (`DateRangeFilter`: range Calendar + 전체/4주/12주 presets, state in `?from/?to`) on Overview·Analytics·미산출; RPC fns in migration 0010; new `/requests` page (server-paginated 50/page with grade_type + error-code filters) closing the request-list roadmap item.
- 2026-07-21 Sunday–Saturday weeks everywhere (migration 0009 redefines the three weekly views); moved 주간 변화 요약 card from 미산출 분석 to Overview (최근 1주 KPI card stays).
- 2026-07-20 주간 변화 요약: WoW deltas (신청/MIS/FS/미산출) + AI comment via `/api/weekly-summary`, cached in `weekly_summaries` (migration 0008 also extends `v_weekly_stats`); E2E-tested with real key.
- 2026-07-20 Weekly error trend on 미산출 분석: `v_weekly_errors` (migration 0007), `WeeklyErrorsChart` grouped MIS(chart-1)/FS(chart-8) bars — pair CVD-validated both modes.
- 2026-07-20 Weekly trend chart on Analytics: `v_weekly_trend` view (migration 0006), `WeeklyTrendChart` (last 12 weeks, stacked 산출/미산출), paired with monthly chart in a 2-col grid.
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
- [ ] E2E test of grade-reason analysis (`/api/analysis/[no_req]`) — `OPENAI_API_KEY` is now in `.env.local` (weekly-summary route verified with it 2026-07-20); unknown whether the key is set on Vercel.
- [ ] Lock down `grade_analyses` anon write policy (service-role key) if the project outlives the hackathon.
