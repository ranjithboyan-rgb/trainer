-- ─────────────────────────────────────────────────────────────────────────────
-- Custom slot grid
-- Each trainer defines their own real start times (":30"s, breaks as gaps) and
-- session length, instead of a fixed hourly grid. Run this on an existing DB
-- that already has 0001; fresh installs get these columns from 0001 directly.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.trainer_profiles
  add column if not exists slots text[] not null default
    array['06:00','07:00','08:00','09:00','10:00',
          '17:00','18:00','19:00','20:00','21:00'];

alter table public.trainer_profiles
  add column if not exists session_minutes int not null default 60;
