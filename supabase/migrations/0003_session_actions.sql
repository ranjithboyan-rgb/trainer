-- ─────────────────────────────────────────────────────────────────────────────
-- Trainer session actions — "running late" nudge
-- delay_minutes records that today's session ran N minutes late (0 = on time).
-- The trainer-cancel flow reuses the existing 'cancelled' status (counted stays
-- false), so no new column is needed for it.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.trainer_sessions
  add column if not exists delay_minutes int not null default 0;
