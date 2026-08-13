import "server-only";
import type {
  Client,
  ClientAction,
  ClientActionResult,
  Pack,
  PublicClientView,
  Session,
  Trainer,
} from "./types";
import {
  buildClientSummary,
  currentPack,
  doneInPack,
  effectiveSlot,
  nextSessionDate,
  shiftISO,
  todayISO,
  TERMINAL,
} from "./domain";
import { fmtSlot } from "./theme";
import { relativeDay } from "./templates";
import { isDemo } from "./config";
import { buildSeed, type Dataset } from "./seed";
import { createAdminClient } from "./supabase/admin";
import type { DayOptions } from "./types";

const RESCHEDULE_WINDOW_DAYS = 7;

// ── Shared view/logic ───────────────────────────────────────────────────────

const LATE_WINDOW_MS = 12 * 60 * 60 * 1000;

function sessionDateTime(dateISO: string, slot: string): number {
  return new Date(`${dateISO}T${slot}:00`).getTime();
}

function stateOf(row: Session | undefined): PublicClientView["state"] {
  if (!row) return "open";
  if (row.status === "confirmed") return "confirmed";
  if (row.status === "cancelled" || row.status === "late_cancelled") return "cancelled";
  if (row.reschedule_requested) return "reschedule_requested";
  return "open";
}

function buildView(
  client: Client,
  packs: Pack[],
  sessions: Session[],
  trainer: Trainer,
  day: string,
): PublicClientView {
  const summary = buildClientSummary(client, packs, sessions);
  const date = nextSessionDate(client, sessions, day);
  const row = date
    ? sessions.find((s) => s.scheduled_for.slice(0, 10) === date)
    : undefined;
  const slot = effectiveSlot(row, client.slot);
  const withinLateWindow = date
    ? sessionDateTime(date, slot) - Date.now() < LATE_WINDOW_MS
    : false;
  return {
    trainerName: trainer.display_name,
    clientName: client.name,
    packDone: summary.doneInPack,
    packSize: summary.packSize,
    nextSeq: summary.nextSeq,
    next: date ? { dateISO: date, slot } : null,
    state: stateOf(row),
    lateCancelBurns: trainer.late_cancel_burns,
    withinLateWindow,
  };
}

// A (date, slot) is occupied if any active client has a non-terminal session or
// recurring class there. Uses the full roster + all their sessions.
function slotOccupied(
  roster: Client[],
  sessionsByClient: Map<string, Session[]>,
  dateISO: string,
  slot: string,
): boolean {
  const weekday = new Date(dateISO + "T00:00:00").getDay();
  return roster.some((c) => {
    if (!c.active) return false;
    const row = (sessionsByClient.get(c.id) ?? []).find(
      (s) => s.scheduled_for.slice(0, 10) === dateISO,
    );
    if (row) {
      if (TERMINAL.includes(row.status)) return false; // freed
      return effectiveSlot(row, c.slot) === slot;
    }
    return c.training_days.includes(weekday) && c.slot === slot;
  });
}

// Reschedule can only shift a session into the gap BEFORE the client's next
// regular session — you can't leapfrog it. Returns the exclusive end date of
// that window. If the session being moved is the pack's last (nothing after
// it), open up the full week instead.
function rescheduleWindowEnd(
  client: Client,
  packs: Pack[],
  sessions: Session[],
  today: string,
): string {
  const full = shiftISO(today, RESCHEDULE_WINDOW_DAYS + 1); // exclusive → 7 days
  const oldDate = nextSessionDate(client, sessions, today);
  if (!oldDate) return full;
  const summary = buildClientSummary(client, packs, sessions);
  if (summary.nextSeq >= summary.packSize) return full; // last session of the pack
  const following = nextSessionDate(client, sessions, shiftISO(oldDate, 1));
  return following ?? full;
}

// Open slots grouped by day, from tomorrow up to (but not including) untilISO.
// `grid` is the trainer's configured slot times.
function computeDayOptions(
  roster: Client[],
  sessionsByClient: Map<string, Session[]>,
  fromISO: string,
  untilISO: string,
  grid: string[],
): DayOptions[] {
  const out: DayOptions[] = [];
  for (let i = 1; i <= 21; i++) {
    const d = shiftISO(fromISO, i);
    if (d >= untilISO) break;
    const slots = grid.filter((slot) => !slotOccupied(roster, sessionsByClient, d, slot));
    out.push({ dateISO: d, slots });
  }
  return out;
}

function isOptionOpen(
  roster: Client[],
  sessionsByClient: Map<string, Session[]>,
  fromISO: string,
  untilISO: string,
  grid: string[],
  dateISO: string,
  slot: string,
): boolean {
  if (dateISO >= untilISO) return false;
  const day = computeDayOptions(roster, sessionsByClient, fromISO, untilISO, grid).find(
    (o) => o.dateISO === dateISO,
  );
  return !!day && day.slots.includes(slot);
}

// Given the resolved rows, decide the mutation for an action on the next
// session. Returns the patched/created session row (caller persists it) plus a
// pack to close if a burned late-cancel filled the pack.
interface ActionPlan {
  row: Session;
  isNew: boolean;
  completePackId?: string;
  message: string;
}

function planAction(
  client: Client,
  packs: Pack[],
  sessions: Session[],
  trainer: Trainer,
  action: ClientAction,
  date: string,
): ActionPlan {
  const existing = sessions.find((s) => s.scheduled_for.slice(0, 10) === date);
  const slot = effectiveSlot(existing, client.slot);
  const base: Session =
    existing ?? {
      id: "",
      client_id: client.id,
      trainer_id: client.trainer_id,
      pack_id: currentPack(packs)?.id ?? null,
      scheduled_for: `${date}T00:00:00.000Z`,
      seq_in_pack: null,
      status: "scheduled",
      counted: false,
      note: null,
      status_changed_at: new Date().toISOString(),
      reschedule_requested: false,
      slot: null,
    };
  const row: Session = { ...base, status_changed_at: new Date().toISOString() };
  const when = relativeDay(date, todayISO());

  if (action === "confirm") {
    row.status = "confirmed";
    row.reschedule_requested = false;
    return { row, isNew: !existing, message: `Confirmed — see you ${when} at ${fmtSlot(slot)}.` };
  }

  if (action === "reschedule") {
    row.reschedule_requested = true;
    return {
      row,
      isNew: !existing,
      message: `Got it — ${trainer.display_name} will message you with new options.`,
    };
  }

  // cancel
  row.reschedule_requested = false;
  const withinWindow = sessionDateTime(date, slot) - Date.now() < LATE_WINDOW_MS;
  if (withinWindow && trainer.late_cancel_burns) {
    const pack = currentPack(packs);
    const seq = Math.min(pack ? doneInPack(pack, sessions) + 1 : 1, pack?.size ?? 12);
    row.status = "late_cancelled";
    row.counted = true;
    row.seq_in_pack = seq;
    row.pack_id = pack?.id ?? row.pack_id;
    const completePackId = pack && seq >= pack.size ? pack.id : undefined;
    return {
      row,
      isNew: !existing,
      completePackId,
      message: `Cancelled. As it's under 12 hours, this counted as session ${seq} of ${pack?.size ?? 12}.`,
    };
  }
  row.status = "cancelled";
  row.counted = false;
  return {
    row,
    isNew: !existing,
    message: `Cancelled. ${trainer.display_name} will be in touch about your next session.`,
  };
}

// ── DEMO backend (shares repo.ts's in-memory singleton via the same key) ─────
const g = globalThis as unknown as { __fitmonkDemo?: Dataset };
function demoData(): Dataset {
  if (!g.__fitmonkDemo) g.__fitmonkDemo = buildSeed();
  return g.__fitmonkDemo;
}
let pubIdCounter = 5000;

function byClient(sessions: Session[]): Map<string, Session[]> {
  const m = new Map<string, Session[]>();
  for (const s of sessions) {
    const arr = m.get(s.client_id) ?? [];
    arr.push(s);
    m.set(s.client_id, arr);
  }
  return m;
}

function demoLookup(token: string) {
  const d = demoData();
  const client = d.clients.find((c) => c.public_token === token && c.active);
  if (!client) return null;
  return {
    d,
    client,
    packs: d.packs.filter((p) => p.client_id === client.id),
    sessions: d.sessions.filter((s) => s.client_id === client.id),
    trainer: d.trainer,
    roster: d.clients.filter((c) => c.trainer_id === d.trainer.id),
    rosterSessions: byClient(d.sessions),
  };
}

// ── SUPABASE backend (service role — no RLS, keyed by token) ─────────────────
const hhmm = (s: string | null | undefined): string | null => (s ? s.slice(0, 5) : null);
const normClient = (c: Client): Client => ({ ...c, slot: hhmm(c.slot) ?? c.slot });
const normSession = (s: Session): Session => ({ ...s, slot: hhmm(s.slot) });

async function adminLookup(token: string) {
  const db = createAdminClient();
  const { data: client } = await db
    .from("trainer_clients")
    .select("*")
    .eq("public_token", token)
    .eq("active", true)
    .maybeSingle();
  if (!client) return null;
  const c = normClient(client as Client);
  const [packs, trainer, roster, rosterSessionsRes] = await Promise.all([
    db.from("trainer_packs").select("*").eq("client_id", c.id),
    db.from("trainer_profiles").select("*").eq("id", c.trainer_id).single(),
    db.from("trainer_clients").select("*").eq("trainer_id", c.trainer_id).eq("active", true),
    db.from("trainer_sessions").select("*").eq("trainer_id", c.trainer_id),
  ]);
  const allSessions = ((rosterSessionsRes.data ?? []) as Session[]).map(normSession);
  return {
    db,
    client: c,
    packs: (packs.data ?? []) as Pack[],
    sessions: allSessions.filter((s) => s.client_id === c.id),
    trainer: trainer.data as Trainer,
    roster: ((roster.data ?? []) as Client[]).map(normClient),
    rosterSessions: byClient(allSessions),
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function getPublicView(token: string): Promise<PublicClientView | null> {
  const day = todayISO();
  if (isDemo) {
    const ctx = demoLookup(token);
    if (!ctx) return null;
    return buildView(ctx.client, ctx.packs, ctx.sessions, ctx.trainer, day);
  }
  const ctx = await adminLookup(token);
  if (!ctx) return null;
  return buildView(ctx.client, ctx.packs, ctx.sessions, ctx.trainer, day);
}

export async function applyClientAction(
  token: string,
  action: ClientAction,
): Promise<ClientActionResult> {
  const day = todayISO();

  if (isDemo) {
    const ctx = demoLookup(token);
    if (!ctx) return { ok: false, view: null };
    const date = nextSessionDate(ctx.client, ctx.sessions, day);
    if (!date) return { ok: false, view: buildView(ctx.client, ctx.packs, ctx.sessions, ctx.trainer, day) };
    const plan = planAction(ctx.client, ctx.packs, ctx.sessions, ctx.trainer, action, date);
    if (plan.isNew) {
      plan.row.id = `s-pub-${++pubIdCounter}`;
      ctx.d.sessions.push(plan.row);
    } else {
      const target = ctx.d.sessions.find((s) => s.id === plan.row.id);
      if (target) Object.assign(target, plan.row);
    }
    if (plan.completePackId) {
      const pk = ctx.d.packs.find((p) => p.id === plan.completePackId);
      if (pk) pk.completed_on = date;
    }
    const fresh = demoLookup(token)!;
    return {
      ok: true,
      view: buildView(fresh.client, fresh.packs, fresh.sessions, fresh.trainer, day),
      message: plan.message,
    };
  }

  const ctx = await adminLookup(token);
  if (!ctx) return { ok: false, view: null };
  const date = nextSessionDate(ctx.client, ctx.sessions, day);
  if (!date) return { ok: false, view: buildView(ctx.client, ctx.packs, ctx.sessions, ctx.trainer, day) };
  const plan = planAction(ctx.client, ctx.packs, ctx.sessions, ctx.trainer, action, date);

  if (plan.isNew) {
    const { id: _omit, ...insert } = plan.row;
    void _omit;
    await ctx.db.from("trainer_sessions").insert(insert);
  } else {
    await ctx.db.from("trainer_sessions").update(plan.row).eq("id", plan.row.id);
  }
  if (plan.completePackId) {
    await ctx.db.from("trainer_packs").update({ completed_on: date }).eq("id", plan.completePackId);
  }

  const fresh = await adminLookup(token);
  return {
    ok: true,
    view: fresh ? buildView(fresh.client, fresh.packs, fresh.sessions, fresh.trainer, day) : null,
    message: plan.message,
  };
}

// Open slots (grouped by day) the client can move their next session into.
export async function getRescheduleOptions(token: string): Promise<DayOptions[]> {
  const day = todayISO();
  const ctx = isDemo ? demoLookup(token) : await adminLookup(token);
  if (!ctx) return [];
  const until = rescheduleWindowEnd(ctx.client, ctx.packs, ctx.sessions, day);
  return computeDayOptions(ctx.roster, ctx.rosterSessions, day, until, ctx.trainer.slots);
}

// Move the client's next session to (dateISO, slot). Marks the old instance
// "rescheduled" and creates a confirmed session at the new time.
function buildRescheduleRows(
  client: Client,
  packs: Pack[],
  sessions: Session[],
  oldDate: string,
  newDate: string,
  slot: string,
) {
  const existingOld = sessions.find((s) => s.scheduled_for.slice(0, 10) === oldDate);
  const now = new Date().toISOString();
  const oldBase: Session = existingOld ?? {
    id: "",
    client_id: client.id,
    trainer_id: client.trainer_id,
    pack_id: currentPack(packs)?.id ?? null,
    scheduled_for: `${oldDate}T00:00:00.000Z`,
    seq_in_pack: null,
    status: "scheduled",
    counted: false,
    note: null,
    status_changed_at: now,
    reschedule_requested: false,
    slot: null,
  };
  const oldRow: Session = {
    ...oldBase,
    status: "rescheduled",
    reschedule_requested: false,
    status_changed_at: now,
  };
  const newRow: Session = {
    id: "",
    client_id: client.id,
    trainer_id: client.trainer_id,
    pack_id: currentPack(packs)?.id ?? null,
    scheduled_for: `${newDate}T00:00:00.000Z`,
    seq_in_pack: null,
    status: "confirmed",
    counted: false,
    note: null,
    status_changed_at: now,
    reschedule_requested: false,
    slot,
  };
  return { oldRow, oldIsNew: !existingOld, newRow };
}

export async function applyReschedule(
  token: string,
  dateISO: string,
  slot: string,
): Promise<ClientActionResult> {
  const day = todayISO();
  const when = relativeDay(dateISO, day);
  const message = `Moved to ${when} at ${fmtSlot(slot)}. See you then!`;

  if (isDemo) {
    const ctx = demoLookup(token);
    if (!ctx) return { ok: false, view: null };
    const view = () => buildView(ctx.client, ctx.packs, ctx.sessions, ctx.trainer, day);
    const oldDate = nextSessionDate(ctx.client, ctx.sessions, day);
    if (!oldDate) return { ok: false, view: view() };
    const until = rescheduleWindowEnd(ctx.client, ctx.packs, ctx.sessions, day);
    if (!isOptionOpen(ctx.roster, ctx.rosterSessions, day, until, ctx.trainer.slots, dateISO, slot)) {
      return { ok: false, view: view(), message: "That time is no longer available." };
    }

    const { oldRow, oldIsNew, newRow } = buildRescheduleRows(
      ctx.client, ctx.packs, ctx.sessions, oldDate, dateISO, slot,
    );
    if (oldIsNew) {
      oldRow.id = `s-pub-${++pubIdCounter}`;
      ctx.d.sessions.push(oldRow);
    } else {
      const t = ctx.d.sessions.find((s) => s.id === oldRow.id);
      if (t) Object.assign(t, oldRow);
    }
    newRow.id = `s-pub-${++pubIdCounter}`;
    ctx.d.sessions.push(newRow);
    const fresh = demoLookup(token)!;
    return { ok: true, view: buildView(fresh.client, fresh.packs, fresh.sessions, fresh.trainer, day), message };
  }

  const ctx = await adminLookup(token);
  if (!ctx) return { ok: false, view: null };
  const view = () => buildView(ctx.client, ctx.packs, ctx.sessions, ctx.trainer, day);
  const oldDate = nextSessionDate(ctx.client, ctx.sessions, day);
  if (!oldDate) return { ok: false, view: view() };
  const until = rescheduleWindowEnd(ctx.client, ctx.packs, ctx.sessions, day);
  if (!isOptionOpen(ctx.roster, ctx.rosterSessions, day, until, ctx.trainer.slots, dateISO, slot)) {
    return { ok: false, view: view(), message: "That time is no longer available." };
  }

  const { oldRow, oldIsNew, newRow } = buildRescheduleRows(
    ctx.client, ctx.packs, ctx.sessions, oldDate, dateISO, slot,
  );
  if (oldIsNew) {
    const { id: _o, ...insert } = oldRow;
    void _o;
    await ctx.db.from("trainer_sessions").insert(insert);
  } else {
    await ctx.db.from("trainer_sessions").update(oldRow).eq("id", oldRow.id);
  }
  const { id: _n, ...newInsert } = newRow;
  void _n;
  await ctx.db.from("trainer_sessions").insert(newInsert);

  const fresh = await adminLookup(token);
  return {
    ok: true,
    view: fresh ? buildView(fresh.client, fresh.packs, fresh.sessions, fresh.trainer, day) : null,
    message,
  };
}
