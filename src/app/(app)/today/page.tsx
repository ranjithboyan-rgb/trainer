import { getRepo } from "@/lib/repo";
import { fmtSlot } from "@/lib/theme";
import { todayISO, shiftISO } from "@/lib/domain";
import { TodayView } from "@/components/screens/TodayView";

export const dynamic = "force-dynamic";

// Accept only a well-formed date within a sane window; otherwise fall back to today.
function resolveDate(raw: string | undefined, today: string): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
  const d = new Date(raw + "T00:00:00");
  if (Number.isNaN(d.getTime())) return today;
  const base = new Date(today + "T00:00:00");
  const diffDays = Math.round((d.getTime() - base.getTime()) / 86_400_000);
  if (diffDays < -370 || diffDays > 45) return today;
  return raw;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const repo = await getRepo();
  if (!repo) return null;

  const today = todayISO();
  const selected = resolveDate(date, today);

  const [ledger, trainer, activeDates] = await Promise.all([
    repo.getLedger(selected),
    repo.getTrainer(),
    repo.getSessionDates(shiftISO(today, -370), shiftISO(today, 45)),
  ]);
  const confirmTime = fmtSlot(trainer.confirm_send_time.slice(0, 5));

  return (
    <TodayView
      ledger={ledger}
      confirmTime={confirmTime}
      selectedISO={selected}
      todayISO={today}
      activeDates={activeDates}
      sessionMinutes={trainer.session_minutes}
      templates={trainer.templates}
      lateCancelBurns={trainer.late_cancel_burns}
    />
  );
}
