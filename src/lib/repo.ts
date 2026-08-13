import "server-only";
import type {
  Client,
  ClientDetail,
  ClientSummary,
  NewClientInput,
  Pack,
  Session,
  SessionStatus,
  TodayLedger,
  TodaySlotEntry,
  Trainer,
} from "./types";
import {
  buildClientDetail,
  buildClientSummary,
  currentPack,
  planLog,
  todayISO,
} from "./domain";
import { buildSeed, type Dataset } from "./seed";
import { isDemo, DEMO_TRAINER_ID } from "./config";
import { createClient as createSupabaseServer } from "./supabase/server";
import { newToken } from "./token";
import { splitSlots, DEFAULT_SLOTS } from "./theme";

// Postgres `time` columns come back as "HH:MM:SS"; the app compares against the
// "HH:MM" slot grid. Normalise on the way out of Supabase.
const hhmm = (s: string | null | undefined): string | null =>
  s ? s.slice(0, 5) : null;
const normClient = (c: Client): Client => ({ ...c, slot: hhmm(c.slot) ?? c.slot });
const normSession = (s: Session): Session => ({ ...s, slot: hhmm(s.slot) });

export interface Repo {
  trainerId: string;
  getTrainer(): Promise<Trainer>;
  updateTrainer(patch: Partial<Trainer>): Promise<Trainer>;
  accountEmail(): Promise<string | null>;
  listClients(): Promise<ClientSummary[]>;
  getClientDetail(id: string): Promise<ClientDetail | null>;
  createClient(input: NewClientInput): Promise<string>;
  getLedger(dateISO: string): Promise<TodayLedger>;
  getSessionDates(fromISO: string, toISO: string): Promise<string[]>;
  logSession(
    clientId: string,
    input: { status: "completed" | "no_show"; note: string | null },
  ): Promise<void>;
  setTodayStatus(clientId: string, status: SessionStatus): Promise<void>;
  setSessionDelay(clientId: string, minutes: number): Promise<void>;
  cancelSession(clientId: string): Promise<void>;
}

// ── Ledger assembly (shared) ────────────────────────────────────────────────
function assembleToday(
  summaries: ClientSummary[],
  sessionsByClient: Map<string, Session[]>,
  dayISO: string,
  slots: string[],
): TodayLedger {
  const weekday = new Date(dayISO + "T00:00:00").getDay();
  let unconfirmed = 0;

  // Place each client on this day, keyed by their effective slot (a session's
  // own slot when it was rescheduled, otherwise their default). One client can
  // only be in one slot per day.
  const placed = new Map<string, TodaySlotEntry>();
  for (const c of summaries) {
    if (!c.active) continue;
    const session = (sessionsByClient.get(c.id) ?? []).find(
      (s) => s.scheduled_for.slice(0, 10) === dayISO,
    );
    let slot: string;
    let status: TodaySlotEntry["status"];
    if (session) {
      slot = session.slot ?? c.slot;
      status = session.status;
    } else if (c.training_days.includes(weekday)) {
      slot = c.slot;
      status = "scheduled";
    } else {
      continue;
    }
    if (status === "scheduled") unconfirmed++;
    placed.set(slot, {
      slot,
      client: c,
      status,
      seq: session?.seq_in_pack ?? null,
      rescheduleRequested: session?.reschedule_requested ?? false,
      delayMinutes: session?.delay_minutes ?? 0,
    });
  }

  const entryFor = (slot: string): TodaySlotEntry =>
    placed.get(slot) ?? {
      slot,
      client: null,
      status: null,
      seq: null,
      rescheduleRequested: false,
      delayMinutes: 0,
    };

  // Show the trainer's configured slots, plus any off-grid slot a client
  // actually sits in (e.g. a reschedule), so nobody silently disappears.
  const allSlots = Array.from(new Set([...slots, ...placed.keys()])).sort();
  const { morning, evening } = splitSlots(allSlots);

  return {
    dateISO: dayISO,
    morning: morning.map(entryFor),
    evening: evening.map(entryFor),
    unconfirmedCount: unconfirmed,
  };
}

// ── DEMO backend (in-memory singleton, survives HMR) ────────────────────────
const g = globalThis as unknown as { __fitmonkDemo?: Dataset };
function demoData(): Dataset {
  if (!g.__fitmonkDemo) g.__fitmonkDemo = buildSeed();
  return g.__fitmonkDemo;
}
let demoIdCounter = 1000;
const demoId = (p: string) => `${p}-demo-${++demoIdCounter}`;

class DemoRepo implements Repo {
  trainerId = DEMO_TRAINER_ID;

  async getTrainer() {
    return demoData().trainer;
  }
  async updateTrainer(patch: Partial<Trainer>) {
    const d = demoData();
    d.trainer = { ...d.trainer, ...patch };
    return d.trainer;
  }
  async accountEmail() {
    return null;
  }
  async listClients() {
    const d = demoData();
    return d.clients
      .filter((c) => c.active)
      .map((c) =>
        buildClientSummary(
          c,
          d.packs.filter((p) => p.client_id === c.id),
          d.sessions.filter((s) => s.client_id === c.id),
        ),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  async getClientDetail(id: string) {
    const d = demoData();
    const client = d.clients.find((c) => c.id === id);
    if (!client) return null;
    return buildClientDetail(
      client,
      d.packs.filter((p) => p.client_id === id),
      d.sessions.filter((s) => s.client_id === id),
      todayISO(),
    );
  }
  async createClient(input: NewClientInput) {
    const d = demoData();
    const clientId = demoId("c");
    const client: Client = {
      id: clientId,
      trainer_id: this.trainerId,
      name: input.name,
      wa_phone: input.wa_phone,
      training_days: input.training_days,
      slot: input.slot,
      client_since: todayISO(),
      active: true,
      public_token: newToken(),
    };
    const pack: Pack = {
      id: demoId("p"),
      client_id: clientId,
      trainer_id: this.trainerId,
      number: 1,
      size: d.trainer.sessions_per_pack,
      started_on: todayISO(),
      completed_on: null,
      starting_offset: input.starting_offset,
    };
    d.clients.push(client);
    d.packs.push(pack);
    return clientId;
  }
  async getLedger(dateISO: string) {
    const d = demoData();
    const sessionsByClient = new Map<string, Session[]>();
    for (const s of d.sessions) {
      const arr = sessionsByClient.get(s.client_id) ?? [];
      arr.push(s);
      sessionsByClient.set(s.client_id, arr);
    }
    return assembleToday(await this.listClients(), sessionsByClient, dateISO, d.trainer.slots);
  }
  async getSessionDates(fromISO: string, toISO: string) {
    const set = new Set<string>();
    for (const s of demoData().sessions) {
      const day = s.scheduled_for.slice(0, 10);
      if (day >= fromISO && day <= toISO) set.add(day);
    }
    return [...set];
  }
  async logSession(
    clientId: string,
    input: { status: "completed" | "no_show"; note: string | null },
  ) {
    const d = demoData();
    const client = d.clients.find((c) => c.id === clientId);
    if (!client) return;
    const packs = d.packs.filter((p) => p.client_id === clientId);
    const sessions = d.sessions.filter((s) => s.client_id === clientId);
    const plan = planLog(client, packs, sessions, { ...input, dayISO: todayISO() }, d.trainer.sessions_per_pack);

    if (plan.newPack) {
      const np: Pack = { ...(plan.newPack as Pack), id: demoId("p") };
      d.packs.push(np);
      plan.session.pack_id = np.id;
    }
    if (plan.completePack) {
      const p = d.packs.find((x) => x.id === plan.completePack!.id);
      if (p) p.completed_on = plan.completePack.completed_on;
    }
    if (plan.session.id) {
      const existing = d.sessions.find((s) => s.id === plan.session.id);
      if (existing) Object.assign(existing, plan.session);
    } else {
      d.sessions.push({ ...(plan.session as Session), id: demoId("s") });
    }
  }
  async setTodayStatus(clientId: string, status: SessionStatus) {
    const d = demoData();
    const day = todayISO();
    const existing = d.sessions.find(
      (s) => s.client_id === clientId && s.scheduled_for.slice(0, 10) === day,
    );
    if (existing) {
      existing.status = status;
      existing.status_changed_at = new Date().toISOString();
      return;
    }
    const client = d.clients.find((c) => c.id === clientId);
    if (!client) return;
    d.sessions.push({
      id: demoId("s"),
      client_id: clientId,
      trainer_id: this.trainerId,
      pack_id: currentPack(d.packs.filter((p) => p.client_id === clientId))?.id ?? null,
      scheduled_for: day + "T00:00:00.000Z",
      seq_in_pack: null,
      status,
      counted: false,
      note: null,
      status_changed_at: new Date().toISOString(),
      reschedule_requested: false,
      slot: null,
    });
  }
  private demoTodayRow(clientId: string): Session {
    const d = demoData();
    const day = todayISO();
    let row = d.sessions.find(
      (s) => s.client_id === clientId && s.scheduled_for.slice(0, 10) === day,
    );
    if (!row) {
      row = {
        id: demoId("s"),
        client_id: clientId,
        trainer_id: this.trainerId,
        pack_id: currentPack(d.packs.filter((p) => p.client_id === clientId))?.id ?? null,
        scheduled_for: day + "T00:00:00.000Z",
        seq_in_pack: null,
        status: "scheduled",
        counted: false,
        note: null,
        status_changed_at: new Date().toISOString(),
        reschedule_requested: false,
        slot: null,
        delay_minutes: 0,
      };
      d.sessions.push(row);
    }
    return row;
  }
  async setSessionDelay(clientId: string, minutes: number) {
    const row = this.demoTodayRow(clientId);
    row.delay_minutes = Math.max(0, minutes);
    row.status_changed_at = new Date().toISOString();
  }
  async cancelSession(clientId: string) {
    const row = this.demoTodayRow(clientId);
    row.status = "cancelled";
    row.counted = false;
    row.delay_minutes = 0;
    row.reschedule_requested = false;
    row.status_changed_at = new Date().toISOString();
  }
}

// ── SUPABASE backend ────────────────────────────────────────────────────────
class SupabaseRepo implements Repo {
  private _trainer?: Promise<Trainer>;
  constructor(
    public trainerId: string,
    private db: Awaited<ReturnType<typeof createSupabaseServer>>,
    private defaultName = "Trainer",
  ) {}

  // Memoized per request so the two-or-three getTrainer calls a page makes hit
  // the DB once. Creates the row on first ever visit (no per-request write).
  getTrainer() {
    if (!this._trainer) this._trainer = this.loadTrainer();
    return this._trainer;
  }
  private async loadTrainer(): Promise<Trainer> {
    let { data } = await this.db
      .from("trainer_profiles")
      .select("*")
      .eq("id", this.trainerId)
      .maybeSingle();
    if (!data) {
      const ins = await this.db
        .from("trainer_profiles")
        .insert({ id: this.trainerId, display_name: this.defaultName })
        .select("*")
        .single();
      data = ins.data;
    }
    const t = data as Trainer;
    // Defensive: tolerate the slots migration not being run yet.
    return {
      ...t,
      slots: t.slots?.length ? t.slots : DEFAULT_SLOTS,
      session_minutes: t.session_minutes || 60,
    };
  }
  async updateTrainer(patch: Partial<Trainer>) {
    this._trainer = undefined; // invalidate the per-request memo
    const { data } = await this.db
      .from("trainer_profiles")
      .update(patch)
      .eq("id", this.trainerId)
      .select("*")
      .single();
    return data as Trainer;
  }
  async accountEmail() {
    const {
      data: { user },
    } = await this.db.auth.getUser();
    return user?.email ?? null;
  }
  private async fetchAll() {
    const [clients, packs, sessions] = await Promise.all([
      this.db.from("trainer_clients").select("*").eq("trainer_id", this.trainerId),
      this.db.from("trainer_packs").select("*").eq("trainer_id", this.trainerId),
      this.db.from("trainer_sessions").select("*").eq("trainer_id", this.trainerId),
    ]);
    return {
      clients: ((clients.data ?? []) as Client[]).map(normClient),
      packs: (packs.data ?? []) as Pack[],
      sessions: ((sessions.data ?? []) as Session[]).map(normSession),
    };
  }
  async listClients() {
    const { clients, packs, sessions } = await this.fetchAll();
    return clients
      .filter((c) => c.active)
      .map((c) =>
        buildClientSummary(
          c,
          packs.filter((p) => p.client_id === c.id),
          sessions.filter((s) => s.client_id === c.id),
        ),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  async getClientDetail(id: string) {
    const { data: client } = await this.db.from("trainer_clients").select("*").eq("id", id).single();
    if (!client) return null;
    const [packs, sessions] = await Promise.all([
      this.db.from("trainer_packs").select("*").eq("client_id", id),
      this.db.from("trainer_sessions").select("*").eq("client_id", id),
    ]);
    return buildClientDetail(
      normClient(client as Client),
      (packs.data ?? []) as Pack[],
      ((sessions.data ?? []) as Session[]).map(normSession),
      todayISO(),
    );
  }
  async createClient(input: NewClientInput) {
    const trainer = await this.getTrainer();
    const { data: client } = await this.db
      .from("trainer_clients")
      .insert({
        trainer_id: this.trainerId,
        name: input.name,
        wa_phone: input.wa_phone,
        training_days: input.training_days,
        slot: input.slot,
        public_token: newToken(),
      })
      .select("id")
      .single();
    const clientId = (client as { id: string }).id;
    await this.db.from("trainer_packs").insert({
      client_id: clientId,
      trainer_id: this.trainerId,
      number: 1,
      size: trainer.sessions_per_pack,
      starting_offset: input.starting_offset,
    });
    return clientId;
  }
  async getLedger(dateISO: string) {
    const [{ clients, packs, sessions }, trainer] = await Promise.all([
      this.fetchAll(),
      this.getTrainer(),
    ]);
    const summaries = clients
      .filter((c) => c.active)
      .map((c) =>
        buildClientSummary(
          c,
          packs.filter((p) => p.client_id === c.id),
          sessions.filter((s) => s.client_id === c.id),
        ),
      );
    const byClient = new Map<string, Session[]>();
    for (const s of sessions) {
      const arr = byClient.get(s.client_id) ?? [];
      arr.push(s);
      byClient.set(s.client_id, arr);
    }
    return assembleToday(summaries, byClient, dateISO, trainer.slots);
  }
  async getSessionDates(fromISO: string, toISO: string) {
    const { data } = await this.db
      .from("trainer_sessions")
      .select("scheduled_for")
      .eq("trainer_id", this.trainerId)
      .gte("scheduled_for", fromISO + "T00:00:00Z")
      .lte("scheduled_for", toISO + "T23:59:59Z");
    const set = new Set<string>();
    for (const r of (data ?? []) as { scheduled_for: string }[]) {
      set.add(r.scheduled_for.slice(0, 10));
    }
    return [...set];
  }
  async logSession(
    clientId: string,
    input: { status: "completed" | "no_show"; note: string | null },
  ) {
    const trainer = await this.getTrainer();
    const [{ data: client }, packsRes, sessionsRes] = await Promise.all([
      this.db.from("trainer_clients").select("*").eq("id", clientId).single(),
      this.db.from("trainer_packs").select("*").eq("client_id", clientId),
      this.db.from("trainer_sessions").select("*").eq("client_id", clientId),
    ]);
    if (!client) return;
    const packs = (packsRes.data ?? []) as Pack[];
    const sessions = (sessionsRes.data ?? []) as Session[];
    const plan = planLog(client as Client, packs, sessions, { ...input, dayISO: todayISO() }, trainer.sessions_per_pack);

    let packId = plan.session.pack_id;
    if (plan.newPack) {
      const { data: np } = await this.db
        .from("trainer_packs")
        .insert({
          client_id: clientId,
          trainer_id: this.trainerId,
          number: plan.newPack.number,
          size: plan.newPack.size,
          started_on: plan.newPack.started_on,
          starting_offset: plan.newPack.starting_offset,
        })
        .select("id")
        .single();
      packId = (np as { id: string }).id;
    }
    if (plan.completePack) {
      await this.db
        .from("trainer_packs")
        .update({ completed_on: plan.completePack.completed_on })
        .eq("id", plan.completePack.id);
    }
    const row = { ...plan.session, pack_id: packId };
    delete (row as { id?: string }).id;
    if (plan.session.id) {
      await this.db.from("trainer_sessions").update(row).eq("id", plan.session.id);
    } else {
      await this.db.from("trainer_sessions").insert(row);
    }
  }
  async setTodayStatus(clientId: string, status: SessionStatus) {
    const day = todayISO();
    const { data: existing } = await this.db
      .from("trainer_sessions")
      .select("id")
      .eq("client_id", clientId)
      .gte("scheduled_for", day + "T00:00:00Z")
      .lte("scheduled_for", day + "T23:59:59Z")
      .maybeSingle();
    if (existing) {
      await this.db
        .from("trainer_sessions")
        .update({ status, status_changed_at: new Date().toISOString() })
        .eq("id", (existing as { id: string }).id);
      return;
    }
    const { data: packs } = await this.db.from("trainer_packs").select("*").eq("client_id", clientId);
    await this.db.from("trainer_sessions").insert({
      client_id: clientId,
      trainer_id: this.trainerId,
      pack_id: currentPack((packs ?? []) as Pack[])?.id ?? null,
      scheduled_for: day + "T00:00:00.000Z",
      status,
    });
  }
  // Upsert today's session row and apply a patch (running-late / trainer-cancel).
  private async patchTodaySession(clientId: string, patch: Record<string, unknown>) {
    const day = todayISO();
    const { data: existing } = await this.db
      .from("trainer_sessions")
      .select("id")
      .eq("client_id", clientId)
      .gte("scheduled_for", day + "T00:00:00Z")
      .lte("scheduled_for", day + "T23:59:59Z")
      .maybeSingle();
    const full = { ...patch, status_changed_at: new Date().toISOString() };
    if (existing) {
      await this.db.from("trainer_sessions").update(full).eq("id", (existing as { id: string }).id);
      return;
    }
    const { data: packs } = await this.db.from("trainer_packs").select("*").eq("client_id", clientId);
    await this.db.from("trainer_sessions").insert({
      client_id: clientId,
      trainer_id: this.trainerId,
      pack_id: currentPack((packs ?? []) as Pack[])?.id ?? null,
      scheduled_for: day + "T00:00:00.000Z",
      status: "scheduled",
      ...full,
    });
  }
  async setSessionDelay(clientId: string, minutes: number) {
    await this.patchTodaySession(clientId, { delay_minutes: Math.max(0, minutes) });
  }
  async cancelSession(clientId: string) {
    await this.patchTodaySession(clientId, {
      status: "cancelled",
      counted: false,
      delay_minutes: 0,
      reschedule_requested: false,
    });
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────
// Returns null only in Supabase mode when there is no authenticated trainer —
// callers redirect to /login.
export async function getRepo(): Promise<Repo | null> {
  if (isDemo) return new DemoRepo();
  const db = await createSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  // Name used only if the trainer row doesn't exist yet — provisioning happens
  // lazily inside getTrainer (create-if-missing), so there's no write on every
  // page load.
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const displayName = meta.full_name || meta.name || user.email?.split("@")[0] || "Trainer";
  return new SupabaseRepo(user.id, db, displayName);
}
