import React, { useState } from "react";
import { ArrowLeft, Check, X, ChevronDown, ChevronUp } from "lucide-react";

/* ---- FitMonk Trainer v4 — the Client page at scale ----
   Focus screen: what a client looks like after months.
   - Lifetime header: client since, total sessions, packs, attendance
   - History grouped by PACK: current pack open, past packs collapsed
   - Pack rollover: 12/12 -> archive -> new pack starts at 1        */
const T = {
  ink: "#0A0A0A", gray: "#8A8A8E", faint: "#C7C7CC",
  border: "#E8E8EA", rule: "#F0F0F2",
  good: "#0B8A3E", warn: "#C7830A", bad: "#C1272D",
};
const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`;
const NUM = { fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" };

const Label = ({ children, style }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: T.gray, letterSpacing: "0.08em", textTransform: "uppercase", ...style }}>{children}</div>
);
const Card = ({ children, style }) => (
  <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: `1px solid ${T.border}`, ...style }}>{children}</div>
);
const Unit = ({ children }) => <span style={{ fontSize: 12.5, fontWeight: 500, color: T.gray, marginLeft: 3 }}>{children}</span>;

const CLIENT = {
  name: "Ranjith",
  schedule: "Mon · Wed · Fri — 6:00 AM",
  since: "Mar 4, 2026",
  totalDone: 32, totalScheduled: 35, packsCompleted: 2,
  currentPack: {
    n: 3, started: "Jun 14", done: 8,
    sessions: [
      ["Jul 10", 8, "Shoulders & arms — face pulls, shoulder press, curls", "done"],
      ["Jul 8", 7, "Legs — squats, leg press, RDL", "done"],
      ["Jul 6", 6, "Shoulders & arms", "done"],
      ["Jul 4", 5, "Upper mix — rows, chest press, pulldown", "done"],
      ["Jul 1", null, "Late cancel — counted", "cancelled"],
      ["Jun 27", 4, "Legs", "done"],
      ["Jun 24", 3, "Upper mix", "done"],
      ["Jun 20", 2, "Shoulders & arms", "done"],
      ["Jun 16", 1, "Assessment + upper mix", "done"],
    ],
  },
  pastPacks: [
    { n: 2, range: "May 2 – Jun 11", done: 12, cancels: 1, note: "12 of 12 · 1 late cancel" },
    { n: 1, range: "Mar 4 – Apr 28", done: 12, cancels: 2, note: "12 of 12 · 2 reschedules" },
  ],
};

function PastPack({ p }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${T.rule}` }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", padding: "12px 0", border: "none", background: "none", cursor: "pointer", fontFamily: FONT }}>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.gray }}>Pack {p.n} · {p.range}</div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{p.note}</div>
        </div>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={14} color={T.good} strokeWidth={3} />
          {open ? <ChevronUp size={15} color={T.faint} /> : <ChevronDown size={15} color={T.faint} />}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 10 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ display: "flex", padding: "6px 0", opacity: 0.75 }}>
              <span style={{ width: 30, fontSize: 12, color: T.faint, fontWeight: 700, ...NUM }}>{p.done - i}</span>
              <span style={{ width: 54, fontSize: 12, color: T.faint, ...NUM }}>{p.n === 2 ? ["Jun 11", "Jun 9", "Jun 6"][i] : ["Apr 28", "Apr 25", "Apr 23"][i]}</span>
              <span style={{ fontSize: 13, color: T.gray, fontWeight: 600 }}>{["Full body", "Push", "Pull"][i]}</span>
              <Check size={12} color={T.good} strokeWidth={3} style={{ marginLeft: "auto", marginTop: 2 }} />
            </div>
          ))}
          <div style={{ fontSize: 12, color: T.faint, paddingTop: 4 }}>… all {p.done} sessions</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const c = CLIENT;
  const attendance = Math.round((c.totalDone / c.totalScheduled) * 100);
  const pct = c.currentPack.done / 12;

  return (
    <div style={{ minHeight: "100vh", background: "#E9E9EC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FONT }}>
      <div style={{ position: "relative", width: 390, height: 800, background: "#FAFAFA", borderRadius: 44, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.30), 0 0 0 10px #111, 0 0 0 12px #3A3A3C" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 26px 0", fontSize: 14, fontWeight: 600, color: T.ink }}>
          <span style={NUM}>9:41</span><span style={{ letterSpacing: 1.5 }}>▪▪▪ ⏻</span>
        </div>

        <div style={{ position: "absolute", inset: "36px 0 0", overflowY: "auto", padding: "0 20px 60px" }}>
          <button style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", color: T.ink, fontSize: 15, fontWeight: 600, cursor: "pointer", padding: "16px 0 4px", fontFamily: FONT }}>
            <ArrowLeft size={17} /> Clients
          </button>
          <div style={{ fontSize: 32, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em" }}>{c.name}</div>
          <div style={{ fontSize: 13, color: T.gray, margin: "4px 0 14px" }}>{c.schedule}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* LIFETIME — client since + the numbers that matter */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <Label>Client since</Label>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, ...NUM }}>{c.since} · 4 months</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", ...NUM }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>{c.totalDone}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.gray, letterSpacing: "0.04em", marginTop: 1 }}>SESSIONS</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>{c.packsCompleted}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.gray, letterSpacing: "0.04em", marginTop: 1 }}>PACKS DONE</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: attendance >= 90 ? T.good : T.ink }}>{attendance}%</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.gray, letterSpacing: "0.04em", marginTop: 1 }}>ATTENDANCE</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>3<Unit>/wk</Unit></div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.gray, letterSpacing: "0.04em", marginTop: 1 }}>CADENCE</div>
                </div>
              </div>
            </Card>

            {/* CURRENT PACK */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <Label>Pack {c.currentPack.n} · current</Label>
                <span style={{ fontSize: 12, color: T.faint, fontWeight: 500, ...NUM }}>started {c.currentPack.started}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: T.ink, lineHeight: 1, ...NUM }}>{c.currentPack.done}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: T.gray, marginLeft: 4, ...NUM }}>/ 12</span>
              </div>
              <div style={{ height: 6, background: T.rule, borderRadius: 3, marginTop: 10 }}>
                <div style={{ width: `${pct * 100}%`, height: 6, background: T.ink, borderRadius: 3 }} />
              </div>
            </Card>

            {/* HISTORY — grouped by pack */}
            <Card>
              <Label style={{ marginBottom: 6 }}>Pack {c.currentPack.n} sessions</Label>
              {c.currentPack.sessions.map(([d, n, w, s], i) => (
                <div key={d + i} style={{ display: "flex", alignItems: "flex-start", padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${T.rule}` }}>
                  <span style={{ width: 30, fontSize: 12.5, fontWeight: 800, color: s === "done" ? T.ink : T.faint, ...NUM, paddingTop: 1 }}>{n ?? "—"}</span>
                  <span style={{ width: 54, fontSize: 12.5, color: T.faint, fontWeight: 600, ...NUM, paddingTop: 1 }}>{d}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: s === "done" ? T.ink : T.gray, lineHeight: 1.4 }}>{w}</span>
                  <span style={{ paddingTop: 2, color: s === "done" ? T.good : T.bad }}>
                    {s === "done" ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                  </span>
                </div>
              ))}
              {/* archived packs */}
              <div style={{ marginTop: 8 }}>
                <Label style={{ margin: "10px 0 2px" }}>Earlier packs</Label>
                {c.pastPacks.map((p) => <PastPack key={p.n} p={p} />)}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
