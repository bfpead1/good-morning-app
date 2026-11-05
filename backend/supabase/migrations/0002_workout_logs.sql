-- Daily workout check-offs: which items of that day's plan were completed.
create table if not exists public.workout_logs (
  user_id     text not null references public.users (id) on delete cascade,
  log_date    date not null,
  week_label  text not null,                 -- e.g. 'Week 2'
  day_title   text not null,                 -- e.g. 'Push & Pull B'
  -- Completed item keys: "<section title>::<item name>"
  completed   jsonb not null default '[]'::jsonb,
  total_items integer not null check (total_items >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, log_date)
);

alter table public.workout_logs enable row level security;
