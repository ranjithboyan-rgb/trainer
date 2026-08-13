"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Label, PrimaryButton } from "@/components/ui";
import { T, FONT } from "@/lib/theme";
import { updateTrainerAction } from "@/app/actions";
import type { Trainer } from "@/lib/types";

export function EditProfileSheet({
  trainer,
  onClose,
}: {
  trainer: Trainer;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(trainer.display_name);
  const [gym, setGym] = useState(trainer.gym ?? "");
  const [pending, startTransition] = useTransition();

  const ok = name.trim().length > 0;

  const save = () => {
    if (!ok || pending) return;
    startTransition(async () => {
      await updateTrainerAction({ display_name: name.trim(), gym: gym.trim() || null });
      router.refresh();
      onClose();
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgba(10,10,10,0.35)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          padding: "20px 22px calc(30px + env(safe-area-inset-bottom))",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <Label>Edit profile</Label>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: T.rule,
              borderRadius: 14,
              width: 28,
              height: 28,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.gray,
            }}
          >
            <X size={15} />
          </button>
        </div>

        <Label style={{ margin: "0 0 6px" }}>Name</Label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={inputStyle}
        />

        <Label style={{ margin: "12px 0 6px" }}>Gym / location</Label>
        <input
          value={gym}
          onChange={(e) => setGym(e.target.value)}
          placeholder="e.g. Cult Gunjur · Bengaluru"
          style={inputStyle}
        />

        <PrimaryButton disabled={!ok || pending} onClick={save} style={{ marginTop: 16 }}>
          {pending ? "Saving…" : "Save profile"}
        </PrimaryButton>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 15,
  fontFamily: FONT,
  outline: "none",
};
