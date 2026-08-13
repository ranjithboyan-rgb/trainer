"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Card, Label } from "@/components/ui";
import { T, NUM, fmtSlot } from "@/lib/theme";
import { confirmationMessage } from "@/lib/templates";
import { waLink, clientActionUrl } from "@/lib/wa";
import type { ClientSummary } from "@/lib/types";

interface Row {
  client: ClientSummary;
  seq: number;
}

export function ConfirmationsView({
  rows,
  dateISO,
  todayISO,
  lateCancelBurns,
  templates,
}: {
  rows: Row[];
  dateISO: string;
  todayISO: string;
  lateCancelBurns: boolean;
  templates: Record<string, string>;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const dateline = new Date(dateISO + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <Link
        href="/today"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: T.ink,
          fontSize: 15,
          fontWeight: 600,
          textDecoration: "none",
          padding: "16px 0 4px",
        }}
      >
        <ArrowLeft size={17} /> Today
      </Link>
      <div style={{ fontSize: 32, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em" }}>
        Confirmations
      </div>
      <div style={{ fontSize: 13, color: T.gray, margin: "6px 0 8px" }}>
        {rows.length ? `${rows.length} for ${dateline}` : dateline}
      </div>
      <div style={{ fontSize: 12.5, color: T.faint, lineHeight: 1.5, marginBottom: 14 }}>
        Each opens WhatsApp with the message ready — you tap send. Clients confirm or make
        changes on the link inside.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.length === 0 && (
          <Card>
            <div style={{ fontSize: 14, color: T.faint, textAlign: "center", padding: "8px 0" }}>
              No sessions scheduled {dateline}.
            </div>
          </Card>
        )}

        {rows.map(({ client, seq }) => {
          const msg = origin
            ? confirmationMessage(templates, {
                clientName: client.name,
                dateISO,
                todayISO,
                slot: client.slot,
                seq,
                packSize: client.packSize,
                lateCancelBurns,
                link: clientActionUrl(origin, client.public_token),
              })
            : "";
          return (
            <Card key={client.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{client.name}</div>
                  <div style={{ fontSize: 12.5, color: T.gray, marginTop: 4, ...NUM }}>
                    {fmtSlot(client.slot)} · session {seq} of {client.packSize}
                  </div>
                </div>
                <a
                  href={origin ? waLink(client.wa_phone, msg) : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: T.ink,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    padding: "10px 16px",
                    borderRadius: 12,
                    textDecoration: "none",
                    opacity: origin ? 1 : 0.5,
                    pointerEvents: origin ? "auto" : "none",
                  }}
                >
                  <Send size={15} /> Send
                </a>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
