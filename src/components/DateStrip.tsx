"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { T, NUM } from "@/lib/theme";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function shift(iso: string, days: number): string {
  // UTC calendar arithmetic — avoids the local-parse/UTC-serialize day drift.
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// A chromeless 7-cell-wide horizontal strip the trainer can scroll through.
// Selected day: ink, bold, underlined. Today (when not selected): a faint ink
// ring so "now" stays findable. Tapping a day drives ?date= on /today.
export function DateStrip({
  selectedISO,
  todayISO,
}: {
  selectedISO: string;
  todayISO: string;
}) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Window centered on the selected day, so a far calendar jump still lands the
  // selected date in the middle of the strip (today keeps its ring when in view).
  const days: string[] = [];
  for (let i = -35; i <= 21; i++) days.push(shift(selectedISO, i));

  useEffect(() => {
    const el = selectedRef.current;
    const scroller = scrollerRef.current;
    if (el && scroller) {
      const left = el.offsetLeft - scroller.clientWidth / 2 + el.clientWidth / 2;
      scroller.scrollTo({ left, behavior: "auto" });
    }
  }, [selectedISO]);

  const go = (iso: string) => {
    router.push(iso === todayISO ? "/today" : `/today?date=${iso}`);
  };

  return (
    <div
      ref={scrollerRef}
      style={{
        display: "flex",
        gap: 2,
        overflowX: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        padding: "2px 0 8px",
        margin: "0 -20px",
        paddingLeft: 20,
        paddingRight: 20,
      }}
    >
      {days.map((iso) => {
        const d = new Date(iso + "T00:00:00");
        const selected = iso === selectedISO;
        const isToday = iso === todayISO;
        return (
          <button
            key={iso}
            ref={selected ? selectedRef : undefined}
            onClick={() => go(iso)}
            style={{
              flex: "0 0 auto",
              width: 44,
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "4px 0 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: selected ? T.ink : T.faint,
                letterSpacing: "0.02em",
              }}
            >
              {DOW[d.getDay()]}
            </span>
            <span
              style={{
                fontSize: 17,
                fontWeight: selected ? 800 : 500,
                color: selected ? T.ink : T.gray,
                ...NUM,
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 15,
                border: isToday && !selected ? `1.5px solid ${T.ink}` : "1.5px solid transparent",
              }}
            >
              {d.getDate()}
            </span>
            <span
              style={{
                width: 22,
                height: 2.5,
                borderRadius: 2,
                background: selected ? T.ink : "transparent",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
