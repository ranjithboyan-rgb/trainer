import Link from "next/link";
import { Card, Label, Dot } from "@/components/ui";
import { T, NUM } from "@/lib/theme";
import type { HubOverview, HubTrainer } from "@/lib/hub";

function relTime(iso: string | null, nowISO: string): string {
  if (!iso) return "never";
  const mins = Math.round((new Date(nowISO).getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function joinedLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.ink, ...NUM }}>{value}</div>
      <Label style={{ marginTop: 4 }}>{label}</Label>
    </div>
  );
}

function MiniStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <span style={{ fontSize: 15, fontWeight: 800, color: T.ink, ...NUM }}>{value}</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: T.gray, marginLeft: 5 }}>{label}</span>
    </div>
  );
}

function TrainerCard({ t, nowISO }: { t: HubTrainer; nowISO: string }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: T.ink }}>{t.name}</div>
          <div
            style={{
              fontSize: 12.5,
              color: T.gray,
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t.email ?? "no email on file"}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: t.active ? T.good : T.faint,
            flexShrink: 0,
          }}
        >
          <Dot c={t.active ? T.good : T.faint} />
          {t.active ? "Active" : "Idle"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 18,
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${T.rule}`,
        }}
      >
        <MiniStat value={t.clients} label="clients" />
        <MiniStat value={t.sessionsLogged} label="sessions" />
        <MiniStat value={t.sessions30d} label="30d" />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
          fontSize: 12,
          color: T.faint,
          fontWeight: 500,
        }}
      >
        <span>Joined {joinedLabel(t.joinedISO)}</span>
        <span>Seen {relTime(t.lastActiveISO, nowISO)}</span>
      </div>
    </Card>
  );
}

export function HubView({ overview, isDemo }: { overview: HubOverview; isDemo: boolean }) {
  const { totals, trainers, generatedAtISO } = overview;
  return (
    <div className="app-shell">
      {isDemo && (
        <div
          style={{
            background: T.ink,
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            textAlign: "center",
            padding: "5px 12px",
            letterSpacing: "0.02em",
          }}
        >
          Demo mode — showing seed data. Live hub reads every trainer.
        </div>
      )}
      <main style={{ flex: 1, overflowY: "auto", padding: "0 20px 32px" }}>
        <div style={{ padding: "16px 0 14px" }}>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <Label>FitMonk Trainer</Label>
            <Link
              href="/today"
              style={{ fontSize: 13, fontWeight: 600, color: T.gray, textDecoration: "none" }}
            >
              App →
            </Link>
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: T.ink,
              letterSpacing: "-0.03em",
              marginTop: 4,
            }}
          >
            Hub
          </div>
        </div>

        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 18 }}>
            <Stat value={totals.trainers} label="Trainers" />
            <Stat value={totals.activeTrainers} label="Active · 7d" />
            <Stat value={totals.clients} label="Clients" />
            <Stat value={totals.sessionsLogged} label="Sessions" />
          </div>
        </Card>

        <Label style={{ margin: "18px 0 10px" }}>
          Trainers · {totals.sessions7d} session{totals.sessions7d === 1 ? "" : "s"} logged this
          week
        </Label>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {trainers.length === 0 && (
            <Card>
              <div
                style={{ fontSize: 14, color: T.faint, textAlign: "center", padding: "8px 0" }}
              >
                No trainers yet.
              </div>
            </Card>
          )}
          {trainers.map((t) => (
            <TrainerCard key={t.id} t={t} nowISO={generatedAtISO} />
          ))}
        </div>
      </main>
    </div>
  );
}
