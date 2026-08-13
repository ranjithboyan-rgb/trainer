// Every client-facing message the trainer sends. Each has a built-in default
// that the trainer can override in Settings. Messages are plain text with
// {tokens} that fill in per client/session; some tokens ({ending}, {policy})
// resolve to a computed string or nothing.

import { fmtSlot, fmtDays, DAY_ABBR } from "./theme";

export type TemplateKey = "welcome" | "confirmation" | "runningLate" | "cancel";
export type TemplateMap = Record<string, string>;

// "today" / "tomorrow" / "Wed" — lowercase for mid-sentence use.
export function relativeDay(dateISO: string, todayISO: string): string {
  const diff = Math.round(
    (new Date(dateISO + "T00:00:00").getTime() - new Date(todayISO + "T00:00:00").getTime()) /
      86_400_000,
  );
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return DAY_ABBR[new Date(dateISO + "T00:00:00").getDay()];
}

function packEndNote(seq: number, size: number): string {
  if (seq === 1) return `New pack — session 1 of ${size}.`;
  if (seq === size) return `Final session of this pack.`;
  if (seq === size - 1) return `Two sessions left in this pack.`;
  return "";
}

// ── The default copy ────────────────────────────────────────────────────────
export const DEFAULT_TEMPLATE: Record<TemplateKey, string> = {
  welcome:
    "Hi {name}! {trainer} runs your training sessions here now. Your schedule: {days} at {time}. You'll get a note the evening before each session — confirm or make changes here: {link}",
  confirmation:
    "Hi {name}! {when}, {time} — session {seq} of {size}. {ending} {policy} Confirm or make changes: {link}",
  runningLate:
    "Hi {name}! Running about {minutes} min late today — let's do {newtime} instead of {time}. See you then 💪",
  cancel:
    "Hi {name}, I'm sorry — I have to cancel today's {time} session. I'll message you to find another time. It won't count against your pack.",
};

// ── Substitution ────────────────────────────────────────────────────────────
export function render(tpl: string, v: Record<string, string>): string {
  return tpl
    .replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.!?,])/g, "$1")
    .trim();
}

function pick(templates: TemplateMap | undefined, key: TemplateKey): string {
  const custom = templates?.[key];
  return custom && custom.trim() ? custom : DEFAULT_TEMPLATE[key];
}

// ── Editor registry (for the Settings template editor) ──────────────────────
export interface TemplateDef {
  key: TemplateKey;
  label: string;
  hint: string;
  vars: { token: string; label: string }[];
  sample: Record<string, string>;
}

const LINK_SAMPLE = "fitmonk.ai/c/ab12cd";

export const TEMPLATES: TemplateDef[] = [
  {
    key: "welcome",
    label: "Welcome",
    hint: "Sent when you add a client.",
    vars: [
      { token: "{name}", label: "Client's first name" },
      { token: "{trainer}", label: "Your name" },
      { token: "{days}", label: "Training days" },
      { token: "{time}", label: "Session time" },
      { token: "{link}", label: "Their action link" },
    ],
    sample: { name: "Ravi", trainer: "Vinod", days: "Mon · Wed · Fri", time: "6:00 AM", link: LINK_SAMPLE },
  },
  {
    key: "confirmation",
    label: "Session confirmation",
    hint: "The evening-before / same-day confirmation.",
    vars: [
      { token: "{name}", label: "Client's first name" },
      { token: "{when}", label: "Today / Tomorrow / weekday" },
      { token: "{time}", label: "Session time" },
      { token: "{seq}", label: "Session number" },
      { token: "{size}", label: "Sessions in the pack" },
      { token: "{ending}", label: "Pack-ending note (auto)" },
      { token: "{policy}", label: "Late-cancel policy (auto)" },
      { token: "{link}", label: "Their action link" },
    ],
    sample: {
      name: "Ravi", when: "Tomorrow", time: "6:00 AM", seq: "9", size: "12",
      ending: "Two sessions left in this pack.",
      policy: "Cancelling under 12 hours counts as a session.",
      link: LINK_SAMPLE,
    },
  },
  {
    key: "runningLate",
    label: "Running late",
    hint: "The heads-up when you tap +15 / +30.",
    vars: [
      { token: "{name}", label: "Client's first name" },
      { token: "{minutes}", label: "How many minutes late" },
      { token: "{time}", label: "Original time" },
      { token: "{newtime}", label: "New time" },
    ],
    sample: { name: "Ravi", minutes: "15", time: "6:00 AM", newtime: "6:15 AM" },
  },
  {
    key: "cancel",
    label: "Cancel session",
    hint: "The apology when you cancel a session.",
    vars: [
      { token: "{name}", label: "Client's first name" },
      { token: "{time}", label: "Session time" },
    ],
    sample: { name: "Ravi", time: "6:00 AM" },
  },
];

// ── Builders (custom-or-default, then substitute) ───────────────────────────
export function welcomeMessage(
  templates: TemplateMap | undefined,
  args: { trainerName: string; clientName: string; trainingDays: number[]; slot: string; link: string },
): string {
  return render(pick(templates, "welcome"), {
    name: args.clientName.split(" ")[0],
    trainer: args.trainerName,
    days: fmtDays(args.trainingDays),
    time: fmtSlot(args.slot),
    link: args.link,
  });
}

export function confirmationMessage(
  templates: TemplateMap | undefined,
  args: {
    clientName: string;
    dateISO: string;
    todayISO: string;
    slot: string;
    seq: number;
    packSize: number;
    lateCancelBurns: boolean;
    link: string;
  },
): string {
  const when = relativeDay(args.dateISO, args.todayISO);
  return render(pick(templates, "confirmation"), {
    name: args.clientName.split(" ")[0],
    when: when.charAt(0).toUpperCase() + when.slice(1),
    time: fmtSlot(args.slot),
    seq: String(args.seq),
    size: String(args.packSize),
    ending: packEndNote(args.seq, args.packSize),
    policy: args.lateCancelBurns ? "Cancelling under 12 hours counts as a session." : "",
    link: args.link,
  });
}

export function runningLateMessage(
  templates: TemplateMap | undefined,
  args: { clientName: string; fromSlot: string; toSlot: string; minutes: number },
): string {
  return render(pick(templates, "runningLate"), {
    name: args.clientName.split(" ")[0],
    minutes: String(args.minutes),
    time: fmtSlot(args.fromSlot),
    newtime: fmtSlot(args.toSlot),
  });
}

export function trainerCancelMessage(
  templates: TemplateMap | undefined,
  args: { clientName: string; slot: string },
): string {
  return render(pick(templates, "cancel"), {
    name: args.clientName.split(" ")[0],
    time: fmtSlot(args.slot),
  });
}
