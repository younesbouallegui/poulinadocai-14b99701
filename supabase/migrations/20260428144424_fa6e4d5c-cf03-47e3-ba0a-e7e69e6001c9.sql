
create table if not exists public.assessment_violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  quiz_id uuid not null,
  attempt_id uuid,
  violation_type text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.assessment_violations enable row level security;

create policy "Users insert own violations"
  on public.assessment_violations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users view own violations"
  on public.assessment_violations for select
  to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create policy "Admins manage violations"
  on public.assessment_violations for all
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create index if not exists idx_violations_quiz on public.assessment_violations(quiz_id);
create index if not exists idx_violations_user on public.assessment_violations(user_id);
create index if not exists idx_violations_created on public.assessment_violations(created_at desc);

update public.quizzes set time_limit_minutes = 30 where time_limit_minutes is null;
