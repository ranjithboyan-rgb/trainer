"use client";

import React from "react";
import { T, NUM } from "@/lib/theme";

export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: T.gray,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Card({
  children,
  onClick,
  style,
  dashed,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  dashed?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.card,
        borderRadius: 16,
        padding: "18px 16px",
        border: dashed ? `1.5px dashed ${T.border}` : `1px solid ${T.border}`,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Dot({ c }: { c: string }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        background: c,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

export function Unit({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12.5, fontWeight: 500, color: T.gray, marginLeft: 3 }}>
      {children}
    </span>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-pressed={on}
      style={{
        width: 46,
        height: 28,
        borderRadius: 14,
        border: "none",
        cursor: "pointer",
        padding: 2,
        background: on ? T.ink : T.border,
        transition: "background 0.2s",
        display: "flex",
        justifyContent: on ? "flex-end" : "flex-start",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

export function ProgressBar({ pct, color = T.ink }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 6, background: T.rule, borderRadius: 3, marginTop: 12, overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min(1, Math.max(0, pct)) * 100}%`,
          height: 6,
          background: color,
          borderRadius: 3,
          transition: "width 0.4s",
        }}
      />
    </div>
  );
}

export function PageHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ padding: "16px 0 14px" }}>
      <Label>{eyebrow}</Label>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: T.ink,
          letterSpacing: "-0.03em",
          marginTop: 4,
        }}
      >
        {title}
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  style,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 0",
        borderRadius: 13,
        border: "none",
        background: disabled ? T.rule : T.ink,
        color: disabled ? T.faint : "#fff",
        fontSize: 15.5,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        ...NUM,
        letterSpacing: "-0.01em",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
