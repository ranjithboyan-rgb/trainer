export type SessionStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "late_cancelled"
  | "rescheduled"
  | "completed"
  | "no_show";

export interface Trainer {
  id: string;
  display_name: string;
  gym: string | null;
  timezone: string;
  confirm_send_time: string; // "20:00"
  reminder_1h: boolean;
  post_session_feedback: boolean;
  late_cancel_burns: boolean;
  sessions_per_pack: number;
  slots: string[]; // the trainer's real start times ("HH:MM"), source of truth
  session_minutes: number; // session length, for "10:00 – 11:00" ranges
  wa_phone_number_id: string | null;
  wa_connected: boolean;
}

export interface Client {
  id: string;
  trainer_id: string;
  name: string;
  wa_phone: string;
  training_days: number[];
  slot: string; // "06:00"
  client_since: string; // ISO date
  active: boolean;
  public_token: string; // stable link for the client action page
}

export interface Pack {
  id: string;
  client_id: string;
  trainer_id: string;
  number: number;
  size: number;
  started_on: string;
  completed_on: string | null;
  starting_offset: number;
}

export interface Session {
  id: string;
  client_id: string;
  trainer_id: string;
  pack_id: string | null;
  scheduled_for: string; // ISO datetime
  seq_in_pack: number | null;
  status: SessionStatus;
  counted: boolean;
  note: string | null;
  status_changed_at: string;
  reschedule_requested: boolean;
  slot: string | null; // this instance's time; null = client's default slot
}

// ── Derived / view models ───────────────────────────────────────────────────

// A client as shown in the Clients list and Today ledger.
export interface ClientSummary extends Client {
  packSize: number;
  packNumber: number;
  doneInPack: number; // starting_offset + counted sessions in current pack
  nextSeq: number; // the session number the next counted session will be
}

export interface HistoryRow {
  id: string;
  date: string; // ISO date
  seq: number | null;
  note: string;
  status: SessionStatus;
  counted: boolean;
}

export interface PastPackView {
  id: string;
  number: number;
  range: string; // "May 2 – Jun 11"
  done: number;
  size: number;
  rows: HistoryRow[];
}

export interface ClientDetail extends ClientSummary {
  totalDone: number;
  totalScheduledOrPast: number;
  packsCompleted: number;
  attendancePct: number;
  cadencePerWeek: number;
  nextDateISO: string | null; // next upcoming session date, for pre-filled sends
  todaySession: {
    scheduled: boolean;
    status: SessionStatus | null;
    logged: boolean;
  };
  currentPackRows: HistoryRow[];
  pastPacks: PastPackView[];
}

// Today ledger.
export interface TodaySlotEntry {
  slot: string;
  client: ClientSummary | null;
  status: SessionStatus | null; // the selected day's session status if any
  seq: number | null; // that session's seq_in_pack, when it exists
  rescheduleRequested: boolean; // client asked to reschedule via their page
}

export interface TodayLedger {
  dateISO: string;
  morning: TodaySlotEntry[];
  evening: TodaySlotEntry[];
  unconfirmedCount: number;
}

export interface NewClientInput {
  name: string;
  wa_phone: string;
  training_days: number[];
  slot: string;
  starting_offset: number;
}

// ── Public client action page (/c/<token>) ──────────────────────────────────

export type ClientAction = "confirm" | "cancel" | "reschedule";

export interface RescheduleOption {
  dateISO: string;
  slot: string;
}

// Grouped availability for the date-then-time picker: each upcoming day with
// its list of open slots.
export interface DayOptions {
  dateISO: string;
  slots: string[];
}

// What the no-login client page renders. Deliberately minimal PII.
export interface PublicClientView {
  trainerName: string;
  clientName: string;
  packDone: number;
  packSize: number;
  nextSeq: number;
  // The upcoming session, if one is scheduled.
  next: {
    dateISO: string;
    slot: string;
  } | null;
  // Current state of that upcoming session as far as the client's actions go.
  state: "open" | "confirmed" | "cancelled" | "reschedule_requested";
  lateCancelBurns: boolean;
  // True when the next session is inside the late-cancel window (<12h).
  withinLateWindow: boolean;
}

export interface ClientActionResult {
  ok: boolean;
  view: PublicClientView | null;
  // A short line to show the client after they act.
  message?: string;
}
