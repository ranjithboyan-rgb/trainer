"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Label } from "@/components/ui";
import { T, NUM, fmtSlot, sessionCode } from "@/lib/theme";
import { scheduleSessionAction } from "@/app/actions";
import type { ClientSummary } from "@/lib/types";

export interface MovableClient {
  client: ClientSummary;
  fromSlot: string;
}

export function AddSessionSheet({
  dateISO,
  slot,
  clients,
  movable,
  onClose,
}: {
  dateISO: string;
  slot: string;
  clients: ClientSummary[];
  movable: MovableClient[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const dateLabel = new Date(dateISO + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const pick = (id: string) => {
    if (pending) return;
    setBusyId(id);
    startTransition(async () => {
      await scheduleSessionAction(id, dateISO, slot);
      router.refresh();
      onClose();
    });
  };

  const empty = clients.length === 0 && movable.length === 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgba(10,10,10,0.35)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          padding: "20px 22px calc(30px + env(safe-area-inset-bottom))",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
          maxHeight: "80vh",
          overflowY: "auto",
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Label>Add to {fmtSlot(slot)}</Label>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: T.rule,
              borderRadius: 14,
              width: 28,
              height: 28,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.gray,
            }}
          >
            <X size={15} />
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: T.faint, marginBottom: 14 }}>{dateLabel}</div>

        {empty && (
          <div style={{ fontSize: 14, color: T.faint, textAlign: "center", padding: "18px 0" }}>
            Everyone active is already on this day.
          </div>
        )}

        {movable.length > 0 && (
          <>
            <Label style={{ marginBottom: 4 }}>Move here</Label>
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 6 }}>
              {movable.map((m, i) => (
                <button
                  key={m.client.id}
                  onClick={() => pick(m.client.id)}
                  disabled={pending}
                  style={rowStyle(pending, busyId === m.client.id, i === 0)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: T.ink }}>
                      {m.client.name}
                    </div>
                    <div style={{ fontSize: 12, color: T.warn, marginTop: 3, ...NUM }}>
                      from {fmtSlot(m.fromSlot)}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
                    {busyId === m.client.id ? "Moving…" : "Move"}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {clients.length > 0 && (
          <>
            {movable.length > 0 && <Label style={{ margin: "12px 0 4px" }}>Book a client</Label>}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {clients.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => pick(c.id)}
                  disabled={pending}
                  style={rowStyle(pending, busyId === c.id, i === 0)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: T.ink }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: T.gray, marginTop: 3, ...NUM }}>
                      usual {fmtSlot(c.slot)} · {sessionCode(c.packNumber, c.nextSeq)} of {c.packSize}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
                    {busyId === c.id ? "Adding…" : "Add"}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function rowStyle(pending: boolean, busy: boolean, first: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "13px 2px",
    border: "none",
    borderTop: first ? "none" : `1px solid ${T.rule}`,
    background: "none",
    textAlign: "left",
    cursor: pending ? "default" : "pointer",
    opacity: pending && !busy ? 0.4 : 1,
    width: "100%",
  };
}
