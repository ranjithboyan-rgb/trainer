"use client";

import { useState, useTransition } from "react";
import { X, Minus, Plus } from "lucide-react";
import { Label, PrimaryButton } from "@/components/ui";
import { T, NUM, FONT, DAY_SHORT, AM_SLOTS, PM_SLOTS, fmtSlot } from "@/lib/theme";
import { createClientAction } from "@/app/actions";
import { normalizePhone } from "@/lib/wa";

export function AddClientSheet({
  packSize,
  onClose,
  onCreated,
}: {
  packSize: number;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [slot, setSlot] = useState<string | null>(null);
  const [doneAlready, setDoneAlready] = useState(0);
  const [pending, startTransition] = useTransition();

  const toggleDay = (i: number) =>
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  const ok = name.trim() && phone.trim() && days.length > 0 && slot;

  const submit = () => {
    if (!ok || pending) return;
    startTransition(async () => {
      const id = await createClientAction({
        name: name.trim(),
        wa_phone: normalizePhone(phone),
        training_days: days,
        slot: slot!,
        starting_offset: doneAlready,
      });
      onCreated(id);
    });
  };

  const SlotChip = ({ s }: { s: string }) => (
    <button
      onClick={() => setSlot(s)}
      style={{
        flex: "1 0 28%",
        padding: "9px 0",
        borderRadius: 10,
        border: `1px solid ${slot === s ? T.ink : T.border}`,
        background: slot === s ? T.ink : "#fff",
        color: slot === s ? "#fff" : T.gray,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
        ...NUM,
      }}
    >
      {fmtSlot(s)}
    </button>
  );

  const Stepper = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        border: `1px solid ${T.border}`,
        background: "#fff",
        color: T.ink,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );

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
          maxHeight: "90vh",
          overflowY: "auto",
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
          <Label>New client</Label>
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

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          style={inputStyle}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp number"
          inputMode="tel"
          style={{ ...inputStyle, marginBottom: 4, ...NUM }}
        />
        <div style={{ fontSize: 12, color: T.faint, ...NUM, minHeight: 16 }}>
          {phone.trim()
            ? `Will send to ${normalizePhone(phone)}`
            : "10-digit number (India), or +country code"}
        </div>

        <Label style={{ margin: "14px 0 6px" }}>Training days</Label>
        <div style={{ display: "flex", gap: 6 }}>
          {DAY_SHORT.map((d, i) => {
            const on = days.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 10,
                  border: `1px solid ${on ? T.ink : T.border}`,
                  background: on ? T.ink : "#fff",
                  color: on ? "#fff" : T.gray,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        <Label style={{ margin: "14px 0 6px" }}>Morning slots</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {AM_SLOTS.map((s) => (
            <SlotChip key={s} s={s} />
          ))}
        </div>
        <Label style={{ margin: "12px 0 6px" }}>Evening slots</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PM_SLOTS.map((s) => (
            <SlotChip key={s} s={s} />
          ))}
        </div>

        <Label style={{ margin: "16px 0 6px" }}>
          Sessions already done in current pack
        </Label>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Stepper onClick={() => setDoneAlready((n) => Math.max(0, n - 1))}>
            <Minus size={16} />
          </Stepper>
          <span
            style={{ fontSize: 26, fontWeight: 800, color: T.ink, minWidth: 74, textAlign: "center", ...NUM }}
          >
            {doneAlready}{" "}
            <span style={{ fontSize: 15, fontWeight: 700, color: T.gray }}>/ {packSize}</span>
          </span>
          <Stepper onClick={() => setDoneAlready((n) => Math.min(packSize - 1, n + 1))}>
            <Plus size={16} />
          </Stepper>
        </div>
        <div style={{ fontSize: 12, color: T.faint, marginTop: 6, lineHeight: 1.5 }}>
          For existing clients mid-pack — their next session will be number {doneAlready + 1}.
        </div>

        <PrimaryButton disabled={!ok || pending} onClick={submit} style={{ marginTop: 16 }}>
          {pending
            ? "Adding…"
            : `Add client${doneAlready > 0 ? ` · starts at ${doneAlready}/${packSize}` : ""}`}
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
  marginBottom: 8,
};
