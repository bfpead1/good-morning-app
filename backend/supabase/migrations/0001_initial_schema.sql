-- Good Morning App: initial schema.
--
-- Run this in the Supabase SQL editor (or with `supabase db push`) once the project exists.
--
-- Auth model: the app signs people in with Google OAuth itself (not Supabase Auth), and the
-- Express backend talks to Supabase with the service-role key. Row Level Security is enabled
-- on every table with NO policies, so the public anon key can read/write nothing; only the
-- backend (service role bypasses RLS) can touch the data.

-- ─── Users ──────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id            text primary key,              -- Google account id ("sub" claim)
  email         text not null,
  name          text not null,
  picture       text,
  -- OAuth tokens for Gmail/Calendar. Sensitive: consider moving to Supabase Vault later.
  google_tokens jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Per-user settings (workout cycle start, scripture pace, weather location) ─
create table if not exists public.user_settings (
  user_id    text primary key references public.users (id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─── Body metrics log ───────────────────────────────────────────────────────
create table if not exists public.body_metrics (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.users (id) on delete cascade,
  measured_on     date not null,
  weight_lbs      numeric(5, 1),
  muscle_mass_lbs numeric(5, 1),
  body_fat_pct    numeric(4, 1),
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists body_metrics_user_date_idx
  on public.body_metrics (user_id, measured_on desc);

-- ─── Scripture reading progress (one row per chapter read) ──────────────────
create table if not exists public.scripture_progress (
  user_id       text not null references public.users (id) on delete cascade,
  book_slug     text not null,                  -- Gospel Library slug, e.g. '1-ne', 'alma'
  chapter       integer not null check (chapter > 0),
  completed     boolean not null default true,
  completed_via text not null default 'manual' check (completed_via in ('manual', 'quiz', 'import')),
  completed_at  timestamptz,
  primary key (user_id, book_slug, chapter)
);

-- ─── Workout plans (the default plan lives in code; rows are user customizations) ─
create table if not exists public.workout_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references public.users (id) on delete cascade,
  plan       jsonb not null,
  source     text not null check (source in ('ai', 'manual')),
  summary    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
-- At most one active plan per user; older versions are kept for history.
create unique index if not exists workout_plans_one_active_idx
  on public.workout_plans (user_id) where is_active;

-- ─── Claude's proposed workout changes, awaiting accept/dismiss ─────────────
create table if not exists public.workout_suggestions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users (id) on delete cascade,
  request     text,
  summary     text not null,
  changes     jsonb not null,
  plan        jsonb not null,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists workout_suggestions_user_idx
  on public.workout_suggestions (user_id, created_at desc);

-- ─── Claude's daily brief (priorities + plan), cached per user per day ──────
create table if not exists public.daily_briefs (
  user_id     text not null references public.users (id) on delete cascade,
  brief_date  date not null,
  brief       jsonb not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  primary key (user_id, brief_date)
);

-- ─── Lock everything down to the service role ───────────────────────────────
alter table public.users               enable row level security;
alter table public.user_settings       enable row level security;
alter table public.body_metrics        enable row level security;
alter table public.scripture_progress  enable row level security;
alter table public.workout_plans       enable row level security;
alter table public.workout_suggestions enable row level security;
alter table public.daily_briefs        enable row level security;
