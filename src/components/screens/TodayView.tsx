"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, CalendarDays, ArrowRight } from "lucide-react";
import { Card, Dot, Label } from "@/components/ui";
import { DateStrip } from "@/components/DateStrip";
import { CalendarModal } from "@/components/CalendarModal";
import { T, NUM, slotRangeShort, shiftSlot } from "@/lib/theme";
import type { SessionStatus, TodayLedger, TodaySlotEntry } from "@/lib/types";

type Relation = "past" | "today" | "future";

function statusMeta(status: SessionStatus | null, rel: Relation): [string, string] | null {
  switch (status) {
    case "confirmed":
      return [T.good, "Confirmed"];
    case "completed":
      return [T.good, "Done"];
    case "cancelled":
      return [T.bad, "Cancelled"];
    case "late_cancelled":
      return [T.bad, "Late cancel"];
    case "no_show":
      return [T.bad, "No-show"];
    case "rescheduled":
      return [T.warn, "Rescheduled"];
    case "scheduled":
    default:
      // No explicit action recorded — meaning depends on when we're looking.
      if (rel === "today") return [T.warn, "Awaiting reply"];
      if (rel === "future") return [T.faint, "Scheduled"];
      return [T.faint, "No record"];
  }
}

function Row({
  entry,
  first,
  rel,
  sessionMinutes,
}: {
  entry: TodaySlotEntry;
  first: boolean;
  rel: Relation;
  sessionMinutes: number;
}) {
  const c = entry.client;
  const meta = c
    ? entry.rescheduleRequested
      ? ([T.warn, "Reschedule?"] as [string, string])
      : statusMeta(entry.status, rel)
    : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "13px 0",
        borderTop: first ? "none" : `1px solid ${T.rule}`,
      }}
    >
      <span
        style={{
          width: 88,
          fontSize: 12.5,
          fontWeight: 700,
          color: entry.delayMinutes > 0 ? T.warn : c ? T.ink : T.faint,
          ...NUM,
        }}
      >
        {slotRangeShort(shiftSlot(entry.slot, entry.delayMinutes), sessionMinutes)}
      </span>
      {c ? (
        <>
          <Link href={`/clients/${c.id}`} style={{ textDecoration: "none", flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{c.name}</div>
            <div
              style={{
                fontSize: 11.5,
                color: c.doneInPack >= c.packSize - 1 ? T.warn : T.faint,
                fontWeight: 600,
                marginTop: 3,
                ...NUM,
              }}
            >
              Session {entry.seq ?? c.nextSeq} of {c.packSize}
              {entry.delayMinutes > 0 && (
                <span style={{ color: T.warn }}> · {entry.delayMinutes} late</span>
              )}
            </div>
          </Link>
          {meta && (
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: meta[0],
              }}
            >
              <Dot c={meta[0]} />
              {meta[1]}
            </span>
          )}
        </>
      ) : (
        <span style={{ fontSize: 13.5, color: T.faint, fontWeight: 500 }}>Open slot</span>
      )}
    </div>
  );
}

function relativeTitle(selectedISO: string, todayISO: string): string {
  const sel = new Date(selectedISO + "T00:00:00");
  const base = new Date(todayISO + "T00:00:00");
  const diff = Math.round((sel.getTime() - base.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return sel.toLocaleDateString("en-US", { weekday: "long" });
}

export function TodayView({
  ledger,
  confirmTime,
  selectedISO,
  todayISO,
  activeDates,
  sessionMinutes,
}: {
  ledger: TodayLedger;
  confirmTime: string;
  selectedISO: string;
  todayISO: string;
  activeDates: string[];
  sessionMinutes: number;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isToday = selectedISO === todayISO;
  const rel: Relation = isToday ? "today" : selectedISO < todayISO ? "past" : "future";
  const d = new Date(selectedISO + "T00:00:00");
  const dateline = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ padding: "16px 0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => setCalendarOpen(true)}
            style={{
              border: "none",
              background: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Label>{dateline}</Label>
            <CalendarDays size={12} color={T.gray} />
          </button>
          {!isToday && (
            <Link
              href="/today"
              style={{ fontSize: 13, fontWeight: 600, color: T.gray, textDecoration: "none" }}
            >
              Today →
            </Link>
          )}
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
          {relativeTitle(selectedISO, todayISO)}
        </div>
      </div>

      <DateStrip selectedISO={selectedISO} todayISO={todayISO} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
        {ledger.morning.length > 0 && (
          <Card>
            <Label style={{ marginBottom: 4 }}>Morning slots</Label>
            {ledger.morning.map((e, i) => (
              <Row key={e.slot} entry={e} first={i === 0} rel={rel} sessionMinutes={sessionMinutes} />
            ))}
          </Card>
        )}
        {ledger.evening.length > 0 && (
          <Card>
            <Label style={{ marginBottom: 4 }}>Evening slots</Label>
            {ledger.evening.map((e, i) => (
              <Row key={e.slot} entry={e} first={i === 0} rel={rel} sessionMinutes={sessionMinutes} />
            ))}
          </Card>
        )}
        {isToday && (
          <Link href="/today/confirmations" style={{ textDecoration: "none" }}>
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MessageCircle size={18} color={T.gray} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>
                    Send tomorrow&apos;s confirmations
                  </div>
                  <div style={{ fontSize: 12.5, color: T.gray, marginTop: 4 }}>
                    One tap each — opens WhatsApp with the message ready
                  </div>
                </div>
                <ArrowRight size={16} color={T.faint} />
              </div>
            </Card>
          </Link>
        )}
      </div>

      {calendarOpen && (
        <CalendarModal
          selectedISO={selectedISO}
          todayISO={todayISO}
          activeDates={activeDates}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </div>
  );
}
