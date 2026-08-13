import { getPublicView } from "@/lib/public";
import { ClientActionCard } from "@/components/ClientActionCard";
import { T } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function ClientPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getPublicView(token);

  if (!view) {
    return (
      <div className="app-shell" style={{ justifyContent: "center", padding: "0 28px" }}>
        <div style={{ margin: "auto 0", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>Link not found</div>
          <div style={{ fontSize: 14, color: T.gray, marginTop: 8, lineHeight: 1.5 }}>
            This session link is no longer valid. Please ask your trainer for a new one.
          </div>
        </div>
      </div>
    );
  }

  return <ClientActionCard token={token} initial={view} />;
}
