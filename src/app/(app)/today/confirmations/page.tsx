import { getRepo } from "@/lib/repo";
import { todayISO, shiftISO } from "@/lib/domain";
import { ConfirmationsView } from "@/components/screens/ConfirmationsView";
import type { ClientSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ConfirmationsPage() {
  const repo = await getRepo();
  if (!repo) return null;

  const today = todayISO();
  const tomorrow = shiftISO(today, 1);
  const [ledger, trainer] = await Promise.all([repo.getLedger(tomorrow), repo.getTrainer()]);

  // Flatten to the clients actually scheduled tomorrow, with the seq for that day.
  const rows = [...ledger.morning, ...ledger.evening]
    .filter((e): e is typeof e & { client: ClientSummary } => e.client !== null)
    .map((e) => ({ client: e.client, seq: e.seq ?? e.client.nextSeq }));

  return (
    <ConfirmationsView
      rows={rows}
      dateISO={tomorrow}
      todayISO={today}
      lateCancelBurns={trainer.late_cancel_burns}
    />
  );
}
