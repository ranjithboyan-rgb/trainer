import { redirect } from "next/navigation";
import { getRepo } from "@/lib/repo";
import { isDemo } from "@/lib/config";
import { TabBar } from "@/components/TabBar";
import { T } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const repo = await getRepo();
  if (!repo) redirect("/login");

  return (
    <div className="app-shell">
      {isDemo && (
        <div
          style={{
            background: T.ink,
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            textAlign: "center",
            padding: "5px 12px",
            letterSpacing: "0.02em",
          }}
        >
          Demo mode — seed data, no sign-in. Add Supabase env to go live.
        </div>
      )}
      <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      <TabBar />
    </div>
  );
}
