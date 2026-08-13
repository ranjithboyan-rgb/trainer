// Every client-facing message in one place. In assisted mode these are just
// pre-filled text the trainer sends from their own WhatsApp; the interactive
// bit (confirm/cancel/reschedule) lives on the linked action page.
//
// Design rule from the DLS: lead with the concrete fact (day, slot, session
// count); one emoji at most; policy stated plainly when it applies.

import { fmtSlot, fmtDays, DAY_ABBR } from "./theme";

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
  if (seq === 1) return `New pack starts — session 1 of ${size}.`;
  if (seq === size) return `Final session of this pack.`;
  if (seq === size - 1) return `Two sessions left in this pack.`;
  return "";
}

export interface Trainerish {
  display_name: string;
  late_cancel_burns: boolean;
}

export function welcomeMessage(args: {
  trainerName: string;
  clientName: string;
  trainingDays: number[];
  slot: string;
  link: string;
}): string {
  const first = args.clientName.split(" ")[0];
  return (
    `Hi ${first}! ${args.trainerName} runs your training sessions here now. ` +
    `Your schedule: ${fmtDays(args.trainingDays)} at ${fmtSlot(args.slot)}. ` +
    `You'll get a note the evening before each session — confirm or make changes here: ${args.link}`
  );
}

export function confirmationMessage(args: {
  clientName: string;
  dateISO: string;
  todayISO: string;
  slot: string;
  seq: number;
  packSize: number;
  lateCancelBurns: boolean;
  link: string;
}): string {
  const first = args.clientName.split(" ")[0];
  const when = relativeDay(args.dateISO, args.todayISO);
  const whenCap = when.charAt(0).toUpperCase() + when.slice(1);
  const endNote = packEndNote(args.seq, args.packSize);
  const policy = args.lateCancelBurns
    ? " Cancelling under 12 hours counts as a session."
    : "";
  const lead =
    args.seq === 1
      ? `Hi ${first}! ${whenCap}, ${fmtSlot(args.slot)} — ${endNote}`
      : `Hi ${first}! ${whenCap}, ${fmtSlot(args.slot)} — session ${args.seq} of ${args.packSize}.${endNote ? " " + endNote : ""}`;
  return `${lead}${policy} Confirm or make changes: ${args.link}`;
}

export function reminderMessage(args: {
  slot: string;
  seq: number;
  packSize: number;
}): string {
  return `See you at ${fmtSlot(args.slot)} 💪 Session ${args.seq} of ${args.packSize}.`;
}

export function noShowMessage(args: { slot: string; counted: boolean }): string {
  const base = `We missed you at ${fmtSlot(args.slot)} today.`;
  return args.counted ? `${base} As it was under 12 hours, it counted as a session.` : base;
}
