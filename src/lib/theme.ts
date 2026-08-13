// LifeOS Design Language (DLS v1) — the visual constitution, shared with FitMonk
// Personal. White ground, black bold numbers, gray support, hairline structure.
// Color appears only when it carries meaning.

export const T = {
  ink: "#0A0A0A",
  gray: "#8A8A8E",
  faint: "#C7C7CC",
  border: "#E8E8EA",
  rule: "#F0F0F2",
  page: "#FAFAFA",
  card: "#FFFFFF",
  good: "#0B8A3E",
  warn: "#C7830A",
  bad: "#C1272D",
} as const;

export const FONT =
  `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`;

// All numerals: tabular figures, tightened tracking.
export const NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.02em",
};

export const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
export const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Default slot grid for a brand-new trainer; each trainer edits their real
// start times in Settings (trainer.slots), and that list is the source of truth
// for the Today ledger, add-client, and reschedule offers.
export const AM_SLOTS = ["06:00", "07:00", "08:00", "09:00", "10:00"];
export const PM_SLOTS = ["17:00", "18:00", "19:00", "20:00", "21:00"];
export const DEFAULT_SLOTS = [...AM_SLOTS, ...PM_SLOTS];

// Split a slot list into morning (before noon) and evening groups, sorted.
export function splitSlots(slots: string[]): { morning: string[]; evening: string[] } {
  const sorted = [...slots].sort();
  return {
    morning: sorted.filter((s) => Number(s.slice(0, 2)) < 12),
    evening: sorted.filter((s) => Number(s.slice(0, 2)) >= 12),
  };
}

// "06:00" + 60 -> "6:00 – 7:00 AM"
export function slotRange(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const endTotal = h * 60 + m + minutes;
  const eh = Math.floor(endTotal / 60) % 24;
  const em = endTotal % 60;
  const end = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  // Share the AM/PM suffix when both ends fall in the same half.
  const sameHalf = h < 12 === eh < 12;
  const startTxt = sameHalf ? fmtSlot(start).replace(/ [AP]M$/, "") : fmtSlot(start);
  return `${startTxt} – ${fmtSlot(end)}`;
}

// Compact range for tight rows (no AM/PM — morning/evening grouping implies it).
export function slotRangeShort(start: string, minutes: number): string {
  return slotRange(start, minutes).replace(/ ?[AP]M/g, "");
}

// "06:00" -> "6:00 AM"
export function fmtSlot(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
}

// "6:00" for compact ledger rows (strips AM/PM)
export function fmtSlotShort(hhmm: string): string {
  return fmtSlot(hhmm).replace(" AM", "").replace(" PM", "");
}

export function fmtDays(days: number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_ABBR[d])
    .join(" · ");
}
