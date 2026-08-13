"use server";

import { applyClientAction, getRescheduleOptions, applyReschedule } from "@/lib/public";
import type { ClientAction, ClientActionResult, DayOptions } from "@/lib/types";

// Public — no auth. Guarded only by the unguessable token. Acts on the client's
// next upcoming session.
export async function submitClientAction(
  token: string,
  action: ClientAction,
): Promise<ClientActionResult> {
  return applyClientAction(token, action);
}

export async function fetchRescheduleOptions(token: string): Promise<DayOptions[]> {
  return getRescheduleOptions(token);
}

export async function submitReschedule(
  token: string,
  dateISO: string,
  slot: string,
): Promise<ClientActionResult> {
  return applyReschedule(token, dateISO, slot);
}
