import { redirect, notFound } from "next/navigation";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";
import { isDemo } from "@/lib/config";
import { getHubOverview, isAdminEmail } from "@/lib/hub";
import { HubView } from "@/components/screens/HubView";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  // Live: must be signed in AND on the admin allowlist. Non-admins get a 404
  // rather than a redirect, so the route never advertises itself. Demo mode is
  // open so the hub is previewable in dev.
  if (!isDemo) {
    const db = await createSupabaseServer();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) redirect("/login");
    if (!isAdminEmail(user.email)) notFound();
  }

  const overview = await getHubOverview();
  return <HubView overview={overview} isDemo={isDemo} />;
}
