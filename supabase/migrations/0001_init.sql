-- Schema for the rating dashboard.
-- Column note: in the raw CSV, NICE/CRETOP *_num_grade and *_char_grade are
-- swapped (num holds letters, char holds numbers). This schema stores them
-- under corrected names; the import script performs the swap.

drop view if exists v_companies;
drop view if exists v_grade_distribution;
drop view if exists v_overview_stats;
drop table if exists grade_analyses;
-- cascade: views from later migrations (0003+) also depend on these tables
-- and are recreated when those migrations replay
drop table if exists financial_statements cascade;
drop table if exists rating_requests cascade;

create table rating_requests (
  no_req        text primary key,
  md5_no_biz    text not null,
  da_calc       date not null,
  grade_type    text,
  cv_dm_base    text,
  cv_num_grade  smallint,
  cv_char_grade text,
  n_dm_base     text,
  n_num_grade   smallint,
  n_char_grade  text,
  k_dm_base     text,
  k_num_grade   smallint,
  k_char_grade  text,
  mis_cd_error  text,
  mis_msg_error text,
  fs_cd_error   text,
  fs_msg_error  text
);

create table financial_statements (
  id          bigint generated always as identity primary key,
  no_req      text not null references rating_requests (no_req),
  da_calc     date,
  dm_base     text,
  gisu        smallint,
  dm_fndbegin text,
  dm_fndend   text,
  fn_data_gb  text check (fn_data_gb in ('BS', 'IS')),
  acct_cd     text,
  acct_nm     text,
  amt         numeric
);

create index idx_fs_no_req on financial_statements (no_req, fn_data_gb, acct_cd);
create index idx_rr_da_calc on rating_requests (da_calc desc);

-- Read-only access for the dashboard (anon key)
alter table rating_requests enable row level security;
alter table financial_statements enable row level security;
create policy "public read" on rating_requests for select using (true);
create policy "public read" on financial_statements for select using (true);

-- Aggregate views (security_invoker so RLS policies apply)

create view v_overview_stats with (security_invoker = true) as
select
  count(*)                                             as total_requests,
  count(*) filter (where cv_char_grade is not null)    as cv_graded,
  count(*) filter (where grade_type = 'FS')            as type_fs,
  count(*) filter (where grade_type = 'MIS+FS')        as type_mis_fs,
  count(*) filter (where grade_type = 'MIS')           as type_mis,
  count(*) filter (where grade_type is null)           as type_none,
  count(distinct md5_no_biz)                           as distinct_companies,
  (select count(distinct no_req) from financial_statements) as companies_with_financials
from rating_requests;

create view v_grade_distribution with (security_invoker = true) as
select 'crediview' as agency, cv_char_grade as char_grade,
       min(cv_num_grade) as grade_order, count(*) as cnt
from rating_requests where cv_char_grade is not null group by cv_char_grade
union all
select 'nice', n_char_grade, min(n_num_grade), count(*)
from rating_requests where n_char_grade is not null group by n_char_grade
union all
select 'cretop', k_char_grade, min(k_num_grade), count(*)
from rating_requests where k_char_grade is not null group by k_char_grade;

create view v_companies with (security_invoker = true) as
with latest_year as (
  select distinct on (no_req) no_req, dm_fndbegin, dm_fndend
  from financial_statements
  order by no_req, dm_fndend desc
),
key_amounts as (
  select f.no_req,
    max(f.amt) filter (where f.acct_cd = '115000') as total_assets,
    max(f.amt) filter (where f.acct_cd = '121000') as revenue,
    max(f.amt) filter (where f.acct_cd = '129000') as net_income
  from financial_statements f
  join latest_year ly on ly.no_req = f.no_req and ly.dm_fndend = f.dm_fndend
  group by f.no_req
)
select r.no_req, r.da_calc, r.grade_type,
       r.cv_char_grade, r.cv_num_grade, r.n_char_grade, r.k_char_grade,
       ly.dm_fndend as latest_fiscal_end,
       ka.total_assets, ka.revenue, ka.net_income
from rating_requests r
join latest_year ly on ly.no_req = r.no_req
left join key_amounts ka on ka.no_req = r.no_req;
