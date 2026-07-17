-- Views for the Analytics and Errors perspectives.

drop view if exists v_monthly_trend;
drop view if exists v_agency_divergence;
drop view if exists v_error_codes;

-- Request volume and grade production per month
create view v_monthly_trend with (security_invoker = true) as
select
  to_char(da_calc, 'YYYY-MM')                        as month,
  count(*)                                           as total,
  count(*) filter (where cv_char_grade is not null)  as graded,
  count(*) filter (where cv_char_grade is null)      as ungraded
from rating_requests
group by 1
order by 1;

-- Notch difference (other agency − 크레디뷰); positive = other agency rated worse
create view v_agency_divergence with (security_invoker = true) as
select 'nice' as agency, (n_num_grade - cv_num_grade) as notch_diff, count(*) as cnt
from rating_requests
where cv_num_grade is not null and n_num_grade is not null
group by 2
union all
select 'cretop', (k_num_grade - cv_num_grade), count(*)
from rating_requests
where cv_num_grade is not null and k_num_grade is not null
group by 2;

-- 미산출 error codes per system (MIS / FS)
create view v_error_codes with (security_invoker = true) as
select 'MIS' as system, mis_cd_error as code, min(mis_msg_error) as sample_msg,
       count(*) as cnt
from rating_requests
where mis_cd_error is not null
group by 2
union all
select 'FS', fs_cd_error, min(fs_msg_error), count(*)
from rating_requests
where fs_cd_error is not null
group by 2;
