// Pure business logic over in-memory rows. Both the demo store and the Supabase
// adapter fetch raw rows, then run these functions — so the pack/sequence rules
// live in exactly one place.

import type {
  Client,
  ClientDetail,
  ClientSummary,
  HistoryRow,
  Pack,
  PastPackView,
  Session,
  SessionStatus,
} from "./types";

export function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isSameDay(iso: string, dayISO: string): boolean {
  return iso.slice(0, 10) === dayISO;
}

export function shiftISO(iso: string, days: number): string {
  // Pure calendar arithmetic in UTC — parsing "…T00:00:00" as local time and
  // then serializing to UTC drops/adds a day in tz's that aren't UTC.
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// "rescheduled" is terminal for the OLD instance — the session moved elsewhere.
export const TERMINAL: SessionStatus[] = [
  "completed",
  "no_show",
  "cancelled",
  "late_cancelled",
  "rescheduled",
];

// The client's next upcoming session date: the earliest day on/after `dayISO`
// that is a training day OR carries a session row (covers reschedules onto
// non-training days), whose row (if any) isn't already resolved.
export function nextSessionDate(
  client: Client,
  sessions: Session[],
  dayISO: string,
  lookAheadDays = 21,
): string | null {
  for (let i = 0; i <= lookAheadDays; i++) {
    const d = shiftISO(dayISO, i);
    const weekday = new Date(d + "T00:00:00").getDay();
    const row = sessions.find((s) => s.scheduled_for.slice(0, 10) === d);
    const isTraining = client.training_days.includes(weekday);
    if (!row && !isTraining) continue;
    if (row && TERMINAL.includes(row.status)) continue;
    return d;
  }
  return null;
}

// The effective time a session sits at (its own slot, else the client default).
export function effectiveSlot(row: Session | undefined, clientSlot: string): string {
  return row?.slot ?? clientSlot;
}

// The active pack: the highest-numbered pack not yet completed (falls back to
// the highest-numbered pack overall).
export function currentPack(packs: Pack[]): Pack | null {
  if (packs.length === 0) return null;
  const open = packs.filter((p) => !p.completed_on);
  const pool = open.length ? open : packs;
  return pool.reduce((a, b) => (b.number > a.number ? b : a));
}

export function countedInPack(sessions: Session[], packId: string): Session[] {
  return sessions.filter((s) => s.pack_id === packId && s.counted);
}

export function doneInPack(pack: Pack, sessions: Session[]): number {
  return pack.starting_offset + countedInPack(sessions, pack.id).length;
}

function sessionDate(s: Session): string {
  return s.scheduled_for.slice(0, 10);
}

// Sessions for a pack as display rows, newest first.
export function packRows(sessions: Session[], packId: string): HistoryRow[] {
  return sessions
    .filter((s) => s.pack_id === packId)
    .sort((a, b) => (a.scheduled_for < b.scheduled_for ? 1 : -1))
    .map((s) => ({
      id: s.id,
      date: sessionDate(s),
      seq: s.seq_in_pack,
      note: s.note ?? statusLabel(s.status),
      status: s.status,
      counted: s.counted,
    }));
}

function statusLabel(status: SessionStatus): string {
  switch (status) {
    case "completed":
      return "Session done";
    case "no_show":
      return "No-show";
    case "late_cancelled":
      return "Late cancel — counted";
    case "cancelled":
      return "Cancelled";
    case "rescheduled":
      return "Rescheduled";
    case "confirmed":
      return "Confirmed";
    default:
      return "Scheduled";
  }
}

export function buildClientSummary(
  client: Client,
  packs: Pack[],
  sessions: Session[],
): ClientSummary {
  const pack = currentPack(packs);
  const size = pack?.size ?? 12;
  const done = pack ? doneInPack(pack, sessions) : 0;
  return {
    ...client,
    packSize: size,
    packNumber: pack?.number ?? 1,
    doneInPack: done,
    nextSeq: Math.min(done + 1, size),
  };
}

function monthDay(iso: string): string {
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(iso + "T00:00:00");
  return `${M[d.getMonth()]} ${d.getDate()}`;
}

export function buildClientDetail(
  client: Client,
  packs: Pack[],
  sessions: Session[],
  dayISO: string,
): ClientDetail {
  const summary = buildClientSummary(client, packs, sessions);
  const cur = currentPack(packs);

  // Lifetime numbers.
  const totalDone = packs.reduce((sum, p) => sum + doneInPack(p, sessions), 0);
  const missed = sessions.filter((s) => s.status === "no_show").length;
  const packsCompleted = packs.filter((p) => p.completed_on).length;
  const denom = totalDone + missed;
  const attendancePct = denom === 0 ? 100 : Math.round((totalDone / denom) * 100);

  // Today's session.
  const todayRow = sessions.find((s) => isSameDay(s.scheduled_for, dayISO)) ?? null;
  const scheduledToday = client.training_days.includes(
    new Date(dayISO + "T00:00:00").getDay(),
  );
  const logged =
    !!todayRow && (todayRow.status === "completed" || todayRow.status === "no_show");

  const pastPacks: PastPackView[] = packs
    .filter((p) => p.completed_on && (!cur || p.id !== cur.id))
    .sort((a, b) => b.number - a.number)
    .map((p) => {
      const rows = packRows(sessions, p.id);
      const range = `${monthDay(p.started_on)} – ${p.completed_on ? monthDay(p.completed_on) : "…"}`;
      return { id: p.id, number: p.number, range, done: doneInPack(p, sessions), size: p.size, rows };
    });

  return {
    ...summary,
    totalDone,
    totalScheduledOrPast: denom,
    packsCompleted,
    attendancePct,
    cadencePerWeek: client.training_days.length,
    nextDateISO: nextSessionDate(client, sessions, dayISO),
    todaySession: {
      scheduled: scheduledToday,
      status: todayRow?.status ?? null,
      logged,
      delayMinutes: todayRow?.delay_minutes ?? 0,
      slot: effectiveSlot(todayRow ?? undefined, client.slot),
    },
    currentPackRows: cur ? packRows(sessions, cur.id) : [],
    pastPacks,
  };
}

// ── Mutations (pure planners) ───────────────────────────────────────────────
// Given the current rows, decide what a "complete" or "no-show" log produces.
// Returns the session to upsert, plus an optional pack to mark completed and an
// optional new pack to create (silent rollover).

export interface LogPlan {
  session: Omit<Session, "id"> & { id?: string };
  completePack?: { id: string; completed_on: string };
  newPack?: Omit<Pack, "id"> & { id?: string };
}

export function planLog(
  client: Client,
  packs: Pack[],
  sessions: Session[],
  input: { status: "completed" | "no_show"; note: string | null; dayISO: string },
  defaultSize: number,
): LogPlan {
  const scheduledFor = `${input.dayISO}T00:00:00.000Z`;
  const existing = sessions.find((s) => isSameDay(s.scheduled_for, input.dayISO)) ?? null;

  if (input.status === "no_show") {
    return {
      session: {
        ...(existing?.id ? { id: existing.id } : {}),
        client_id: client.id,
        trainer_id: client.trainer_id,
        pack_id: currentPack(packs)?.id ?? null,
        scheduled_for: existing?.scheduled_for ?? scheduledFor,
        seq_in_pack: null,
        status: "no_show",
        counted: false,
        note: input.note,
        status_changed_at: new Date().toISOString(),
        reschedule_requested: false,
        slot: existing?.slot ?? null,
      },
    };
  }

  // Completed → counts toward a pack. Roll over if the current pack is full.
  let pack = currentPack(packs);
  const size = pack?.size ?? defaultSize;
  let newPack: LogPlan["newPack"];
  let completePack: LogPlan["completePack"];

  if (!pack || doneInPack(pack, sessions) >= size) {
    const nextNumber = (pack?.number ?? 0) + 1;
    if (pack) completePack = { id: pack.id, completed_on: input.dayISO };
    newPack = {
      client_id: client.id,
      trainer_id: client.trainer_id,
      number: nextNumber,
      size: defaultSize,
      started_on: input.dayISO,
      completed_on: null,
      starting_offset: 0,
    };
    pack = { ...(newPack as Pack), id: newPack.id ?? "pending" };
  }

  const seq = doneInPack(pack, sessions) + 1;
  const reachesEnd = seq >= (pack.size ?? size);

  return {
    session: {
      ...(existing?.id ? { id: existing.id } : {}),
      client_id: client.id,
      trainer_id: client.trainer_id,
      pack_id: pack.id,
      scheduled_for: existing?.scheduled_for ?? scheduledFor,
      seq_in_pack: seq,
      status: "completed",
      counted: true,
      note: input.note,
      status_changed_at: new Date().toISOString(),
      reschedule_requested: false,
      slot: existing?.slot ?? null,
    },
    // If this session fills the (non-new) current pack, close it.
    completePack:
      completePack ??
      (reachesEnd && !newPack ? { id: pack.id, completed_on: input.dayISO } : undefined),
    newPack,
  };
}
