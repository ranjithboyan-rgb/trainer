import { isDemo } from "@/lib/config";
import { LoginButton } from "@/components/LoginButton";
import { T } from "@/lib/theme";

export default function LoginPage() {
  return (
    <div
      className="app-shell"
      style={{ justifyContent: "center", padding: "0 28px", gap: 8 }}
    >
      <div style={{ marginTop: "auto" }} />
      <div style={{ fontSize: 32, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em" }}>
        FitMonk Trainer
      </div>
      <div style={{ fontSize: 14.5, color: T.gray, lineHeight: 1.5, marginBottom: 20 }}>
        Your clients live in WhatsApp and install nothing. Sessions counted
        automatically, confirmations sent for you.
      </div>
      <LoginButton />
      <div style={{ marginBottom: "auto" }} />
      <div
        style={{ fontSize: 12, color: T.faint, textAlign: "center", padding: "16px 0 28px" }}
      >
        {isDemo
          ? "Preview — Google sign-in goes live once Supabase is connected."
          : "Sign in to manage your clients."}
      </div>
    </div>
  );
}
