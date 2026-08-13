import { getRepo } from "@/lib/repo";
import { ClientsView } from "@/components/screens/ClientsView";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const repo = await getRepo();
  if (!repo) return null;
  const [clients, trainer] = await Promise.all([repo.listClients(), repo.getTrainer()]);
  return (
    <ClientsView
      clients={clients}
      packSize={trainer.sessions_per_pack}
      slots={trainer.slots}
    />
  );
}
