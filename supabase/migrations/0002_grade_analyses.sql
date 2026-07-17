-- Cache for AI-generated low-grade reason analyses (one per request).
-- Written by the /api/analysis route; anon write is accepted here because the
-- table only holds derived, public-readable text (hackathon tradeoff).

drop table if exists grade_analyses;

create table grade_analyses (
  no_req     text primary key references rating_requests (no_req),
  model      text not null,
  analysis   text not null,
  created_at timestamptz not null default now()
);

alter table grade_analyses enable row level security;
create policy "public read" on grade_analyses for select using (true);
create policy "public insert" on grade_analyses for insert with check (true);
create policy "public update" on grade_analyses for update using (true);
