# FitMonk Trainer — Build Spec for Claude Code

**Product:** FitMonk Trainer — a WhatsApp-native client manager for independent personal trainers. The trainer gets a dashboard app; **clients live entirely in WhatsApp and install nothing.** Sessions are counted automatically, confirmations are automated, and the trainer logs each session in one tap plus optional dictation.

**Launch user:** Vinod (1 trainer, ~10 clients). Built multi-trainer from day one (auth + RLS), same as FitMonk Personal.

**Companion files:** `lifeos-design-language.md` (the DLS — visual constitution, shared with FitMonk Personal), `fitmonk-trainer-v3.jsx` (app shell, Today, Clients, Add-client, Settings), `fitmonk-trainer-v4-clientpage.jsx` (client page at scale: lifetime stats, pack-grouped history, archived packs). No payments anywhere in v1 — packs are session counters only.

---

## 1. Stack

Same platform as FitMonk Personal so the two apps share infrastructure and the DLS:
Next.js PWA on Vercel · Supabase (Postgres/Auth/Storage, RLS per trainer) · Anthropic API (optional in v1 — only for parsing dictated session notes into exercise structure) · **Meta WhatsApp Business Cloud API** (the core dependency) · Vercel Cron for scheduled messages.

Auth: trainer signs in with Google (identical rationale to Personal spec). Clients are **not users** — they are rows, addressed by phone number.

---

## 2. Data model

```sql
create table trainers (
  id uuid primary key references auth.users,
  display_name text not null,
  timezone text default 'Asia/Kolkata',
  confirm_send_time time default '20:00',
  reminder_1h boolean default true,
  post_session_feedback boolean default true,
  late_cancel_burns boolean default true,   -- policy toggle
  sessions_per_pack int default 12,
  wa_phone_number_id text, wa_connected boolean default false
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainers,
  name text not null,
  wa_phone text not null,                  -- E.164
  training_days int[] not null,            -- 0=Sun..6=Sat
  slot time not null,
  client_since date default current_date,  -- lifetime anchor
  active boolean default true
);

create table packs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients,
  trainer_id uuid not null,
  number int not null,                     -- 1, 2, 3...
  size int not null default 12,
  started_on date not null,
  completed_on date,                       -- set on rollover
  starting_offset int default 0            -- mid-pack onboarding: sessions already done
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients,
  trainer_id uuid not null,
  pack_id uuid references packs,
  scheduled_for timestamptz not null,
  seq_in_pack int,                         -- 1..12, null if not counted
  status text not null check (status in
    ('scheduled','confirmed','cancelled','late_cancelled','rescheduled','completed','no_show')),
  counted boolean not null default false,  -- burns a pack session?
  note text,                               -- trainer's dictated "what we did"
  status_changed_at timestamptz default now()
);

create table wa_messages (                 -- full audit of every message in/out
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid, client_id uuid, session_id uuid,
  direction text check (direction in ('out','in')),
  template text,                           -- which template / button payload
  body text, wa_message_id text,
  created_at timestamptz default now()
);
```

**Session state machine:** `scheduled → confirmed | cancelled | rescheduled` (via WhatsApp reply) → `completed | no_show` (via trainer tap). `counted=true` when completed, OR when late-cancelled and `late_cancel_burns=true`. `seq_in_pack = starting_offset + count of prior counted sessions in pack + 1`.

**Pack rollover (silent, automatic):** when a counted session takes a pack to `size`, set `completed_on`; the next counted session auto-creates pack `number+1` and gets `seq_in_pack=1`. No modal, no ceremony — confirmations simply start saying "session 1 of 12" again. Archived packs render collapsed on the client page.

**Session generation:** nightly cron materializes `scheduled` rows 7 days ahead from each client's `training_days × slot`. Reschedules move the row; cancels mark it.

---

## 3. Communication catalog (the whole product, enumerated)

All client-facing communication happens on WhatsApp via pre-approved templates + interactive buttons. Every send and reply is logged in `wa_messages`. Times are trainer-local.

| # | Message | Trigger / time | Content | Client options | On reply |
|---|---|---|---|---|---|
| 1 | **Welcome** | Client added in app | "Hi {name}! {trainer} manages your sessions here now. Your schedule: {days} at {slot}. You'll get a confirmation the evening before each session." | — | — |
| 2 | **Evening confirmation** | Cron at `confirm_send_time` (default 8:00 PM), to every client scheduled tomorrow | "Tomorrow, {day} · {slot} — session **{n} of 12**." + late-cancel policy line if enabled | ✓ Confirm / Reschedule / Cancel | Confirm → status `confirmed`, dashboard dot turns green. Cancel → #6. Reschedule → #5. |
| 3 | **1-hour reminder** | 60 min before session, if toggle on and status `confirmed` | "See you at {slot} 💪 Session {n} of 12." | — | — |
| 4 | **Post-session feedback** | 30 min after trainer marks `completed`, if toggle on | "How was today's session?" + "Next: {next_day} at {slot}." | 👍 / 👎 | Stored on session. 👎 pings trainer in-app. |
| 5 | **Reschedule offer** | Client taps Reschedule | List message of trainer's **open slots** in the next 5 days (from slot grid minus booked sessions), max 6 options | Tap a slot / "None work" | Slot tap → session moves, trainer notified, new confirmation cycle applies. "None work" → trainer pinged to sort it personally. |
| 6 | **Cancel acknowledgment** | Client taps Cancel | ">12h: "No problem, cancelled. Next session: {next}." · <12h & policy on: "Cancelled. As it's under 12 hours, this counts as session {n} of 12."" | Reschedule instead | Status `cancelled` or `late_cancelled(counted)`; slot freed on dashboard. |
| 7 | **No-show note** | Trainer marks `no_show` | "We missed you today at {slot}." + policy line if counted | Reschedule | — |
| 8 | **Pack-end heads-up** | Confirmation for session 11 appends: "Two sessions left in this pack." Session 12 confirmation: "Final session of this pack tomorrow." | (rides on #2) | — | — |
| 9 | **New-pack note** | First confirmation after rollover | "New pack starts — session 1 of 12." | — | — |

Trainer-side notifications (in-app / push, not WhatsApp): reply received (with new status), "None work" reschedules, 👎 feedback, unanswered confirmations by 9:30 PM ("2 clients haven't replied — nudge or call").

**Design rule carried over from the DLS:** every message leads with the concrete fact (day, slot, session count); no filler, no emojis beyond one, policy stated plainly when it applies.

---

## 4. WhatsApp Business Cloud API — what's actually needed

This is the critical path; start it first, it has lead time.

1. **Meta Business Portfolio** (business.facebook.com) — free.
2. **A dedicated phone number for the trainer's business identity.** Hard constraint: a number registered to the Cloud API **cannot simultaneously run the normal WhatsApp app**. Vinod should NOT use his personal number — get a cheap second SIM (or virtual number) that becomes "Vinod · Fitness Coach". Display name goes through Meta review.
3. **WhatsApp Business App (Cloud API) in Meta developer console** — attach the number, get `phone_number_id` + permanent access token.
4. **Template approval:** messages #1–#3 and #6–#9 initiated by the business must be pre-approved **utility templates** (submit with variables; approval typically hours–2 days). Replies within the 24-hour customer-service window (e.g., reschedule lists after a button tap) are free-form interactive messages — no template needed.
5. **Webhook endpoint** (`/api/wa/webhook` on Vercel): verify token handshake, then receive button payloads and messages → update `sessions`, log to `wa_messages`, trigger follow-ups. Button payloads carry `session_id` so replies map unambiguously.
6. **Costs:** Meta bills per delivered template message (India utility-template rates are low — well under ₹1/message; ~10 clients × 2–3 messages/day is a few hundred rupees a month). Free tier covers the first 1,000 service conversations monthly. Verify current rates on Meta's pricing page at build time.
7. Later/scale option: a BSP (Gupshup, WATI, AiSensy) instead of direct Cloud API — more cost per message, less plumbing. For v1, direct Cloud API is fine and cheapest.

Env vars: `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_VERIFY_TOKEN`, `WA_APP_SECRET` + the standard Supabase/Google/Vercel set from the Personal spec.

---

## 5. Screens (per prototypes + DLS)

1. **Sign-in + onboarding** — Google; then name, gym, slot grid setup, WhatsApp connect wizard (walks through §4 steps with status checks).
2. **Today** — morning/evening slot ledgers with status dots, session `n of 12` under each name, tomorrow's-confirmations preview card.
3. **Clients** — list with schedule + `n/12` (amber ≥10), dashed add card.
4. **Add client** — name, WhatsApp number, day chips, Morning-slots / Evening-slots groups, **"sessions already done" stepper** (mid-pack onboarding → `packs.starting_offset`).
5. **Client page** — lifetime card (**client since**, total sessions, packs done, attendance %, cadence); current-pack card with progress; today's-session card (✓ Completed → optional dictated note → save / No-show); history grouped by pack, past packs collapsed with expand.
6. **Settings** — profile, slot grid (source of truth for reschedule offers), sessions-per-pack, late-cancel policy toggle, WhatsApp automation (number status, confirmation time, reminder + feedback toggles).

## 6. Build order

**M1** Skeleton: auth, schema, slot grid, clients CRUD with mid-pack stepper, Today ledger (manual statuses).
**M2** WhatsApp outbound: number setup, templates approved, evening-confirmation cron live. *Make-or-break milestone.*
**M3** Webhook inbound: confirm/cancel/reschedule round-trip updating the dashboard; reschedule slot-offer logic.
**M4** Session logging + pack engine: completed/no-show, notes, counting rules, silent rollover, pack-grouped history.
**M5** Reminders, feedback, pack-end messages, trainer push notifications, polish.

## 7. Out of scope (v1)

Payments and pricing of any kind · client-side app · group sessions · multiple trainers per client · calendar sync (Google Calendar export is a fast follow) · AI parsing of session notes into structured exercises (store raw text now; the Personal-app classifier can be pointed at it later, including auto-filing into a client's FitMonk Personal timeline when both apps are live).
