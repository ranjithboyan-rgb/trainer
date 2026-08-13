"use client";

import { useState, useTransition } from "react";
import { X, Plus } from "lucide-react";
import { Card, Dot, Label, PageHeader, Toggle } from "@/components/ui";
import { T, NUM, FONT, fmtSlot, slotRange } from "@/lib/theme";
import { updateTrainerAction, signOutAction } from "@/app/actions";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import type { Trainer } from "@/lib/types";

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        border: `1px solid ${T.border}`,
        background: "#fff",
        color: T.ink,
        fontSize: 17,
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  sub,
  right,
  last,
}: {
  label: React.ReactNode;
  sub?: string;
  right?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "15px 0",
        borderBottom: last ? "none" : `1px solid ${T.rule}`,
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: T.faint, marginTop: 4 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function SettingsView({
  trainer,
  accountEmail,
  demo,
}: {
  trainer: Trainer;
  accountEmail: string | null;
  demo: boolean;
}) {
  const [remind, setRemind] = useState(trainer.reminder_1h);
  const [feedback, setFeedback] = useState(trainer.post_session_feedback);
  const [lateCancel, setLateCancel] = useState(trainer.late_cancel_burns);
  const [editing, setEditing] = useState(false);
  const [slots, setSlots] = useState<string[]>([...trainer.slots].sort());
  const [sessionMins, setSessionMins] = useState(trainer.session_minutes);
  const [newSlot, setNewSlot] = useState("");
  const [, startTransition] = useTransition();

  const persist = (patch: Partial<Trainer>) =>
    startTransition(() => {
      void updateTrainerAction(patch);
    });

  const setLength = (mins: number) => {
    const clamped = Math.min(180, Math.max(15, mins));
    setSessionMins(clamped);
    persist({ session_minutes: clamped });
  };
  const addSlot = () => {
    if (!/^\d{2}:\d{2}$/.test(newSlot) || slots.includes(newSlot)) return;
    const next = [...slots, newSlot].sort();
    setSlots(next);
    setNewSlot("");
    persist({ slots: next });
  };
  const removeSlot = (s: string) => {
    const next = slots.filter((x) => x !== s);
    setSlots(next);
    persist({ slots: next });
  };

  const initials = trainer.display_name.slice(0, 1).toUpperCase();

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <PageHeader eyebrow="FitMonk Trainer" title="Settings" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Label>Profile</Label>
            <button
              onClick={() => setEditing(true)}
              style={{
                border: "none",
                background: "none",
                color: T.gray,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Edit →
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: T.ink,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                fontWeight: 800,
              }}
            >
              {initials}
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>
                {trainer.display_name}
              </div>
              {trainer.gym && (
                <div style={{ fontSize: 12.5, color: T.gray, marginTop: 3 }}>{trainer.gym}</div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <Label style={{ marginBottom: 8 }}>Account</Label>
          <Row
            label={demo ? "Demo mode" : "Signed in with Google"}
            sub={demo ? "Sign-in activates once Supabase is connected" : (accountEmail ?? undefined)}
          />
          <Row
            label={
              <button
                onClick={() => startTransition(() => void signOutAction())}
                style={{
                  border: "none",
                  background: "none",
                  color: T.bad,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {demo ? "View sign-in screen" : "Sign out"}
              </button>
            }
            last
          />
        </Card>

        <Card>
          <Label style={{ marginBottom: 8 }}>Sessions</Label>
          <Row
            label="Sessions per pack"
            right={
              <span style={{ fontSize: 15, fontWeight: 800, color: T.ink, ...NUM }}>
                {trainer.sessions_per_pack}
              </span>
            }
          />
          <Row
            label="Late cancel counts as session"
            sub="Under 12 hours burns one session — stated in every confirmation"
            last
            right={
              <Toggle
                on={lateCancel}
                onChange={() => {
                  setLateCancel((v) => !v);
                  persist({ late_cancel_burns: !lateCancel });
                }}
              />
            }
          />
        </Card>

        {/* Your slots — the source of truth for Today, add-client, reschedule */}
        <Card>
          <Label style={{ marginBottom: 8 }}>Your slots</Label>
          <Row
            label="Session length"
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <StepBtn onClick={() => setLength(sessionMins - 15)}>−</StepBtn>
                <span
                  style={{ fontSize: 15, fontWeight: 800, color: T.ink, minWidth: 58, textAlign: "center", ...NUM }}
                >
                  {sessionMins} min
                </span>
                <StepBtn onClick={() => setLength(sessionMins + 15)}>+</StepBtn>
              </div>
            }
          />
          {slots.length === 0 && (
            <div style={{ fontSize: 13.5, color: T.faint, padding: "12px 0 4px" }}>
              No slots yet — add your start times below.
            </div>
          )}
          {slots.map((s, i) => (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderTop: i === 0 ? `1px solid ${T.rule}` : `1px solid ${T.rule}`,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, ...NUM }}>
                {slotRange(s, sessionMins)}
              </span>
              <button
                onClick={() => removeSlot(s)}
                aria-label={`Remove ${s}`}
                style={{
                  border: "none",
                  background: T.rule,
                  borderRadius: 13,
                  width: 26,
                  height: 26,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.gray,
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              type="time"
              value={newSlot}
              onChange={(e) => setNewSlot(e.target.value)}
              style={{
                flex: 1,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "11px 13px",
                fontSize: 15,
                fontFamily: FONT,
                outline: "none",
                ...NUM,
              }}
            />
            <button
              onClick={addSlot}
              disabled={!/^\d{2}:\d{2}$/.test(newSlot) || slots.includes(newSlot)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "0 16px",
                borderRadius: 12,
                border: "none",
                background: /^\d{2}:\d{2}$/.test(newSlot) && !slots.includes(newSlot) ? T.ink : T.rule,
                color: /^\d{2}:\d{2}$/.test(newSlot) && !slots.includes(newSlot) ? "#fff" : T.faint,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              <Plus size={15} /> Add
            </button>
          </div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 8, lineHeight: 1.5 }}>
            List only the times you actually start — a break is just a gap.
          </div>
        </Card>

        <Card>
          <Label style={{ marginBottom: 8 }}>WhatsApp automation</Label>
          <Row
            label="Business number"
            sub={trainer.wa_connected ? "Connected" : "Not connected yet"}
            right={<Dot c={trainer.wa_connected ? T.good : T.faint} />}
          />
          <Row
            label="Evening confirmations"
            sub="Sent to tomorrow's clients"
            right={
              <span style={{ fontSize: 13, color: T.faint, fontWeight: 600, ...NUM }}>
                {fmtSlot(trainer.confirm_send_time.slice(0, 5))}
              </span>
            }
          />
          <Row
            label="1-hour reminder"
            right={
              <Toggle
                on={remind}
                onChange={() => {
                  setRemind((v) => !v);
                  persist({ reminder_1h: !remind });
                }}
              />
            }
          />
          <Row
            label="Post-session feedback"
            sub="👍/👎 + next class reminder"
            last
            right={
              <Toggle
                on={feedback}
                onChange={() => {
                  setFeedback((v) => !v);
                  persist({ post_session_feedback: !feedback });
                }}
              />
            }
          />
        </Card>

        <div
          style={{
            fontSize: 12,
            color: T.faint,
            textAlign: "center",
            lineHeight: 1.6,
            padding: "8px 0",
          }}
        >
          FitMonk Trainer v1 · Your clients never install anything.
        </div>
      </div>

      {editing && <EditProfileSheet trainer={trainer} onClose={() => setEditing(false)} />}
    </div>
  );
}
