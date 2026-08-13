-- ─────────────────────────────────────────────────────────────────────────────
-- Editable message templates
-- Per-trainer overrides for the WhatsApp messages, keyed by template name.
-- Missing keys fall back to the built-in defaults.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.trainer_profiles
  add column if not exists templates jsonb not null default '{}'::jsonb;
