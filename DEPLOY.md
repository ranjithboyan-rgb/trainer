# Deploying FitMonk Trainer → train.fitmonk.ai

Target: **`train.fitmonk.ai`** (a new Vercel project on your existing account),
reusing the **existing fitmonk.ai Supabase project** (shared login + shared DB).

This ships the full assisted-comms product — it needs **no Meta/WhatsApp setup**.
(The Cloud-API automation is a later, separate milestone.)

The steps below are on your accounts (Supabase, Vercel, DNS, Google) — I can't
run them for you, but each is copy-paste.

---

## 1. Database — run the migration in the shared Supabase project

All our tables are prefixed `trainer_` and there is **no** `auth.users` trigger,
so nothing collides with the Personal app.

- Supabase dashboard → your fitmonk.ai project → **SQL Editor** → paste and run
  [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

That creates `trainer_profiles`, `trainer_clients`, `trainer_packs`,
`trainer_sessions`, `trainer_messages` with RLS. Safe to re-run (idempotent).

**Already deployed 0001 earlier? Also run the newer migrations** in the SQL
editor (each is idempotent, `add column if not exists`):
- [`0002_custom_slots.sql`](supabase/migrations/0002_custom_slots.sql) — the
  editable slot grid (`slots`, `session_minutes`). Existing trainer rows get the
  default slot list automatically. (The app tolerates this not being run yet for
  reads, but you must run it before editing slots.)
- [`0003_session_actions.sql`](supabase/migrations/0003_session_actions.sql) —
  `delay_minutes` for the "running late" nudge.
- [`0004_templates.sql`](supabase/migrations/0004_templates.sql) — `templates`
  (editable message templates).

## 2. Auth — allow the new domain

Supabase → **Authentication → URL Configuration**:

- **Site URL / Redirect URLs**: add `https://train.fitmonk.ai/**`.

Google is already configured on this project (Personal uses it), so the OAuth
callback (`https://<project>.supabase.co/auth/v1/callback`) is unchanged. Our
app sends users back to `https://train.fitmonk.ai/auth/callback`, which the
allow-list above permits.

## 3. Vercel — new project

- Import this repo as a **new Vercel project** (separate from fitmonk.ai).
- **Environment variables** (Project → Settings → Environment Variables):

  | Name | Value | Notes |
  |---|---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | shared project URL | Supabase → Settings → API |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | shared anon key | same page |
  | `SUPABASE_SERVICE_ROLE_KEY` | shared service-role key | **server-only** — powers the public `/c/<token>` page |

  (Leave the `WA_*` and `ANTHROPIC_API_KEY` vars unset — not needed yet.)

- Deploy. The build is a standard Next.js build (`npm run build`), no config
  needed. With Supabase env set, the app runs in real mode (Google sign-in,
  RLS-scoped data); with it unset it falls back to the demo.

## 4. Domain

- Vercel → this project → **Settings → Domains** → add `train.fitmonk.ai`.
- Add the **CNAME** it shows you at your DNS provider (the one hosting
  fitmonk.ai). Propagation is usually minutes.

## 5. Smoke test

1. Visit `https://train.fitmonk.ai` → redirected to `/login`.
2. Sign in with Google → lands on Today; a `trainer_profiles` row is created for
   you automatically on first visit.
3. Add a client → open their page → **Send confirmation** opens WhatsApp with the
   pre-filled message + their `https://train.fitmonk.ai/c/<token>` link.
4. Open that link in another browser (no login) → confirm / reschedule / cancel →
   watch the Today board update.

---

## Notes

- **Shared auth:** anyone with a fitmonk.ai (Personal) account can sign in here;
  they get an empty trainer profile on first visit. That's intended — a person
  can be both.
- **Timezone:** `todayISO()` currently uses UTC, so "today" can lag the local
  date between 00:00–05:30 IST. Fine for daytime use; the proper fix is to
  compute "today" in `trainer.timezone` (small follow-up).
- **Later — WhatsApp automation (M2):** needs Vinod's Meta setup (Business
  Portfolio, a dedicated number, template approval). The `trainer_messages`
  table and `WA_*` env vars are already stubbed for it.
