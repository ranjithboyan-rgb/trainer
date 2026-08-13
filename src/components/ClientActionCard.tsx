"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { T, NUM, FONT, fmtSlot } from "@/lib/theme";
import {
  submitClientAction,
  fetchRescheduleOptions,
  submitReschedule,
} from "@/app/c/[token]/actions";
import type { DayOptions, PublicClientView } from "@/lib/types";

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function whenLabel(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  const rel = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : DOW[d.getDay()];
  return `${rel}, ${MON[d.getMonth()]} ${d.getDate()}`;
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "13px 0",
        borderBottom: last ? "none" : `1px solid ${T.rule}`,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: T.gray }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, textAlign: "right", ...NUM }}>
        {value}
      </span>
    </div>
  );
}

type Terminal = "cancelled" | "moved" | "requested" | null;

export function ClientActionCard({
  token,
  initial,
}: {
  token: string;
  initial: PublicClientView;
}) {
  const [view, setView] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<Terminal>(null);
  const [mode, setMode] = useState<"main" | "picker">("main");
  const [options, setOptions] = useState<DayOptions[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [busyCancel, setBusyCancel] = useState(false);

  // Confirmation by default: opening the link confirms the client, no tap.
  // (Runs client-side, so WhatsApp link-preview bots don't trigger it.)
  const confirmedOnce = useRef(false);
  useEffect(() => {
    if (confirmedOnce.current) return;
    if (!initial.next || initial.state !== "open") return;
    confirmedOnce.current = true;
    startTransition(async () => {
      const result = await submitClientAction(token, "confirm");
      if (result.view) setView(result.view);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const first = view.clientName.split(" ")[0];

  const terminal: Terminal =
    done ??
    (view.state === "cancelled"
      ? "cancelled"
      : view.state === "reschedule_requested"
        ? "requested"
        : null);

  const cancel = () => {
    if (pending) return;
    setBusyCancel(true);
    startTransition(async () => {
      const result = await submitClientAction(token, "cancel");
      if (result.view) setView(result.view);
      setMessage(result.message ?? null);
      setDone("cancelled");
      setBusyCancel(false);
      setMode("main");
    });
  };

  const askTrainer = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await submitClientAction(token, "reschedule");
      if (result.view) setView(result.view);
      setMessage(result.message ?? null);
      setDone("requested");
      setMode("main");
    });
  };

  const openPicker = () => {
    setMode("picker");
    setOptions(null);
    startTransition(async () => {
      const opts = await fetchRescheduleOptions(token);
      setOptions(opts);
      setSelectedDate(opts.find((d) => d.slots.length > 0)?.dateISO ?? null);
    });
  };

  const pick = (dateISO: string, slot: string) => {
    if (pending) return;
    setBusySlot(`${dateISO}${slot}`);
    startTransition(async () => {
      const result = await submitReschedule(token, dateISO, slot);
      if (result.view) setView(result.view);
      setMessage(result.message ?? null);
      setDone("moved");
      setBusySlot(null);
      setMode("main");
    });
  };

  const showInfo = terminal !== "cancelled";
  const showPolicy =
    !terminal &&
    mode === "main" &&
    view.next &&
    view.lateCancelBurns &&
    view.withinLateWindow;

  const banner = (() => {
    if (mode === "picker") return null;
    if (terminal === "cancelled") return { c: T.bad, text: "Cancelled" };
    if (terminal === "requested") return { c: T.warn, text: "Reschedule requested" };
    if (view.next) return { c: T.good, text: "You're confirmed" };
    return null;
  })();

  const daysWithSlots = (options ?? []).filter((d) => d.slots.length > 0);
  const selectedSlots = daysWithSlots.find((d) => d.dateISO === selectedDate)?.slots ?? [];

  return (
    <div className="app-shell" style={{ justifyContent: "center", padding: "0 20px", gap: 0 }}>
      <div style={{ margin: "auto 0", width: "100%" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.14em",
            color: T.faint,
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          FitMonk
        </div>

        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: "22px 20px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.gray,
            }}
          >
            With {view.trainerName}
          </div>
          <div
            style={{ fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", marginTop: 4 }}
          >
            {first}
          </div>

          {showInfo && (
            <div style={{ marginTop: 14 }}>
              <InfoRow label="This pack" value={`${view.packDone} of ${view.packSize} done`} />
              {view.next ? (
                <InfoRow
                  label="Next session"
                  value={`${whenLabel(view.next.dateISO)} · ${fmtSlot(view.next.slot)}`}
                  last
                />
              ) : (
                <InfoRow label="Next session" value="None scheduled" last />
              )}
            </div>
          )}

          {banner && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 16,
                padding: "11px 13px",
                borderRadius: 12,
                background: T.page,
                border: `1px solid ${T.border}`,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 4, background: banner.c }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: banner.c }}>{banner.text}</span>
            </div>
          )}

          {message && (
            <div style={{ fontSize: 13.5, color: T.gray, lineHeight: 1.5, marginTop: 14 }}>
              {message}
            </div>
          )}

          {showPolicy && (
            <div style={{ fontSize: 12.5, color: T.warn, lineHeight: 1.5, marginTop: 14 }}>
              This session is under 12 hours away — cancelling now counts as session {view.nextSeq}{" "}
              of {view.packSize}.
            </div>
          )}

          {/* ── Action area ─────────────────────────────────────────────── */}
          {terminal ? (
            <div style={{ fontSize: 13, color: T.faint, lineHeight: 1.5, marginTop: 16 }}>
              You can close this window.
            </div>
          ) : !view.next ? (
            <div style={{ fontSize: 13.5, color: T.gray, lineHeight: 1.5, marginTop: 16 }}>
              No upcoming session right now — {view.trainerName} will be in touch.
            </div>
          ) : mode === "main" ? (
            <>
              <div
                style={{ fontSize: 12.5, color: T.gray, marginTop: 18, marginBottom: 10 }}
              >
                Need to make a change?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <OutlineButton label="Reschedule" disabled={pending} onClick={openPicker} />
                <OutlineButton
                  label="Cancel session"
                  danger
                  busy={busyCancel}
                  disabled={pending}
                  onClick={cancel}
                />
              </div>
            </>
          ) : (
            /* picker */
            <div style={{ marginTop: 18 }}>
              <button onClick={() => setMode("main")} style={backBtnStyle}>
                <ArrowLeft size={15} /> Back
              </button>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, margin: "12px 0 10px" }}>
                Pick a new time
              </div>

              {options === null ? (
                <div style={{ fontSize: 13, color: T.faint, padding: "6px 0" }}>
                  Finding open times…
                </div>
              ) : daysWithSlots.length === 0 ? (
                <div style={{ fontSize: 13, color: T.gray, lineHeight: 1.5 }}>
                  No open times before your next session.
                </div>
              ) : (
                <>
                  {/* date selector */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      overflowX: "auto",
                      paddingBottom: 4,
                      margin: "0 -20px 14px",
                      paddingLeft: 20,
                      paddingRight: 20,
                    }}
                  >
                    {daysWithSlots.map((d) => {
                      const dt = new Date(d.dateISO + "T00:00:00");
                      const on = d.dateISO === selectedDate;
                      return (
                        <button
                          key={d.dateISO}
                          onClick={() => setSelectedDate(d.dateISO)}
                          style={{
                            flex: "0 0 auto",
                            minWidth: 52,
                            padding: "8px 0",
                            borderRadius: 12,
                            border: `1px solid ${on ? T.ink : T.border}`,
                            background: on ? T.ink : "#fff",
                            color: on ? "#fff" : T.gray,
                            cursor: "pointer",
                            fontFamily: FONT,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{DOW3[dt.getDay()]}</span>
                          <span style={{ fontSize: 16, fontWeight: 800, ...NUM }}>{dt.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* slots for the selected day */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedSlots.map((slot) => {
                      const key = `${selectedDate}${slot}`;
                      return (
                        <button
                          key={slot}
                          onClick={() => selectedDate && pick(selectedDate, slot)}
                          disabled={pending}
                          style={{
                            flex: "1 0 28%",
                            padding: "12px 0",
                            borderRadius: 12,
                            border: `1px solid ${T.border}`,
                            background: "#fff",
                            color: T.ink,
                            fontSize: 13.5,
                            fontWeight: 700,
                            cursor: pending ? "default" : "pointer",
                            fontFamily: FONT,
                            ...NUM,
                          }}
                        >
                          {busySlot === key ? "…" : fmtSlot(slot)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <button onClick={askTrainer} disabled={pending} style={askTrainerStyle}>
                None of these work — ask {view.trainerName}
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 11.5,
            color: T.faint,
            textAlign: "center",
            marginTop: 16,
            lineHeight: 1.5,
          }}
        >
          You don&apos;t need an app — just this page.
        </div>
      </div>
    </div>
  );
}

function OutlineButton({
  label,
  onClick,
  danger,
  busy,
  disabled,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: "13px 0",
        borderRadius: 12,
        border: `1px solid ${T.border}`,
        background: "#fff",
        color: danger ? T.bad : T.ink,
        fontSize: 14.5,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && !busy ? 0.55 : 1,
        fontFamily: FONT,
      }}
    >
      {busy ? "…" : label}
    </button>
  );
}

const backBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: "none",
  background: "none",
  color: T.gray,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  fontFamily: FONT,
};

const askTrainerStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
  padding: "12px 0",
  borderRadius: 12,
  border: "none",
  background: "none",
  color: T.gray,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONT,
};
