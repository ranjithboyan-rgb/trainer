"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Label } from "@/components/ui";
import { T, NUM } from "@/lib/theme";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Month-grid jump. Dotted days = days with sessions. Today wears a 1.5px ink
// ring; the selected day is filled ink. Tapping a day drives ?date= on /today.
export function CalendarModal({
  selectedISO,
  todayISO,
  activeDates,
  onClose,
}: {
  selectedISO: string;
  todayISO: string;
  activeDates: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const active = new Set(activeDates);
  const sel = new Date(selectedISO + "T00:00:00");
  const [year, setYear] = useState(sel.getFullYear());
  const [month, setMonth] = useState(sel.getMonth()); // 0-based

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const step = (delta: number) => {
    const m = month + delta;
    if (m < 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else if (m > 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth(m);
    }
  };

  const pick = (d: number) => {
    const iso = isoOf(year, month, d);
    router.push(iso === todayISO ? "/today" : `/today?date=${iso}`);
    onClose();
  };

  const IconBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        background: "#fff",
        color: T.ink,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(10,10,10,0.35)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 18,
          width: "100%",
          maxWidth: 360,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <Label>Jump to date</Label>
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <IconBtn onClick={() => step(-1)}>
            <ChevronLeft size={16} />
          </IconBtn>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, ...NUM }}>
            {MONTHS[month]} {year}
          </div>
          <IconBtn onClick={() => step(1)}>
            <ChevronRight size={16} />
          </IconBtn>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 2,
            marginBottom: 4,
          }}
        >
          {DOW.map((d, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: T.faint,
                padding: "2px 0",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const iso = isoOf(year, month, d);
            const isToday = iso === todayISO;
            const isSelected = iso === selectedISO;
            const hasSession = active.has(iso);
            return (
              <button
                key={iso}
                onClick={() => pick(d)}
                style={{
                  aspectRatio: "1 / 1",
                  border: isToday && !isSelected ? `1.5px solid ${T.ink}` : "1.5px solid transparent",
                  borderRadius: 10,
                  background: isSelected ? T.ink : "transparent",
                  color: isSelected ? "#fff" : T.ink,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  fontSize: 14,
                  fontWeight: isSelected ? 800 : 500,
                  ...NUM,
                  padding: 0,
                }}
              >
                {d}
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    background: hasSession ? (isSelected ? "#fff" : T.ink) : "transparent",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
