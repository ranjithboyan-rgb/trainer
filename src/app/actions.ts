"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/repo";
import { isDemo } from "@/lib/config";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";
import type { NewClientInput, SessionStatus, Trainer } from "@/lib/types";

export async function createClientAction(input: NewClientInput): Promise<string> {
  const repo = await getRepo();
  if (!repo) throw new Error("Not authenticated");
  const id = await repo.createClient(input);
  revalidatePath("/clients");
  revalidatePath("/today");
  return id;
}

export async function logSessionAction(
  clientId: string,
  input: { status: "completed" | "no_show"; note: string | null },
): Promise<void> {
  const repo = await getRepo();
  if (!repo) throw new Error("Not authenticated");
  await repo.logSession(clientId, input);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/today");
}

export async function setTodayStatusAction(
  clientId: string,
  status: SessionStatus,
): Promise<void> {
  const repo = await getRepo();
  if (!repo) throw new Error("Not authenticated");
  await repo.setTodayStatus(clientId, status);
  revalidatePath("/today");
}

export async function setSessionDelayAction(clientId: string, minutes: number): Promise<void> {
  const repo = await getRepo();
  if (!repo) throw new Error("Not authenticated");
  await repo.setSessionDelay(clientId, minutes);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/today");
}

export async function cancelSessionAction(clientId: string): Promise<void> {
  const repo = await getRepo();
  if (!repo) throw new Error("Not authenticated");
  await repo.cancelSession(clientId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/today");
}

export async function scheduleSessionAction(
  clientId: string,
  dateISO: string,
  slot: string,
): Promise<void> {
  const repo = await getRepo();
  if (!repo) throw new Error("Not authenticated");
  await repo.scheduleSession(clientId, dateISO, slot);
  revalidatePath("/today");
  revalidatePath(`/clients/${clientId}`);
}

export async function updateTrainerAction(patch: Partial<Trainer>): Promise<void> {
  const repo = await getRepo();
  if (!repo) throw new Error("Not authenticated");
  await repo.updateTrainer(patch);
  revalidatePath("/settings");
  revalidatePath("/today");
}

export async function signOutAction(): Promise<void> {
  if (!isDemo) {
    const db = await createSupabaseServer();
    await db.auth.signOut();
  }
  redirect("/login");
}
