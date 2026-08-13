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

// Slot grid — source of truth for the reschedule offers later (M3).
export const AM_SLOTS = ["06:00", "07:00", "08:00", "09:00", "10:00"];
export const PM_SLOTS = ["17:00", "18:00", "19:00", "20:00", "21:00"];

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
