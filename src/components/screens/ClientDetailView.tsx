"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, ChevronDown, ChevronUp, Send, Copy } from "lucide-react";
import { Card, Label, Unit, ProgressBar, PrimaryButton } from "@/components/ui";
import { T, NUM, FONT, fmtDays, fmtSlot, shiftSlot, sessionCode } from "@/lib/theme";
import {
  logSessionAction,
  setSessionDelayAction,
  cancelSessionAction,
} from "@/app/actions";
import { waLink, clientActionUrl } from "@/lib/wa";
import {
  welcomeMessage,
  confirmationMessage,
  reminderMessage,
  renewalMessage,
  runningLateMessage,
  trainerCancelMessage,
} from "@/lib/templates";
import type { ClientDetail, HistoryRow, PastPackView } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function monthsSince(iso: string): string {
  const then = new Date(iso + "T00:00:00");
  const now = new Date();
  const months =
    (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
  if (months < 1) return "this month";
  if (months === 1) return "1 month";
  return `${months} months`;
}

function HistoryLine({ row, first }: { row: HistoryRow; first: boolean }) {
  const done = row.status === "completed";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "12px 0",
        borderTop: first ? "none" : `1px solid ${T.rule}`,
      }}
    >
      <span
        style={{ width: 30, fontSize: 12.5, fontWeight: 800, color: done ? T.ink : T.faint, ...NUM, paddingTop: 1 }}
      >
        {row.seq ?? "—"}
      </span>
      <span
        style={{ width: 54, fontSize: 12.5, color: T.faint, fontWeight: 600, ...NUM, paddingTop: 1 }}
      >
        {monthDay(row.date)}
      </span>
      <span
        style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: done ? T.ink : T.gray, lineHeight: 1.5 }}
      >
        {row.note}
      </span>
      <span style={{ paddingTop: 2, color: done ? T.good : T.bad }}>
        {done ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
      </span>
    </div>
  );
}

function PastPack({ p }: { p: PastPackView }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${T.rule}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          padding: "12px 0",
          border: "none",
          background: "none",
          cursor: "pointer",
          fontFamily: FONT,
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.gray }}>
            Pack {p.number} · {p.range}
          </div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 4 }}>
            {p.done} of {p.size}
          </div>
        </div>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={14} color={T.good} strokeWidth={3} />
          {open ? (
            <ChevronUp size={15} color={T.faint} />
          ) : (
            <ChevronDown size={15} color={T.faint} />
          )}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 10 }}>
          {p.rows.map((r, i) => (
            <HistoryLine key={r.id} row={r} first={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientDetailView({
  client,
  trainerName,
  lateCancelBurns,
  templates,
}: {
  client: ClientDetail;
  trainerName: string;
  lateCancelBurns: boolean;
  templates: Record<string, string>;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<"due" | "note" | "logged">("due");
  const [note, setNote] = useState("");
  const [delay, setDelay] = useState(client.todaySession.delayMinutes);
  const [cancelled, setCancelled] = useState(client.todaySession.status === "cancelled");
  const [pending, startTransition] = useTransition();

  const log = (status: "completed" | "no_show", n: string | null) => {
    startTransition(async () => {
      await logSessionAction(client.id, { status, note: n });
      setStage("logged");
      router.refresh();
    });
  };

  const nudge = (minutes: number) => {
    const next = delay + minutes;
    setDelay(next);
    startTransition(async () => {
      await setSessionDelayAction(client.id, next);
      router.refresh();
    });
  };
  const clearDelay = () => {
    setDelay(0);
    startTransition(async () => {
      await setSessionDelayAction(client.id, 0);
      router.refresh();
    });
  };
  const cancelToday = () => {
    setCancelled(true);
    startTransition(async () => {
      await cancelSessionAction(client.id);
      router.refresh();
    });
  };

  const pct = client.doneInPack / client.packSize;
  const showTodayCard =
    client.todaySession.scheduled &&
    !client.todaySession.logged &&
    stage !== "logged" &&
    !cancelled;
  const shiftedSlot = shiftSlot(client.todaySession.slot, delay);
  const lateHref = waLink(
    client.wa_phone,
    runningLateMessage(templates, {
      clientName: client.name,
      fromSlot: client.todaySession.slot,
      toSlot: shiftedSlot,
      minutes: delay,
    }),
  );
  const cancelHref = waLink(
    client.wa_phone,
    trainerCancelMessage(templates, { clientName: client.name, slot: client.todaySession.slot }),
  );

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <Link
        href="/clients"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: T.ink,
          fontSize: 15,
          fontWeight: 600,
          textDecoration: "none",
          padding: "16px 0 4px",
        }}
      >
        <ArrowLeft size={17} /> Clients
      </Link>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: T.ink,
          letterSpacing: "-0.03em",
          marginTop: 12,
        }}
      >
        {client.name}
      </div>
      <div style={{ fontSize: 13, color: T.gray, margin: "6px 0 18px" }}>
        {fmtDays(client.training_days)} — {fmtSlot(client.slot)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Today's session */}
        {showTodayCard && stage === "due" && (
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 14,
              }}
            >
              <Label>Today · {fmtSlot(shiftedSlot)}</Label>
              <span style={{ fontSize: 12, color: T.warn, fontWeight: 700, ...NUM }}>
                {sessionCode(client.packNumber, client.nextSeq)} of {client.packSize}
              </span>
            </div>

            {delay > 0 && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "11px 13px",
                  borderRadius: 12,
                  background: T.page,
                  border: `1px solid ${T.border}`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: T.warn }}>
                  Running {delay} min late
                </div>
                <div style={{ fontSize: 12.5, color: T.gray, marginTop: 2, ...NUM }}>
                  {fmtSlot(client.todaySession.slot)} → {fmtSlot(shiftedSlot)}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <a
                    href={lateHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: T.ink,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "8px 14px",
                      borderRadius: 10,
                      textDecoration: "none",
                    }}
                  >
                    <Send size={13} /> Send heads-up
                  </a>
                  <button onClick={clearDelay} disabled={pending} style={miniBtn()}>
                    On time
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStage("note")} style={actionBtn(T.ink, "#fff")}>
                ✓ Completed
              </button>
              <button
                disabled={pending}
                onClick={() => log("no_show", null)}
                style={{ ...actionBtn("#fff", T.gray), border: `1px solid ${T.border}` }}
              >
                No-show
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${T.rule}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5, color: T.gray, fontWeight: 600 }}>Running late</span>
                <button onClick={() => nudge(15)} disabled={pending} style={miniBtn()}>
                  +15
                </button>
                <button onClick={() => nudge(30)} disabled={pending} style={miniBtn()}>
                  +30
                </button>
              </div>
              <button onClick={cancelToday} disabled={pending} style={miniBtn(T.bad)}>
                Cancel
              </button>
            </div>
          </Card>
        )}

        {cancelled && (
          <Card style={{ borderColor: T.border }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: T.bad }} />
              <span style={{ fontSize: 14.5, fontWeight: 700, color: T.bad }}>
                Today cancelled
              </span>
            </div>
            <div style={{ fontSize: 13, color: T.gray, marginTop: 6, lineHeight: 1.5 }}>
              It won&apos;t count against {client.name.split(" ")[0]}&apos;s pack.
            </div>
            <a
              href={cancelHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 12,
                padding: "12px 0",
                borderRadius: 12,
                background: T.ink,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Send size={15} /> Send apology to {client.name.split(" ")[0]}
            </a>
          </Card>
        )}

        {showTodayCard && stage === "note" && (
          <Card>
            <Label style={{ marginBottom: 12 }}>What did the session cover? · optional</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='Dictate or type — "Legs. Squats 3×10, leg press, RDL. Went up on squat."'
              style={{
                width: "100%",
                boxSizing: "border-box",
                minHeight: 74,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "11px 13px",
                fontSize: 14.5,
                lineHeight: 1.5,
                fontFamily: FONT,
                resize: "none",
                outline: "none",
              }}
            />
            <PrimaryButton
              disabled={pending}
              onClick={() => log("completed", note.trim() || "Session done")}
              style={{ marginTop: 10 }}
            >
              {pending ? "Saving…" : `Save ${sessionCode(client.packNumber, client.nextSeq)} of ${client.packSize}`}
            </PrimaryButton>
          </Card>
        )}

        {/* Lifetime */}
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 20,
            }}
          >
            <Label>Client since</Label>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: T.gray, ...NUM }}>
              {monthDay(client.client_since)} · {monthsSince(client.client_since)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", ...NUM }}>
            <Stat value={`${client.totalDone}`} label="SESSIONS" />
            <Stat value={`${client.packsCompleted}`} label="PACKS DONE" />
            <Stat
              value={`${client.attendancePct}%`}
              label="ATTENDANCE"
              color={client.attendancePct >= 90 ? T.good : T.ink}
            />
            <Stat value={`${client.cadencePerWeek}`} unit="/wk" label="CADENCE" />
          </div>
        </Card>

        {/* Current pack */}
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 12,
            }}
          >
            <Label>Pack {client.packNumber} · current</Label>
            {client.doneInPack >= client.packSize - 2 && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.warn }}>Ends soon</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: T.ink, lineHeight: 1, ...NUM }}>
              {client.doneInPack}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.gray, marginLeft: 4, ...NUM }}>
              / {client.packSize} sessions
            </span>
          </div>
          <ProgressBar
            pct={pct}
            color={client.doneInPack >= client.packSize - 2 ? T.warn : T.ink}
          />
        </Card>

        {/* Message the client (assisted — opens their WhatsApp) */}
        <ClientMessageCard
          client={client}
          trainerName={trainerName}
          lateCancelBurns={lateCancelBurns}
          templates={templates}
        />

        {/* History grouped by pack */}
        <Card>
          <Label style={{ marginBottom: 10 }}>Pack {client.packNumber} sessions</Label>
          {client.currentPackRows.length === 0 && (
            <div style={{ fontSize: 13.5, color: T.faint, paddingTop: 4 }}>
              No sessions logged yet
            </div>
          )}
          {client.currentPackRows.map((r, i) => (
            <HistoryLine key={r.id} row={r} first={i === 0} />
          ))}

          {client.pastPacks.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Label style={{ margin: "10px 0 2px" }}>Earlier packs</Label>
              {client.pastPacks.map((p) => (
                <PastPack key={p.id} p={p} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SendLink({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const enabled = href.length > 0;
  return (
    <a
      href={enabled ? href : undefined}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "12px 0",
        borderRadius: 12,
        border: primary ? "none" : `1px solid ${T.border}`,
        background: primary ? T.ink : "#fff",
        color: primary ? "#fff" : T.ink,
        fontSize: 14,
        fontWeight: 700,
        textDecoration: "none",
        opacity: enabled ? 1 : 0.5,
        pointerEvents: enabled ? "auto" : "none",
      }}
    >
      {children}
    </a>
  );
}

function ClientMessageCard({
  client,
  trainerName,
  lateCancelBurns,
  templates,
}: {
  client: ClientDetail;
  trainerName: string;
  lateCancelBurns: boolean;
  templates: Record<string, string>;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const link = origin ? clientActionUrl(origin, client.public_token) : "";
  const today = new Date().toISOString().slice(0, 10);

  const welcomeHref = link
    ? waLink(
        client.wa_phone,
        welcomeMessage(templates, {
          trainerName,
          clientName: client.name,
          trainingDays: client.training_days,
          slot: client.slot,
          link,
        }),
      )
    : "";

  const confirmHref =
    link && client.nextDateISO
      ? waLink(
          client.wa_phone,
          confirmationMessage(templates, {
            clientName: client.name,
            dateISO: client.nextDateISO,
            todayISO: today,
            slot: client.slot,
            seq: client.nextSeq,
            packSize: client.packSize,
            lateCancelBurns,
            link,
          }),
        )
      : "";

  const reminderHref =
    link && client.nextDateISO
      ? waLink(
          client.wa_phone,
          reminderMessage(templates, {
            clientName: client.name,
            slot: client.slot,
            seq: client.nextSeq,
            packSize: client.packSize,
            link,
          }),
        )
      : "";

  const renewalHref = waLink(
    client.wa_phone,
    renewalMessage(templates, {
      clientName: client.name,
      left: Math.max(0, client.packSize - client.doneInPack),
    }),
  );

  const copy = () => {
    if (!link) return;
    void navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Card>
      <Label style={{ marginBottom: 12 }}>Message {client.name.split(" ")[0]}</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {client.nextDateISO && (
          <SendLink href={confirmHref} primary>
            <Send size={14} /> Confirmation
          </SendLink>
        )}
        {client.nextDateISO && (
          <SendLink href={reminderHref}>
            <Send size={14} /> Reminder
          </SendLink>
        )}
        <SendLink href={welcomeHref}>
          <Send size={14} /> Welcome
        </SendLink>
        <SendLink href={renewalHref}>
          <Send size={14} /> Renewal
        </SendLink>
      </div>
      <button
        onClick={copy}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          marginTop: 10,
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${T.rule}`,
          background: T.page,
          cursor: "pointer",
          fontFamily: FONT,
          textAlign: "left",
        }}
      >
        <Copy size={13} color={T.gray} />
        <span
          style={{
            flex: 1,
            fontSize: 12,
            color: T.gray,
            ...NUM,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {link || "…"}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: copied ? T.good : T.gray }}>
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
      <div style={{ fontSize: 12, color: T.faint, marginTop: 8, lineHeight: 1.5 }}>
        Opens your WhatsApp with the message ready — you tap send. {client.name.split(" ")[0]}{" "}
        confirms or reschedules on the link.
      </div>
    </Card>
  );
}

function Stat({
  value,
  label,
  unit,
  color = T.ink,
}: {
  value: string;
  label: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>
        {value}
        {unit && <Unit>{unit}</Unit>}
      </div>
      <div
        style={{ fontSize: 11, fontWeight: 600, color: T.gray, letterSpacing: "0.04em", marginTop: 7 }}
      >
        {label}
      </div>
    </div>
  );
}

function miniBtn(color: string = T.ink): React.CSSProperties {
  return {
    border: `1px solid ${T.border}`,
    background: "#fff",
    color,
    fontSize: 12.5,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: FONT,
  };
}

function actionBtn(bg: string, color: string): React.CSSProperties {
  return {
    flex: 1,
    padding: "13px 0",
    borderRadius: 12,
    border: "none",
    background: bg,
    color,
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONT,
  };
}
