-- Weekly request volume: rolling 7-day window anchored on the newest da_calc,
-- compared against the 7 days before it (data ends 2026-07-03, so calendar
-- "this week" would always be empty).

drop view if exists v_weekly_stats;

create view v_weekly_stats with (security_invoker = true) as
with anchor as (
  select max(da_calc)::date as max_d from rating_requests
)
select
  a.max_d - 6                                                                  as week_start,
  a.max_d                                                                      as week_end,
  count(*) filter (where r.da_calc::date between a.max_d - 6 and a.max_d)      as this_week,
  count(*) filter (where r.da_calc::date between a.max_d - 13 and a.max_d - 7) as prev_week
from rating_requests r
cross join anchor a
group by a.max_d;
