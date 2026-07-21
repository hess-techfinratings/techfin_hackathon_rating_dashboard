-- Standardize all weekly views on Sunday–Saturday calendar weeks.
-- extract(dow) is 0 for Sunday, so week_start = date - dow.
-- v_weekly_stats anchors on the Sun–Sat week containing the newest da_calc
-- (data ends 2026-07-03 Fri, so today's calendar week would be empty and the
-- newest anchored week is partial: Sun 06-28 – Sat 07-04 with data through Fri).

drop view if exists v_weekly_stats;

create view v_weekly_stats with (security_invoker = true) as
with anchor as (
  select (max(da_calc)::date - extract(dow from max(da_calc)::date)::int) as ws
  from rating_requests
)
select
  a.ws     as week_start,
  a.ws + 6 as week_end,
  count(*) filter (where r.da_calc::date between a.ws     and a.ws + 6) as this_week,
  count(*) filter (where r.da_calc::date between a.ws - 7 and a.ws - 1) as prev_week,
  count(*) filter (where r.da_calc::date between a.ws     and a.ws + 6
                     and r.mis_cd_error is not null)                    as this_week_mis,
  count(*) filter (where r.da_calc::date between a.ws - 7 and a.ws - 1
                     and r.mis_cd_error is not null)                    as prev_week_mis,
  count(*) filter (where r.da_calc::date between a.ws     and a.ws + 6
                     and r.fs_cd_error is not null)                     as this_week_fs,
  count(*) filter (where r.da_calc::date between a.ws - 7 and a.ws - 1
                     and r.fs_cd_error is not null)                     as prev_week_fs,
  count(*) filter (where r.da_calc::date between a.ws     and a.ws + 6
                     and r.cv_char_grade is null)                       as this_week_ungraded,
  count(*) filter (where r.da_calc::date between a.ws - 7 and a.ws - 1
                     and r.cv_char_grade is null)                       as prev_week_ungraded
from rating_requests r
cross join anchor a
group by a.ws;

drop view if exists v_weekly_trend;

create view v_weekly_trend with (security_invoker = true) as
select
  (da_calc::date - extract(dow from da_calc::date)::int)  as week_start,
  count(*)                                                as total,
  count(*) filter (where cv_char_grade is not null)       as graded,
  count(*) filter (where cv_char_grade is null)           as ungraded
from rating_requests
group by 1
order by 1;

drop view if exists v_weekly_errors;

create view v_weekly_errors with (security_invoker = true) as
select
  (da_calc::date - extract(dow from da_calc::date)::int)  as week_start,
  count(*) filter (where mis_cd_error is not null)        as mis_errors,
  count(*) filter (where fs_cd_error is not null)         as fs_errors,
  count(*) filter (where cv_char_grade is null)           as ungraded
from rating_requests
group by 1
order by 1;
