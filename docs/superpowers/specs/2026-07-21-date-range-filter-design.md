# Date-period filter with calendar UI — design (2026-07-21)

Approved scope: date-range filter on Overview, Analytics, 미산출 분석, plus a new
`/requests` list page born with filters.

## Filter UI & state
- Reusable client component `DateRangeFilter`: shadcn Popover + Calendar
  (range mode) + preset chips 전체 · 최근 4주 · 최근 12주.
- Presets computed relative to the data's end (max da_calc = 2026-07-03), not
  today. Calendar default month = data end.
- State lives in URL search params `?from=YYYY-MM-DD&to=YYYY-MM-DD`; pages stay
  server components; clearing returns to 전체 (no params).
- Component renders at the top of `<main>` on each filtered page.

## Data layer
- Time-bucketed views (`v_weekly_trend`, `v_weekly_errors`, `v_monthly_trend`)
  are range-filtered with `.gte/.lte` on the bucket column — no new SQL.
- Point-in-time aggregate views get parameterized SQL-function twins in
  migration 0010, same row shapes, called via `supabase.rpc(...)`:
  `fn_overview_stats(d_from, d_to)`, `fn_grade_distribution`,
  `fn_agency_divergence`, `fn_agency_correlation` (Spearman over the range),
  `fn_error_codes`. Null params = unbounded, so the unfiltered case uses the
  same code path. Functions are `security invoker`, `stable`, language sql.

## Per page
- **Overview**: KPI cards, 등급 분포, 등급대 구성, 최근 신청 follow the range.
  주간 변화 요약 card stays week-based and ignores the filter (stated in its
  description copy).
- **Analytics**: divergence, correlation, monthly + weekly trend follow the range.
- **미산출 분석**: error KPIs, weekly errors chart, both code tables follow the range.
- **New `/requests`** ("평가 신청 목록", in sidebar nav): server-paginated table
  (50/page, exact total count) over rating_requests with date-range +
  grade_type + error-code filters, sorted da_calc desc. Standard page checklist
  (PageHeader, force-dynamic, SetupNotice guards, types in src/lib/types.ts).

## Risks
- base-ui shadcn Calendar: add via shadcn CLI and verify typecheck (base-ui
  variant composes with `render`, not `asChild`) before building on it.

## Testing
- Verify each fn in the DB directly (bounds + null params).
- Production build + curl checks: filtered vs unfiltered pages render, no 500s.
