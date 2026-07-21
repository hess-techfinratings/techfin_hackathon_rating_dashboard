-- Pairwise grade-agreement counts (크레디뷰 notch × other-agency notch) for
-- the 타사 등급 heatmaps. Date-range params like the other fn_* twins.

drop function if exists fn_grade_pairs(date, date);

create function fn_grade_pairs(d_from date default null, d_to date default null)
returns table (
  agency text,
  cv_grade smallint,
  other_grade smallint,
  cnt bigint
)
language sql stable as $$
  with scoped as (
    select * from rating_requests
    where (d_from is null or da_calc >= d_from)
      and (d_to   is null or da_calc <= d_to)
  )
  select 'nice' as agency, cv_num_grade as cv_grade, n_num_grade as other_grade, count(*) as cnt
  from scoped
  where cv_num_grade is not null and n_num_grade is not null
  group by 2, 3
  union all
  select 'cretop', cv_num_grade, k_num_grade, count(*)
  from scoped
  where cv_num_grade is not null and k_num_grade is not null
  group by 2, 3;
$$;
