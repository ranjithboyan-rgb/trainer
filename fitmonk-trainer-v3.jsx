import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, X, MessageCircle, Users, CalendarDays, Settings as SettingsIcon, Minus, Plus } from "lucide-react";

/* ---- FitMonk Trainer v3 ----
   - Payments removed everywhere; packs are session counters only.
   - Add client: Morning slots / Evening slots grouped, plus
     "sessions already done" stepper for mid-pack onboarding.
   - Logging: today's session -> Completed -> dictate what was done. */
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
const Card = ({ children, onClick, style, dashed }) => (
  <div onClick={onClick} style={{ background: "#fff", borderRadius: 16, padding: 16, border: dashed ? `1.5px dashed ${T.border}` : `1px solid ${T.border}`, cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>
);
const Dot = ({ c }) => <span style={{ width: 8, height: 8, borderRadius: 4, background: c, display: "inline-block", flexShrink: 0 }} />;
const Toggle = ({ on, onChange }) => (
  <button onClick={onChange} style={{ width: 46, height: 28, borderRadius: 14, border: "none", cursor: "pointer", padding: 2, background: on ? T.ink : T.border, transition: "background 0.2s", display: "flex", justifyContent: on ? "flex-end" : "flex-start", alignItems: "center" }}>
    <span style={{ width: 24, height: 24, borderRadius: 12, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
  </button>
);

const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const AM_SLOTS = ["6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM"];
const PM_SLOTS = ["5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"];

const INITIAL_CLIENTS = [
  { name: "Ranjith", days: [1, 3, 5], slot: "6:00 AM", done: 8,
    todayScheduled: true, todayStatus: "pending",
    history: [["Jul 8", "Legs — squats, leg press, RDL", "done"], ["Jul 6", "Shoulders & arms", "done"], ["Jul 4", "Upper mix", "done"], ["Jul 1", "Shoulders & arms", "cancelled"]] },
  { name: "Arvind", days: [2, 4, 6], slot: "8:00 AM", done: 10,
    todayScheduled: false,
    history: [["Jul 9", "Full body", "done"], ["Jul 7", "Full body", "done"]] },
  { name: "Rahul", days: [1, 3, 5], slot: "7:00 PM", done: 11,
    todayScheduled: true, todayStatus: "confirmed",
    history: [["Jul 8", "Push — bench, incline, dips", "done"], ["Jul 6", "Pull", "done"]] },
];

/* ---------- add client (v3) ---------- */
function AddClient({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState([1, 3, 5]);
  const [slot, setSlot] = useState(null);
  const [doneAlready, setDoneAlready] = useState(0);

  const toggleDay = (i) => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  const ok = name.trim() && phone.trim() && days.length > 0 && slot;

  const SlotChip = ({ s }) => (
    <button onClick={() => setSlot(s)} style={{ flex: "1 0 30%", padding: "9px 0", borderRadius: 10, border: `1px solid ${slot === s ? T.ink : T.border}`, background: slot === s ? T.ink : "#fff", color: slot === s ? "#fff" : T.gray, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, ...NUM }}>{s}</button>
  );

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(10,10,10,0.35)", borderRadius: "inherit" }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 44px 44px", padding: "20px 22px 30px", boxShadow: "0 -10px 40px rgba(0,0,0,0.15)", maxHeight: "88%", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Label>New client</Label>
          <button onClick={onClose} style={{ border: "none", background: T.rule, borderRadius: 14, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.gray }}><X size={15} /></button>
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 15, fontFamily: FONT, outline: "none", marginBottom: 8 }} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number"
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 15, fontFamily: FONT, outline: "none", ...NUM }} />

        <Label style={{ margin: "14px 0 6px" }}>Training days</Label>
        <div style={{ display: "flex", gap: 6 }}>
          {DAYS_SHORT.map((d, i) => {
            const on = days.includes(i);
            return (
              <button key={i} onClick={() => toggleDay(i)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${on ? T.ink : T.border}`, background: on ? T.ink : "#fff", color: on ? "#fff" : T.gray, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>{d}</button>
            );
          })}
        </div>

        <Label style={{ margin: "14px 0 6px" }}>Morning slots</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {AM_SLOTS.map((s) => <SlotChip key={s} s={s} />)}
        </div>
        <Label style={{ margin: "12px 0 6px" }}>Evening slots</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PM_SLOTS.map((s) => <SlotChip key={s} s={s} />)}
        </div>

        {/* mid-pack onboarding */}
        <Label style={{ margin: "16px 0 6px" }}>Sessions already done in current pack</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setDoneAlready((n) => Math.max(0, n - 1))} style={{ width: 38, height: 38, borderRadius: 19, border: `1px solid ${T.border}`, background: "#fff", color: T.ink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={16} /></button>
          <span style={{ fontSize: 26, fontWeight: 800, color: T.ink, minWidth: 74, textAlign: "center", ...NUM }}>{doneAlready} <span style={{ fontSize: 15, fontWeight: 700, color: T.gray }}>/ 12</span></span>
          <button onClick={() => setDoneAlready((n) => Math.min(11, n + 1))} style={{ width: 38, height: 38, borderRadius: 19, border: `1px solid ${T.border}`, background: "#fff", color: T.ink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={16} /></button>
        </div>
        <div style={{ fontSize: 12, color: T.faint, marginTop: 6, lineHeight: 1.5 }}>
          For existing clients mid-pack — their next session will be number {doneAlready + 1}.
        </div>

        <button disabled={!ok} onClick={() => ok && onAdd({ name: name.trim(), phone, days, slot, done: doneAlready })}
          style={{ width: "100%", marginTop: 16, padding: "14px 0", borderRadius: 13, border: "none", background: ok ? T.ink : T.rule, color: ok ? "#fff" : T.faint, fontSize: 15.5, fontWeight: 700, cursor: ok ? "pointer" : "default", fontFamily: FONT }}>
          Add client{doneAlready > 0 ? ` · starts at ${doneAlready}/12` : ""}
        </button>
      </div>
    </div>
  );
}

/* ---------- client detail ---------- */
function ClientPage({ client, onBack, onLogged }) {
  const [stage, setStage] = useState(client.todayScheduled && client.todayStatus !== "logged" ? "due" : "none");
  const [note, setNote] = useState("");
  const pct = Math.min(1, client.done / 12);
  const renewalDue = client.done >= 10;

  return (
    <div style={{ padding: "0 20px 120px" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", color: T.ink, fontSize: 15, fontWeight: 600, cursor: "pointer", padding: "16px 0 4px", fontFamily: FONT }}>
        <ArrowLeft size={17} /> Clients
      </button>
      <div style={{ fontSize: 32, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em" }}>{client.name}</div>
      <div style={{ fontSize: 13, color: T.gray, margin: "4px 0 14px" }}>
        {client.days.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(" · ")} — {client.slot}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {stage === "due" && (
          <Card style={{ borderColor: T.ink }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <Label>Today · {client.slot}</Label>
              <span style={{ fontSize: 12, color: T.warn, fontWeight: 700, ...NUM }}>Session {client.done + 1} of 12</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStage("note")} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: T.ink, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                ✓ Completed
              </button>
              <button onClick={() => { onLogged(client.name, null); setStage("done"); }} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: `1px solid ${T.border}`, background: "#fff", color: T.gray, fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                No-show
              </button>
            </div>
          </Card>
        )}

        {stage === "note" && (
          <Card style={{ borderColor: T.ink }}>
            <Label style={{ marginBottom: 8 }}>What did the session cover? · optional</Label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder='Dictate or type — "Legs. Squats 3×10, leg press, RDL. Went up on squat."'
              style={{ width: "100%", boxSizing: "border-box", minHeight: 74, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 13px", fontSize: 14.5, lineHeight: 1.5, fontFamily: FONT, resize: "none", outline: "none" }} />
            <button onClick={() => { onLogged(client.name, note || "Session done"); setStage("done"); }} style={{ width: "100%", marginTop: 10, padding: "13px 0", borderRadius: 12, border: "none", background: T.ink, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              Save session {client.done + 1} of 12
            </button>
          </Card>
        )}

        {stage === "done" && (
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={16} color={T.good} strokeWidth={3} />
              <span style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>Today logged</span>
              <span style={{ marginLeft: "auto", fontSize: 12.5, color: T.faint, ...NUM }}>counter updated</span>
            </div>
          </Card>
        )}

        {/* pack — sessions only, no money */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <Label>Current pack</Label>
            {renewalDue && <span style={{ fontSize: 12.5, fontWeight: 700, color: T.warn }}>Ends soon</span>}
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: T.ink, lineHeight: 1, ...NUM }}>{client.done}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.gray, marginLeft: 4, ...NUM }}>/ 12 sessions</span>
          </div>
          <div style={{ height: 6, background: T.rule, borderRadius: 3, marginTop: 12 }}>
            <div style={{ width: `${pct * 100}%`, height: 6, background: renewalDue ? T.warn : T.ink, borderRadius: 3, transition: "width 0.4s" }} />
          </div>
          {renewalDue && (
            <button style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 12, border: "none", background: T.ink, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              Send next-pack message
            </button>
          )}
        </Card>

        <Card>
          <Label style={{ marginBottom: 6 }}>Session history</Label>
          {client.history.length === 0 && <div style={{ fontSize: 13.5, color: T.faint, paddingTop: 4 }}>No sessions logged yet</div>}
          {client.history.map(([d, w, s], i) => (
            <div key={d + i} style={{ display: "flex", alignItems: "flex-start", padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${T.rule}` }}>
              <span style={{ width: 54, fontSize: 12.5, color: T.faint, fontWeight: 600, ...NUM, paddingTop: 1 }}>{d}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: s === "done" ? T.ink : T.gray, lineHeight: 1.4 }}>{w}</span>
              <span style={{ display: "flex", alignItems: "center", paddingTop: 1, color: s === "done" ? T.good : T.bad }}>
                {s === "done" ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ---------- clients list ---------- */
function Clients({ clients, onOpen, onAdd }) {
  return (
    <div style={{ padding: "0 20px 120px" }}>
      <div style={{ padding: "16px 0 12px" }}>
        <Label>{clients.length} active</Label>
        <div style={{ fontSize: 36, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em", marginTop: 2 }}>Clients</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {clients.map((c) => (
          <Card key={c.name} onClick={() => onOpen(c)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: T.gray, marginTop: 2 }}>
                  {c.days.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(" · ")} — {c.slot}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: c.done >= 10 ? T.warn : T.ink, ...NUM }}>{c.done}/12</div>
                <div style={{ fontSize: 11.5, color: T.faint, fontWeight: 600 }}>{c.done >= 10 ? "pack ends soon" : "sessions"}</div>
              </div>
            </div>
          </Card>
        ))}
        <Card dashed onClick={onAdd} style={{ textAlign: "center", padding: "20px 16px" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.faint }}>＋ Add client — works for existing clients mid-pack too</span>
        </Card>
      </div>
    </div>
  );
}

/* ---------- settings (payments removed) ---------- */
function TrainerSettings() {
  const [remind, setRemind] = useState(true);
  const [feedback, setFeedback] = useState(true);
  const [lateCancel, setLateCancel] = useState(true);
  const Row = ({ label, sub, right, last }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: last ? "none" : `1px solid ${T.rule}` }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: T.faint, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
  return (
    <div style={{ padding: "0 20px 120px" }}>
      <div style={{ padding: "16px 0 12px" }}>
        <Label>FitMonk Trainer</Label>
        <div style={{ fontSize: 36, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em", marginTop: 2 }}>Settings</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <Label style={{ marginBottom: 10 }}>Profile</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: 22, background: T.ink, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800 }}>V</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>Vinod</div>
              <div style={{ fontSize: 12.5, color: T.gray, marginTop: 1 }}>Cult Gunjur · Bengaluru</div>
            </div>
          </div>
        </Card>
        <Card>
          <Label style={{ marginBottom: 4 }}>Sessions</Label>
          <Row label="Sessions per pack" right={<span style={{ fontSize: 15, fontWeight: 800, color: T.ink, ...NUM }}>12</span>} />
          <Row label="Late cancel counts as session" sub="Under 12 hours burns one session — stated in every confirmation" last
            right={<Toggle on={lateCancel} onChange={() => setLateCancel((v) => !v)} />} />
        </Card>
        <Card>
          <Label style={{ marginBottom: 4 }}>WhatsApp automation</Label>
          <Row label="Business number" sub="Connected · +91 99•••" right={<Dot c={T.good} />} />
          <Row label="Evening confirmations" sub="Sent at 8:00 PM to tomorrow's clients" right={<span style={{ fontSize: 13, color: T.faint, fontWeight: 600 }}>8:00 PM</span>} />
          <Row label="1-hour reminder" right={<Toggle on={remind} onChange={() => setRemind((v) => !v)} />} />
          <Row label="Post-session feedback" sub="👍/👎 + next class reminder" last right={<Toggle on={feedback} onChange={() => setFeedback((v) => !v)} />} />
        </Card>
        <div style={{ fontSize: 12, color: T.faint, textAlign: "center", lineHeight: 1.6, padding: "8px 0" }}>
          FitMonk Trainer v1 · Your clients never install anything.
        </div>
      </div>
    </div>
  );
}

/* ---------- today ---------- */
function TrainerToday({ clients, onOpenClient }) {
  const Row = ({ t, i }) => {
    const c = clients.find((x) => x.slot === t && x.todayScheduled);
    const status = c ? (c.todayStatus === "logged" ? "confirmed" : c.todayStatus || "pending") : null;
    const meta = { confirmed: [T.good, "Confirmed"], pending: [T.warn, "Awaiting reply"], cancelled: [T.bad, "Cancelled"] }[status] || null;
    return (
      <div style={{ display: "flex", alignItems: "center", padding: "11px 0", borderTop: i === 0 ? "none" : `1px solid ${T.rule}` }}>
        <span style={{ width: 58, fontSize: 13.5, fontWeight: 700, color: c ? T.ink : T.faint, ...NUM }}>{t.replace(" AM", "").replace(" PM", "")}</span>
        {c ? (
          <>
            <button onClick={() => onOpenClient(c)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: FONT, textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: c.done >= 11 ? T.warn : T.faint, fontWeight: 600, ...NUM }}>Session {c.done + 1} of 12</div>
            </button>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: meta[0] }}>
              <Dot c={meta[0]} />{meta[1]}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 13.5, color: T.faint, fontWeight: 500 }}>Open slot</span>
        )}
      </div>
    );
  };
  return (
    <div style={{ padding: "0 20px 120px" }}>
      <div style={{ padding: "16px 0 12px" }}>
        <Label>Friday · July 10, 2026</Label>
        <div style={{ fontSize: 36, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em", marginTop: 2 }}>Today</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <Label style={{ marginBottom: 4 }}>Morning slots</Label>
          {AM_SLOTS.map((t, i) => <Row key={t} t={t} i={i} />)}
        </Card>
        <Card>
          <Label style={{ marginBottom: 4 }}>Evening slots</Label>
          {PM_SLOTS.map((t, i) => <Row key={t} t={t} i={i} />)}
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MessageCircle size={18} color={T.gray} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>Tomorrow's confirmations</div>
              <div style={{ fontSize: 12.5, color: T.gray, marginTop: 2 }}>Auto-send tonight at 8:00 PM</div>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: T.gray }}>Preview <ArrowRight size={13} /></span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- shell ---------------- */
export default function App() {
  const [tab, setTab] = useState("clients");
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [openClient, setOpenClient] = useState(null);
  const [adding, setAdding] = useState(false);

  const addClient = ({ name, phone, days, slot, done }) => {
    setClients((cs) => [...cs, { name, phone, days, slot, done, todayScheduled: false, history: [] }]);
    setAdding(false);
  };

  const logged = (name, note) => {
    setClients((cs) => cs.map((c) => c.name === name
      ? { ...c, done: note !== null ? c.done + 1 : c.done, todayStatus: "logged", history: note !== null ? [["Jul 10", note, "done"], ...c.history] : [["Jul 10", "No-show", "cancelled"], ...c.history] }
      : c));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#E9E9EC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FONT }}>
      <div style={{ position: "relative", width: 390, height: 800, background: "#FAFAFA", borderRadius: 44, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.30), 0 0 0 10px #111, 0 0 0 12px #3A3A3C" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 26px 0", fontSize: 14, fontWeight: 600, color: T.ink }}>
          <span style={NUM}>9:41</span><span style={{ letterSpacing: 1.5 }}>▪▪▪ ⏻</span>
        </div>

        <div style={{ position: "absolute", inset: "36px 0 0", overflowY: "auto" }}>
          {tab === "today" && <TrainerToday clients={clients} onOpenClient={(c) => { setOpenClient(c); setTab("clients"); }} />}
          {tab === "clients" && (openClient
            ? <ClientPage client={clients.find((c) => c.name === openClient.name) || openClient} onBack={() => setOpenClient(null)} onLogged={logged} />
            : <Clients clients={clients} onOpen={setOpenClient} onAdd={() => setAdding(true)} />)}
          {tab === "settings" && <TrainerSettings />}
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(250,250,250,0.94)", backdropFilter: "blur(20px)", borderTop: `1px solid ${T.border}`, display: "flex", padding: "8px 50px 22px", zIndex: 30 }}>
          {[["today", "Today", CalendarDays], ["clients", "Clients", Users], ["settings", "Settings", SettingsIcon]].map(([id, label, Icon]) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => { setTab(id); setOpenClient(null); }} style={{ flex: 1, border: "none", background: "none", cursor: "pointer", padding: "4px 0", fontFamily: FONT }}>
                <Icon size={22} color={active ? T.ink : T.faint} strokeWidth={active ? 2.4 : 2} style={{ display: "block", margin: "0 auto 3px" }} />
                <span style={{ fontSize: 10.5, fontWeight: 600, color: active ? T.ink : T.faint }}>{label}</span>
              </button>
            );
          })}
        </div>

        {adding && <AddClient onClose={() => setAdding(false)} onAdd={addClient} />}
      </div>
    </div>
  );
}
