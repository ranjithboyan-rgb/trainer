-- ─────────────────────────────────────────────────────────────────────────────
-- FitMonk Trainer — initial schema (M1)
-- Runs inside the SHARED fitmonk.ai Supabase project, so every table is
-- prefixed `trainer_` to avoid colliding with the Personal app's schema, and
-- there is NO trigger on auth.users (the app creates the trainer row lazily on
-- first sign-in — see getRepo). Multi-trainer from day one via RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── trainer_profiles (the trainer's own settings; PK = auth user) ───────────
create table if not exists public.trainer_profiles (
  id                    uuid primary key references auth.users on delete cascade,
  display_name          text not null default 'Trainer',
  gym                   text,
  timezone              text not null default 'Asia/Kolkata',
  confirm_send_time     time not null default '20:00',
  reminder_1h           boolean not null default true,
  post_session_feedback boolean not null default true,
  late_cancel_burns     boolean not null default true,
  sessions_per_pack     int  not null default 12,
  slots                 text[] not null default
                          array['06:00','07:00','08:00','09:00','10:00',
                                '17:00','18:00','19:00','20:00','21:00'],
  session_minutes       int  not null default 60,
  wa_phone_number_id    text,
  wa_connected          boolean not null default false,
  created_at            timestamptz not null default now()
);

-- ── trainer_clients (not users — addressed by phone; token for action page) ──
create table if not exists public.trainer_clients (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null references public.trainer_profiles on delete cascade,
  name          text not null,
  wa_phone      text not null,                 -- E.164
  training_days int[] not null,                -- 0=Sun .. 6=Sat
  slot          text not null,                 -- "HH:MM"
  client_since  date not null default current_date,
  active        boolean not null default true,
  public_token  text not null unique,
  created_at    timestamptz not null default now()
);
create index if not exists trainer_clients_trainer_idx on public.trainer_clients (trainer_id);

-- ── trainer_packs (session counters — no money) ─────────────────────────────
create table if not exists public.trainer_packs (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.trainer_clients on delete cascade,
  trainer_id      uuid not null references public.trainer_profiles on delete cascade,
  number          int  not null,
  size            int  not null default 12,
  started_on      date not null default current_date,
  completed_on    date,
  starting_offset int  not null default 0,
  created_at      timestamptz not null default now(),
  unique (client_id, number)
);
create index if not exists trainer_packs_client_idx on public.trainer_packs (client_id);

-- ── trainer_sessions ────────────────────────────────────────────────────────
create table if not exists public.trainer_sessions (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.trainer_clients on delete cascade,
  trainer_id           uuid not null references public.trainer_profiles on delete cascade,
  pack_id              uuid references public.trainer_packs on delete set null,
  scheduled_for        timestamptz not null,
  slot                 text,                    -- this instance's time; null = client default
  seq_in_pack          int,
  status               text not null default 'scheduled'
                         check (status in ('scheduled','confirmed','cancelled',
                           'late_cancelled','rescheduled','completed','no_show')),
  counted              boolean not null default false,
  note                 text,
  reschedule_requested boolean not null default false,
  status_changed_at    timestamptz not null default now(),
  created_at           timestamptz not null default now()
);
create index if not exists trainer_sessions_client_idx on public.trainer_sessions (client_id);
create index if not exists trainer_sessions_trainer_sched_idx
  on public.trainer_sessions (trainer_id, scheduled_for);

-- ── trainer_messages (audit of every WhatsApp message; used from M2) ────────
create table if not exists public.trainer_messages (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid references public.trainer_profiles on delete cascade,
  client_id     uuid references public.trainer_clients on delete cascade,
  session_id    uuid references public.trainer_sessions on delete set null,
  direction     text check (direction in ('out','in')),
  template      text,
  body          text,
  wa_message_id text,
  created_at    timestamptz not null default now()
);
create index if not exists trainer_messages_client_idx on public.trainer_messages (client_id);

-- ── Row-level security (a trainer only ever sees their own rows) ────────────
alter table public.trainer_profiles enable row level security;
alter table public.trainer_clients  enable row level security;
alter table public.trainer_packs    enable row level security;
alter table public.trainer_sessions enable row level security;
alter table public.trainer_messages enable row level security;

drop policy if exists trainer_profiles_self on public.trainer_profiles;
create policy trainer_profiles_self on public.trainer_profiles
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists trainer_clients_own on public.trainer_clients;
create policy trainer_clients_own on public.trainer_clients
  using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

drop policy if exists trainer_packs_own on public.trainer_packs;
create policy trainer_packs_own on public.trainer_packs
  using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

drop policy if exists trainer_sessions_own on public.trainer_sessions;
create policy trainer_sessions_own on public.trainer_sessions
  using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

drop policy if exists trainer_messages_own on public.trainer_messages;
create policy trainer_messages_own on public.trainer_messages
  using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

-- Note: the public client action page (/c/<token>) reads/writes via the service
-- role, which bypasses RLS. No anonymous policy is needed or wanted here.
