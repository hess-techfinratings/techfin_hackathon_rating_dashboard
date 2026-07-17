-- Spearman rank correlation between 크레디뷰 and each agency (tie-corrected
-- average ranks), plus BB+ 이하(num_grade >= 11) share within comparable pairs.
-- Mirrors the metrics of the legacy weekly report (타사 등급 비교 section).

drop view if exists v_agency_correlation;

create view v_agency_correlation with (security_invoker = true) as
with pairs as (
  select 'nice' as agency, cv_num_grade as x, n_num_grade as y
  from rating_requests
  where cv_num_grade is not null and n_num_grade is not null
  union all
  select 'cretop', cv_num_grade, k_num_grade
  from rating_requests
  where cv_num_grade is not null and k_num_grade is not null
),
ranked as (
  select agency, x, y,
    rank() over (partition by agency order by x)
      + (count(*) over (partition by agency, x) - 1) / 2.0 as rx,
    rank() over (partition by agency order by y)
      + (count(*) over (partition by agency, y) - 1) / 2.0 as ry
  from pairs
)
select agency,
  round(corr(rx, ry)::numeric, 2)                          as spearman,
  count(*)                                                 as pairs,
  round(avg(case when x >= 11 then 1.0 else 0 end) * 100)  as cv_bbplus_below_pct,
  round(avg(case when y >= 11 then 1.0 else 0 end) * 100)  as other_bbplus_below_pct
from ranked
group by agency;
