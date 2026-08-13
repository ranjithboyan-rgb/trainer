"use client";

import { useState, useTransition } from "react";
import { Card, Dot, Label, PageHeader, Toggle } from "@/components/ui";
import { T, NUM, fmtSlot } from "@/lib/theme";
import { updateTrainerAction, signOutAction } from "@/app/actions";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import type { Trainer } from "@/lib/types";

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
  const [, startTransition] = useTransition();

  const persist = (patch: Partial<Trainer>) =>
    startTransition(() => {
      void updateTrainerAction(patch);
    });

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
