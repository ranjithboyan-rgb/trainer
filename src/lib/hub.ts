import "server-only";
import { createAdminClient } from "./supabase/admin";
import { isDemo, HUB_ADMIN_EMAILS } from "./config";
import { buildSeed } from "./seed";

// ── Access ──────────────────────────────────────────────────────────────────
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return HUB_ADMIN_EMAILS.includes(email.toLowerCase());
}

// ── Shape ───────────────────────────────────────────────────────────────────
export interface HubTrainer {
  id: string;
  name: string;
  email: string | null;
  joinedISO: string | null;
  lastActiveISO: string | null; // most recent sign-in or session action
  active: boolean; // active within the last 7 days
  clients: number; // active clients on the roster
  sessionsLogged: number; // completed sessions, lifetime
  sessions30d: number; // sessions touched in the last 30 days
}

export interface HubOverview {
  trainers: HubTrainer[];
  totals: {
    trainers: number;
    activeTrainers: number;
    clients: number;
    sessionsLogged: number;
    sessions7d: number;
  };
  generatedAtISO: string;
}

const DAY = 86_400_000;
const maxISO = (a: string | null, b: string | null): string | null =>
  !a ? b : !b ? a : a > b ? a : b;

// ── Live (service role — reads every trainer, bypassing RLS) ─────────────────
async function liveOverview(): Promise<HubOverview> {
  const db = createAdminClient();
  const now = Date.now();

  const [profilesRes, clientsRes, sessionsRes, usersRes] = await Promise.all([
    db.from("trainer_profiles").select("id,display_name,created_at"),
    db.from("trainer_clients").select("trainer_id,active"),
    db.from("trainer_sessions").select("trainer_id,status,status_changed_at"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const profiles = (profilesRes.data ?? []) as {
    id: string;
    display_name: string;
    created_at: string;
  }[];
  const clients = (clientsRes.data ?? []) as { trainer_id: string; active: boolean }[];
  const sessions = (sessionsRes.data ?? []) as {
    trainer_id: string;
    status: string;
    status_changed_at: string;
  }[];
  const users = usersRes.data?.users ?? [];

  const userById = new Map(users.map((u) => [u.id, u]));

  const clientCount = new Map<string, number>();
  for (const c of clients) {
    if (c.active) clientCount.set(c.trainer_id, (clientCount.get(c.trainer_id) ?? 0) + 1);
  }

  const logged = new Map<string, number>();
  const recent30 = new Map<string, number>();
  const lastAction = new Map<string, string | null>();
  let platformSessions7d = 0;
  for (const s of sessions) {
    if (s.status === "completed") logged.set(s.trainer_id, (logged.get(s.trainer_id) ?? 0) + 1);
    const changed = s.status_changed_at;
    if (changed) {
      const age = now - new Date(changed).getTime();
      if (age <= 30 * DAY)
        recent30.set(s.trainer_id, (recent30.get(s.trainer_id) ?? 0) + 1);
      if (age <= 7 * DAY) platformSessions7d++;
      lastAction.set(s.trainer_id, maxISO(lastAction.get(s.trainer_id) ?? null, changed));
    }
  }

  const trainers: HubTrainer[] = profiles.map((p) => {
    const u = userById.get(p.id);
    const lastActiveISO = maxISO(u?.last_sign_in_at ?? null, lastAction.get(p.id) ?? null);
    const active = lastActiveISO ? now - new Date(lastActiveISO).getTime() <= 7 * DAY : false;
    return {
      id: p.id,
      name: p.display_name,
      email: u?.email ?? null,
      joinedISO: p.created_at,
      lastActiveISO,
      active,
      clients: clientCount.get(p.id) ?? 0,
      sessionsLogged: logged.get(p.id) ?? 0,
      sessions30d: recent30.get(p.id) ?? 0,
    };
  });

  // Most recently active first; never-active trainers sink to the bottom.
  trainers.sort((a, b) => (b.lastActiveISO ?? "").localeCompare(a.lastActiveISO ?? ""));

  return {
    trainers,
    totals: {
      trainers: trainers.length,
      activeTrainers: trainers.filter((t) => t.active).length,
      clients: trainers.reduce((n, t) => n + t.clients, 0),
      sessionsLogged: trainers.reduce((n, t) => n + t.sessionsLogged, 0),
      sessions7d: platformSessions7d,
    },
    generatedAtISO: new Date().toISOString(),
  };
}

// ── Demo (single seed trainer, so /hub is previewable without Supabase) ──────
function demoOverview(): HubOverview {
  const d = buildSeed();
  const nowISO = new Date().toISOString();
  const clients = d.clients.filter((c) => c.active).length;
  const sessionsLogged = d.sessions.filter((s) => s.status === "completed").length;
  const trainer: HubTrainer = {
    id: d.trainer.id,
    name: d.trainer.display_name,
    email: "demo@fitmonk.ai",
    joinedISO: nowISO,
    lastActiveISO: nowISO,
    active: true,
    clients,
    sessionsLogged,
    sessions30d: sessionsLogged,
  };
  return {
    trainers: [trainer],
    totals: {
      trainers: 1,
      activeTrainers: 1,
      clients,
      sessionsLogged,
      sessions7d: sessionsLogged,
    },
    generatedAtISO: nowISO,
  };
}

export async function getHubOverview(): Promise<HubOverview> {
  return isDemo ? demoOverview() : liveOverview();
}
