-- Week-over-week summary support:
-- 1) v_weekly_stats gains per-system error and ungraded counts for both windows.
-- 2) weekly_summaries caches the AI-generated weekly commentary (one row per
--    anchor week_end; anon-writable — same hackathon tradeoff as grade_analyses).

drop view if exists v_weekly_stats;

create view v_weekly_stats with (security_invoker = true) as
with anchor as (
  select max(da_calc)::date as max_d from rating_requests
)
select
  a.max_d - 6  as week_start,
  a.max_d      as week_end,
  count(*) filter (where r.da_calc::date between a.max_d - 6  and a.max_d)     as this_week,
  count(*) filter (where r.da_calc::date between a.max_d - 13 and a.max_d - 7) as prev_week,
  count(*) filter (where r.da_calc::date between a.max_d - 6  and a.max_d
                     and r.mis_cd_error is not null)                           as this_week_mis,
  count(*) filter (where r.da_calc::date between a.max_d - 13 and a.max_d - 7
                     and r.mis_cd_error is not null)                           as prev_week_mis,
  count(*) filter (where r.da_calc::date between a.max_d - 6  and a.max_d
                     and r.fs_cd_error is not null)                            as this_week_fs,
  count(*) filter (where r.da_calc::date between a.max_d - 13 and a.max_d - 7
                     and r.fs_cd_error is not null)                            as prev_week_fs,
  count(*) filter (where r.da_calc::date between a.max_d - 6  and a.max_d
                     and r.cv_char_grade is null)                              as this_week_ungraded,
  count(*) filter (where r.da_calc::date between a.max_d - 13 and a.max_d - 7
                     and r.cv_char_grade is null)                              as prev_week_ungraded
from rating_requests r
cross join anchor a
group by a.max_d;

create table if not exists weekly_summaries (
  week_end   date primary key,
  model      text not null,
  summary    text not null,
  created_at timestamptz not null default now()
);

alter table weekly_summaries enable row level security;
drop policy if exists "public read" on weekly_summaries;
drop policy if exists "public insert" on weekly_summaries;
drop policy if exists "public update" on weekly_summaries;
create policy "public read" on weekly_summaries for select using (true);
create policy "public insert" on weekly_summaries for insert with check (true);
create policy "public update" on weekly_summaries for update using (true);
