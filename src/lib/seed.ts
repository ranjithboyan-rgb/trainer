// Demo seed — mirrors the v3/v4 prototype clients so the app is rich on first
// run. Sessions are laid on each client's *actual* training weekdays walking
// back from today, so the Today date-strip shows real history on the right days.
// Only used in DEMO mode (no Supabase configured).

import type { Client, Pack, Session, Trainer } from "./types";
import { DEMO_TRAINER_ID } from "./config";
import { DEFAULT_SLOTS } from "./theme";

let counter = 0;
const id = (p: string) => `${p}-${(++counter).toString(36).padStart(4, "0")}`;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// The `count` most recent dates strictly before `now` that fall on one of
// `trainingDays` (0=Sun..6=Sat). Returned most-recent-first.
function trainingDatesBack(now: Date, trainingDays: number[], count: number): string[] {
  const dates: string[] = [];
  const d = new Date(now);
  d.setDate(d.getDate() - 1); // start yesterday — today stays unlogged
  let guard = 0;
  while (dates.length < count && guard < 2000) {
    if (trainingDays.includes(d.getDay())) dates.push(iso(d));
    d.setDate(d.getDate() - 1);
    guard++;
  }
  return dates;
}

export interface Dataset {
  trainer: Trainer;
  clients: Client[];
  packs: Pack[];
  sessions: Session[];
}

const NOTES = [
  "Legs — squats, leg press, RDL",
  "Shoulders & arms — face pulls, shoulder press, curls",
  "Push — bench, incline, dips",
  "Pull — rows, pulldown, curls",
  "Full body",
  "Upper mix — rows, chest press, pulldown",
];

export function buildSeed(now = new Date()): Dataset {
  counter = 0;
  const trainerId = DEMO_TRAINER_ID;

  const trainer: Trainer = {
    id: trainerId,
    display_name: "Vinod",
    gym: "Cult Gunjur · Bengaluru",
    timezone: "Asia/Kolkata",
    confirm_send_time: "20:00",
    reminder_1h: true,
    post_session_feedback: true,
    late_cancel_burns: true,
    sessions_per_pack: 12,
    slots: DEFAULT_SLOTS,
    session_minutes: 60,
    templates: {},
    wa_phone_number_id: null,
    wa_connected: false,
  };

  const clients: Client[] = [];
  const packs: Pack[] = [];
  const sessions: Session[] = [];

  const completed = (
    clientId: string,
    packId: string,
    seq: number,
    dateISO: string,
    note: string,
  ) =>
    sessions.push({
      id: id("s"),
      client_id: clientId,
      trainer_id: trainerId,
      pack_id: packId,
      scheduled_for: dateISO + "T00:00:00.000Z",
      seq_in_pack: seq,
      status: "completed",
      counted: true,
      note,
      status_changed_at: dateISO + "T00:00:00.000Z",
      reschedule_requested: false,
      slot: null,
    });

  const note = (i: number) => NOTES[i % NOTES.length];

  // ── Ranjith — Mon/Wed/Fri 6AM. 2 completed packs + current pack at 8/12 ──
  const ranjith: Client = {
    id: id("c"),
    trainer_id: trainerId,
    name: "Ranjith",
    wa_phone: "+919812345670",
    training_days: [1, 3, 5],
    slot: "06:00",
    client_since: "",
    active: true,
    public_token: "demo-ranjith",
  };
  clients.push(ranjith);
  {
    const dates = trainingDatesBack(now, ranjith.training_days, 32); // 8 + 12 + 12
    const p3: Pack = { id: id("p"), client_id: ranjith.id, trainer_id: trainerId, number: 3, size: 12, started_on: dates[7], completed_on: null, starting_offset: 0 };
    const p2: Pack = { id: id("p"), client_id: ranjith.id, trainer_id: trainerId, number: 2, size: 12, started_on: dates[19], completed_on: dates[8], starting_offset: 0 };
    const p1: Pack = { id: id("p"), client_id: ranjith.id, trainer_id: trainerId, number: 1, size: 12, started_on: dates[31], completed_on: dates[20], starting_offset: 0 };
    packs.push(p3, p2, p1);
    for (let s = 8; s >= 1; s--) completed(ranjith.id, p3.id, s, dates[8 - s], note(s));
    for (let s = 12; s >= 1; s--) completed(ranjith.id, p2.id, s, dates[20 - s], note(s + 1));
    for (let s = 12; s >= 1; s--) completed(ranjith.id, p1.id, s, dates[32 - s], note(s + 2));
    ranjith.client_since = dates[31];
  }

  // ── Arvind — Tue/Thu/Sat 8AM. Mid-pack onboard (offset 6), now 10/12 ──
  const arvind: Client = {
    id: id("c"),
    trainer_id: trainerId,
    name: "Arvind",
    wa_phone: "+919812345671",
    training_days: [2, 4, 6],
    slot: "08:00",
    client_since: "",
    active: true,
    public_token: "demo-arvind",
  };
  clients.push(arvind);
  {
    const dates = trainingDatesBack(now, arvind.training_days, 4);
    const p: Pack = { id: id("p"), client_id: arvind.id, trainer_id: trainerId, number: 1, size: 12, started_on: dates[3], completed_on: null, starting_offset: 6 };
    packs.push(p);
    for (let s = 10; s >= 7; s--) completed(arvind.id, p.id, s, dates[10 - s], "Full body");
    arvind.client_since = dates[3];
  }

  // ── Rahul — Mon/Wed/Fri 7PM. Current pack at 11/12 (+ one no-show) ──
  const rahul: Client = {
    id: id("c"),
    trainer_id: trainerId,
    name: "Rahul",
    wa_phone: "+919812345672",
    training_days: [1, 3, 5],
    slot: "19:00",
    client_since: "",
    active: true,
    public_token: "demo-rahul",
  };
  clients.push(rahul);
  {
    const dates = trainingDatesBack(now, rahul.training_days, 13);
    const p: Pack = { id: id("p"), client_id: rahul.id, trainer_id: trainerId, number: 1, size: 12, started_on: dates[12], completed_on: null, starting_offset: 0 };
    packs.push(p);
    for (let s = 11; s >= 1; s--) completed(rahul.id, p.id, s, dates[11 - s], note(s + 2));
    // a no-show on the oldest training day in the window
    sessions.push({
      id: id("s"), client_id: rahul.id, trainer_id: trainerId, pack_id: p.id,
      scheduled_for: dates[12] + "T00:00:00.000Z", seq_in_pack: null,
      status: "no_show", counted: false, note: null, status_changed_at: dates[12] + "T00:00:00.000Z",
      reschedule_requested: false, slot: null,
    });
    rahul.client_since = dates[12];
  }

  return { trainer, clients, packs, sessions };
}
