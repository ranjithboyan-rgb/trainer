import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import { ClientDetailView } from "@/components/screens/ClientDetailView";

export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getRepo();
  if (!repo) return null;
  const [client, trainer] = await Promise.all([repo.getClientDetail(id), repo.getTrainer()]);
  if (!client) notFound();
  return (
    <ClientDetailView
      client={client}
      trainerName={trainer.display_name}
      lateCancelBurns={trainer.late_cancel_burns}
    />
  );
}
