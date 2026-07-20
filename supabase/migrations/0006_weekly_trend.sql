-- Weekly request volume and grade production (ISO weeks, Monday start).
-- The newest week is partial: data ends 2026-07-03 (Thu).

drop view if exists v_weekly_trend;

create view v_weekly_trend with (security_invoker = true) as
select
  date_trunc('week', da_calc)::date                  as week_start,
  count(*)                                           as total,
  count(*) filter (where cv_char_grade is not null)  as graded,
  count(*) filter (where cv_char_grade is null)      as ungraded
from rating_requests
group by 1
order by 1;
