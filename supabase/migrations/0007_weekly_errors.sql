-- Weekly error occurrences per system (ISO weeks, Monday start).
-- MIS and FS errors can occur on the same request (and a request with an
-- error may still be graded via the other system), so the counts are
-- independent series, not parts of a whole.

drop view if exists v_weekly_errors;

create view v_weekly_errors with (security_invoker = true) as
select
  date_trunc('week', da_calc)::date                as week_start,
  count(*) filter (where mis_cd_error is not null) as mis_errors,
  count(*) filter (where fs_cd_error is not null)  as fs_errors,
  count(*) filter (where cv_char_grade is null)    as ungraded
from rating_requests
group by 1
order by 1;
