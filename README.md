# FitMonk Trainer

A WhatsApp-native client manager for independent personal trainers. The trainer
gets this dashboard; **clients live entirely in WhatsApp and install nothing.**

This repo currently implements **Milestone M1** of
[`fitmonk-trainer-build-spec.md`](fitmonk-trainer-build-spec.md): auth, schema,
slot grid, clients CRUD (with mid-pack onboarding), the Today ledger, the
client page (lifetime stats + pack-grouped history), and session logging with
the pack-counting/rollover engine. WhatsApp automation (M2–M5) is scaffolded in
the data model but not yet wired.

## Stack

Next.js 15 (App Router) · Supabase (Postgres + Auth + RLS) · TypeScript · a PWA
manifest. Built mobile-first, multi-trainer from day one.

## Quick start (demo mode)

With **no** environment variables set, the app boots in **demo mode**: no
sign-in, seeded in-memory data (the prototype's Ranjith / Arvind / Rahul), so
you can click through everything immediately.

```bash
npm install
npm run dev
```

Open http://localhost:3000. A black banner reminds you it's demo data. Mutations
(logging sessions, adding clients) persist for the life of the dev process and
reset on restart.

## Going live (Supabase + Google sign-in)

> **Deploying to production (train.fitmonk.ai)?** Follow [`DEPLOY.md`](DEPLOY.md)
> — it covers the shared-Supabase migration, the Vercel project, and DNS.

Setting the Supabase env vars flips the app to real, RLS-enforced data with
Google authentication.

1. **Create a Supabase project** → Project Settings → API. Copy the URL and the
   `anon` key.
2. **Run the migration** — paste [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   into the Supabase SQL editor and run it. This creates the tables, the
   per-trainer RLS policies, and a trigger that provisions a `trainers` row the
   first time someone signs in.
3. **Enable Google auth** — Supabase → Authentication → Providers → Google. Add
   your Google OAuth client ID/secret, and add
   `https://<your-project>.supabase.co/auth/v1/callback` as an authorized
   redirect URI in the Google Cloud console.
4. **Set env** — copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

5. Restart `npm run dev`. You'll now land on `/login` and sign in with Google.

## Architecture

- **`src/lib/repo.ts`** — the single data-access seam. `getRepo()` returns a
  `DemoRepo` (in-memory seed) or a `SupabaseRepo` (RLS-scoped to the signed-in
  trainer) depending on config. Screens and server actions only ever talk to the
  `Repo` interface.
- **`src/lib/domain.ts`** — pure functions for the pack/sequence/lifetime rules
  (`buildClientDetail`, `planLog`, silent rollover). Both backends share this,
  so the counting logic lives in exactly one place and is trivially testable.
- **`src/lib/theme.ts`** — the LifeOS Design Language tokens (see
  [`lifeos-design-language.md`](lifeos-design-language.md)). `src/components/ui.tsx`
  holds the shared primitives (Card, Label, Toggle, ProgressBar…).
- **Screens** are React Server Components (`src/app/(app)/…/page.tsx`) that fetch
  via the repo and hand data to client components in `src/components/screens/`.
  Mutations go through server actions in `src/app/actions.ts`.
- **RLS** — every table is scoped by `trainer_id = auth.uid()`. A trainer can
  only ever read/write their own rows.

## Session & pack model

- A **pack** is a session counter (default 12, no money). New clients get pack 1;
  mid-pack onboarding sets `starting_offset`.
- Logging a session **Completed** counts it toward the current pack and assigns
  its `seq_in_pack`. **No-show** records it without counting.
- **Silent rollover:** when a completed session fills a pack, it's marked
  `completed_on`; the next completed session opens pack _n+1_ at session 1. No
  modal — confirmations simply start saying "1 of 12" again. Archived packs
  render collapsed on the client page.

## What's next (not in M1)

- **M2 — WhatsApp outbound.** Requires steps only the trainer can do: a Meta
  Business Portfolio, a **dedicated** phone number (a Cloud-API number can't also
  run the normal WhatsApp app — use a second SIM), and utility-template approval.
  Then: the evening-confirmation cron (Vercel Cron at `confirm_send_time`).
- **M3 — Webhook inbound** (`/api/wa/webhook`): confirm/cancel/reschedule
  round-trips updating the dashboard; reschedule slot-offer logic.
- **M4 — Reminders, feedback, pack-end messages, trainer push notifications.**
- Env vars for these are already stubbed in `.env.example`.

## Scripts

```bash
npm run dev        # demo mode unless Supabase env is set
npm run build      # production build
npm run typecheck  # tsc --noEmit
```
