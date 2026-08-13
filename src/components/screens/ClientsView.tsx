"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Label, PageHeader } from "@/components/ui";
import { AddClientSheet } from "@/components/AddClientSheet";
import { T, NUM, fmtDays, fmtSlot } from "@/lib/theme";
import type { ClientSummary } from "@/lib/types";

export function ClientsView({
  clients,
  packSize,
}: {
  clients: ClientSummary[];
  packSize: number;
}) {
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <PageHeader eyebrow={`${clients.length} active`} title="Clients" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {clients.map((c) => {
          const endingSoon = c.doneInPack >= c.packSize - 2;
          return (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Card>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: T.gray, marginTop: 4 }}>
                    {fmtDays(c.training_days)} — {fmtSlot(c.slot)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: endingSoon ? T.warn : T.ink,
                      ...NUM,
                    }}
                  >
                    {c.doneInPack}/{c.packSize}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.faint, fontWeight: 600, marginTop: 3 }}>
                    {endingSoon ? "pack ends soon" : "sessions"}
                  </div>
                </div>
              </div>
              </Card>
            </Link>
          );
        })}

        <button
          onClick={() => setAdding(true)}
          style={{
            background: "transparent",
            borderRadius: 16,
            padding: "20px 16px",
            border: `1.5px dashed ${T.border}`,
            cursor: "pointer",
            textAlign: "center",
            width: "100%",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: T.faint }}>
            ＋ Add client — works for existing clients mid-pack too
          </span>
        </button>
      </div>

      {adding && (
        <AddClientSheet
          packSize={packSize}
          onClose={() => setAdding(false)}
          onCreated={(id) => {
            setAdding(false);
            router.push(`/clients/${id}`);
          }}
        />
      )}
    </div>
  );
}
