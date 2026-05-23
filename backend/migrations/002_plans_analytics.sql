-- ============================================================
-- Migration: Plans & Analytics
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. user_plans — stores each user's subscription tier and limits
create table if not exists public.user_plans (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  daily_pipeline_limit int not null default 3,
  daily_cv_upload_limit int not null default 2,
  max_revisions int not null default 2,
  features jsonb not null default '{"email_notifications": false, "long_term_memory": false}'::jsonb,
  upgraded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a free-plan row whenever a new auth user is created.
create or replace function public.handle_new_user_plan()
returns trigger as $$
begin
  insert into public.user_plans (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists, then recreate
drop trigger if exists on_auth_user_created_plan on auth.users;
create trigger on_auth_user_created_plan
  after insert on auth.users
  for each row execute function public.handle_new_user_plan();

-- RLS: users can only read their own plan
alter table public.user_plans enable row level security;

drop policy if exists "Users can read own plan" on public.user_plans;
create policy "Users can read own plan"
  on public.user_plans for select
  using (auth.uid() = id);

-- Service role can manage all plans (for admin / backend)
drop policy if exists "Service role full access" on public.user_plans;
create policy "Service role full access"
  on public.user_plans for all
  using (true)
  with check (true);


-- 2. analytics_events — lightweight product event tracking
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  event_properties jsonb default '{}'::jsonb,
  session_id text,
  created_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists idx_events_user_time
  on public.analytics_events (user_id, created_at desc);
create index if not exists idx_events_name
  on public.analytics_events (event_name);

-- RLS: only service role inserts/reads (backend writes, not client)
alter table public.analytics_events enable row level security;

drop policy if exists "Service role full access events" on public.analytics_events;
create policy "Service role full access events"
  on public.analytics_events for all
  using (true)
  with check (true);


-- 3. Backfill: create user_plans rows for existing users who don't have one
insert into public.user_plans (id)
select id from auth.users
where id not in (select id from public.user_plans)
on conflict (id) do nothing;
