-- Date-range-parameterized twins of the aggregate views, for the calendar
-- filter (?from/?to). Null bounds = unbounded, so the unfiltered case flows
-- through the same functions. Row shapes match the corresponding views.
-- Language sql + security invoker: RLS read policies still apply; in SQL
-- functions column names take precedence over parameter names, so params are
-- prefixed d_ to stay unambiguous.

drop function if exists fn_overview_stats(date, date);
drop function if exists fn_grade_distribution(date, date);
drop function if exists fn_agency_divergence(date, date);
drop function if exists fn_agency_correlation(date, date);
drop function if exists fn_error_codes(date, date);

create function fn_overview_stats(d_from date default null, d_to date default null)
returns table (
  total_requests bigint,
  cv_graded bigint,
  type_fs bigint,
  type_mis_fs bigint,
  type_mis bigint,
  type_none bigint,
  distinct_companies bigint,
  companies_with_financials bigint
)
language sql stable as $$
  select
    count(*)                                          as total_requests,
    count(*) filter (where r.cv_char_grade is not null) as cv_graded,
    count(*) filter (where r.grade_type = 'FS')       as type_fs,
    count(*) filter (where r.grade_type = 'MIS+FS')   as type_mis_fs,
    count(*) filter (where r.grade_type = 'MIS')      as type_mis,
    count(*) filter (where r.grade_type is null)      as type_none,
    count(distinct r.md5_no_biz)                      as distinct_companies,
    (select count(distinct f.no_req)
       from financial_statements f
       join rating_requests fr on fr.no_req = f.no_req
      where (d_from is null or fr.da_calc >= d_from)
        and (d_to   is null or fr.da_calc <= d_to))   as companies_with_financials
  from rating_requests r
  where (d_from is null or r.da_calc >= d_from)
    and (d_to   is null or r.da_calc <= d_to);
$$;

create function fn_grade_distribution(d_from date default null, d_to date default null)
returns table (
  agency text,
  char_grade text,
  grade_order smallint,
  cnt bigint
)
language sql stable as $$
  with scoped as (
    select * from rating_requests
    where (d_from is null or da_calc >= d_from)
      and (d_to   is null or da_calc <= d_to)
  )
  select 'crediview' as agency, cv_char_grade as char_grade,
         min(cv_num_grade) as grade_order, count(*) as cnt
  from scoped where cv_char_grade is not null group by cv_char_grade
  union all
  select 'nice', n_char_grade, min(n_num_grade), count(*)
  from scoped where n_char_grade is not null group by n_char_grade
  union all
  select 'cretop', k_char_grade, min(k_num_grade), count(*)
  from scoped where k_char_grade is not null group by k_char_grade;
$$;

create function fn_agency_divergence(d_from date default null, d_to date default null)
returns table (
  agency text,
  notch_diff smallint,
  cnt bigint
)
language sql stable as $$
  with scoped as (
    select * from rating_requests
    where (d_from is null or da_calc >= d_from)
      and (d_to   is null or da_calc <= d_to)
  )
  select 'nice' as agency, (n_num_grade - cv_num_grade)::smallint as notch_diff, count(*) as cnt
  from scoped
  where cv_num_grade is not null and n_num_grade is not null
  group by 2
  union all
  select 'cretop', (k_num_grade - cv_num_grade)::smallint, count(*)
  from scoped
  where cv_num_grade is not null and k_num_grade is not null
  group by 2;
$$;

create function fn_agency_correlation(d_from date default null, d_to date default null)
returns table (
  agency text,
  spearman numeric,
  pairs bigint,
  cv_bbplus_below_pct numeric,
  other_bbplus_below_pct numeric
)
language sql stable as $$
  with scoped as (
    select * from rating_requests
    where (d_from is null or da_calc >= d_from)
      and (d_to   is null or da_calc <= d_to)
  ),
  pairs as (
    select 'nice' as agency, cv_num_grade as x, n_num_grade as y
    from scoped
    where cv_num_grade is not null and n_num_grade is not null
    union all
    select 'cretop', cv_num_grade, k_num_grade
    from scoped
    where cv_num_grade is not null and k_num_grade is not null
  ),
  ranked as (
    select pairs.agency, x, y,
      rank() over (partition by pairs.agency order by x)
        + (count(*) over (partition by pairs.agency, x) - 1) / 2.0 as rx,
      rank() over (partition by pairs.agency order by y)
        + (count(*) over (partition by pairs.agency, y) - 1) / 2.0 as ry
    from pairs
  )
  select ranked.agency,
    round(corr(rx, ry)::numeric, 2)                          as spearman,
    count(*)                                                 as pairs,
    round(avg(case when x >= 11 then 1.0 else 0 end) * 100)  as cv_bbplus_below_pct,
    round(avg(case when y >= 11 then 1.0 else 0 end) * 100)  as other_bbplus_below_pct
  from ranked
  group by ranked.agency;
$$;

create function fn_error_codes(d_from date default null, d_to date default null)
returns table (
  system text,
  code text,
  sample_msg text,
  cnt bigint
)
language sql stable as $$
  with scoped as (
    select * from rating_requests
    where (d_from is null or da_calc >= d_from)
      and (d_to   is null or da_calc <= d_to)
  )
  select 'MIS' as system, mis_cd_error as code, min(mis_msg_error) as sample_msg,
         count(*) as cnt
  from scoped
  where mis_cd_error is not null
  group by 2
  union all
  select 'FS', fs_cd_error, min(fs_msg_error), count(*)
  from scoped
  where fs_cd_error is not null
  group by 2;
$$;
