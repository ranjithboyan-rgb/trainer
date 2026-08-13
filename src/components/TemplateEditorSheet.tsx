"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { Label, PrimaryButton } from "@/components/ui";
import { T, FONT } from "@/lib/theme";
import { render, DEFAULT_TEMPLATE, type TemplateDef } from "@/lib/templates";

export function TemplateEditorSheet({
  def,
  current,
  onSave,
  onReset,
  onClose,
}: {
  def: TemplateDef;
  current: string; // current custom text, or "" if using default
  onSave: (text: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(current || DEFAULT_TEMPLATE[def.key]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const isDefault = text.trim() === DEFAULT_TEMPLATE[def.key].trim();

  const insert = (token: string) => {
    const el = ref.current;
    const at = el ? el.selectionStart : text.length;
    const next = text.slice(0, at) + token + text.slice(at);
    setText(next);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = at + token.length;
      }
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
          maxHeight: "92vh",
          overflowY: "auto",
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
          <Label>{def.label}</Label>
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

        <div style={{ fontSize: 12.5, color: T.faint, marginBottom: 12, lineHeight: 1.5 }}>
          {def.hint}
        </div>

        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            minHeight: 120,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: "12px 13px",
            fontSize: 14.5,
            lineHeight: 1.55,
            fontFamily: FONT,
            resize: "none",
            outline: "none",
          }}
        />

        <Label style={{ margin: "14px 0 8px" }}>Tap to insert</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {def.vars.map((v) => (
            <button
              key={v.token}
              onClick={() => insert(v.token)}
              title={v.label}
              style={{
                border: `1px solid ${T.border}`,
                background: "#fff",
                color: T.ink,
                fontSize: 12.5,
                fontWeight: 700,
                padding: "6px 10px",
                borderRadius: 9,
                cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              {v.token}
            </button>
          ))}
        </div>

        <Label style={{ margin: "16px 0 6px" }}>Preview</Label>
        <div
          style={{
            fontSize: 13.5,
            color: T.gray,
            lineHeight: 1.5,
            background: T.page,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: "12px 13px",
            whiteSpace: "pre-wrap",
          }}
        >
          {render(text, def.sample) || "…"}
        </div>

        <PrimaryButton
          disabled={!text.trim()}
          onClick={() => onSave(text.trim())}
          style={{ marginTop: 16 }}
        >
          Save message
        </PrimaryButton>
        {!isDefault && (
          <button
            onClick={onReset}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: "none",
              color: T.gray,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}
