import { getRepo } from "@/lib/repo";
import { isDemo } from "@/lib/config";
import { SettingsView } from "@/components/screens/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const repo = await getRepo();
  if (!repo) return null;
  const [trainer, accountEmail] = await Promise.all([
    repo.getTrainer(),
    repo.accountEmail(),
  ]);
  return <SettingsView trainer={trainer} accountEmail={accountEmail} demo={isDemo} />;
}
