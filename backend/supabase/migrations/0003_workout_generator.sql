-- AI workout generator: suggestions are either an edit to one day or a brand-new plan.
alter table public.workout_suggestions
  add column if not exists kind text not null default 'edit_day'
    check (kind in ('edit_day', 'new_plan')),
  -- For edit_day: { "weekIndex": 0, "weekday": "mon" }. Null for new_plan.
  add column if not exists target jsonb;
