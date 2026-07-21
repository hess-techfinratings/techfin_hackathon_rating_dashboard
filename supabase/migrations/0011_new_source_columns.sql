-- New-source (final_table_최종.xlsx) schema additions, 2026-07-21:
-- 1) rating_requests gains 확인서 발급 여부 + 19 financial-ratio features
--    (populated for a 10-row sample in the source; rest null).
--    Source quirk: the sheet has TWO ni_growth columns — the second
--    (기타/영업이익 증가율) is stored here as op_growth.
-- 2) Model threshold reference tables from the MIS/FS 임계값 sheets.
-- Error codes no longer exist in the source: mis_cd_error / fs_cd_error now
-- hold the 미산출 사유 text as the grouping key; *_msg_error stay null.

alter table rating_requests
  add column if not exists cert_issued    boolean,
  add column if not exists asset_growth   numeric,
  add column if not exists sale_growth    numeric,
  add column if not exists ni_growth      numeric,
  add column if not exists op_margin      numeric,
  add column if not exists op_roa         numeric,
  add column if not exists np_sale        numeric,
  add column if not exists de_rt          numeric,
  add column if not exists ic_rt          numeric,
  add column if not exists ba_rt          numeric,
  add column if not exists ar_turnover    numeric,
  add column if not exists inv_turnover   numeric,
  add column if not exists asset_turnover numeric,
  add column if not exists cash_growth    numeric,
  add column if not exists op_growth      numeric,
  add column if not exists gp_growth      numeric,
  add column if not exists sale_ratio     numeric,
  add column if not exists dd_ratio       numeric,
  add column if not exists aptp_ratio     numeric,
  add column if not exists nrgts_ratio    numeric;

drop table if exists mis_model_thresholds;
create table mis_model_thresholds (
  var_code       text primary key,
  column_name    text not null,
  label          text not null,
  direction      text,
  good           text,
  normal         text,
  caution        text,
  risk           text,
  strong_risk    text,
  interpretation text
);

drop table if exists fs_model_thresholds;
create table fs_model_thresholds (
  column_name text primary key,
  area        text not null,
  indicator   text not null,
  formula     text,
  unit        text,
  direction   text,
  good        text,
  normal      text,
  caution     text,
  risk        text,
  notes       text
);

alter table mis_model_thresholds enable row level security;
alter table fs_model_thresholds enable row level security;
drop policy if exists "public read" on mis_model_thresholds;
drop policy if exists "public read" on fs_model_thresholds;
create policy "public read" on mis_model_thresholds for select using (true);
create policy "public read" on fs_model_thresholds for select using (true);
