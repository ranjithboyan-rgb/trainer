"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDemo } from "@/lib/config";
import { PrimaryButton } from "@/components/ui";

export function LoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    if (isDemo) {
      // No Supabase configured — demo just enters the app.
      router.push("/today");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <PrimaryButton disabled={loading} onClick={signIn}>
      {loading ? "Redirecting…" : isDemo ? "Continue with Google (demo)" : "Continue with Google"}
    </PrimaryButton>
  );
}
