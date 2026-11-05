-- Third-party connections other than Google (currently Canvas LMS).
create table if not exists public.user_integrations (
  user_id         text not null references public.users (id) on delete cascade,
  provider        text not null check (provider in ('canvas')),
  base_url        text not null,                 -- e.g. https://school.instructure.com
  encrypted_token text not null,                 -- AES-256-GCM, key derived from SESSION_SECRET
  account_name    text,
  connected_at    timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.user_integrations enable row level security;
