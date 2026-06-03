import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://mhpmdlcdjvwglivzcgio.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocG1kbGNkanZ3Z2xpdnpjZ2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDAyMjksImV4cCI6MjA5MTk3NjIyOX0.sLLboYt0j9kizhErlhjhsHtZvGopl-h7vea-IFENQh0"
);

const COLORS = {
  bg: "#0D0D0D",
  surface: "#141414",
  card: "#1A1A1A",
  border: "#252525",
  accent: "#FFC988",
  accentDim: "#FFC98818",
  text: "#F0EDE8",
  muted: "#666",
  mutedLight: "#888",
  green: "#4ADE80",
  red: "#F87171",
  blue: "#60A5FA",
  purple: "#C084FC",
};

const STATUS_CONFIG = {
  New: { color: "#555", label: "Ny" },
  Contacted: { color: "#3B82F6", label: "Kontaktad" },
  Reply: { color: "#A78BFA", label: "Svar" },
  Meeting: { color: "#F59E0B", label: "Möte" },
  Proposal: { color: "#FFC988", label: "Offert" },
  Won: { color: "#4ADE80", label: "Vunnen" },
  Lost: { color: "#F87171", label: "Förlorad" },
};

const CHANNELS = ["Apollo", "LinkedIn", "Mail", "Telefon"];
const OWNERS = ["Markus", "Hannah", "Lucas"];
const STATUSES = Object.keys(STATUS_CONFIG);

const WEEKLY_TARGETS = {
  new_prospects: 20,
  contacts_sent: 15,
  followups: 20,
  meetings_booked: 3,
  proposals_sent: 2,
};

const METRIC_LABELS = {
  new_prospects: "Nya prospekt inlagda",
  contacts_sent: "Första kontakter skickade",
  followups: "Uppföljningar",
  meetings_booked: "Möten bokade",
  proposals_sent: "Offerter skickade",
};

const PLAYBOOK = [
  {
    day: "Måndag", emoji: "🎯", owner: "Alla", title: "Pulse-möte 15 min",
    tasks: [
      "Gå igenom Weekly Pulse — vad är vi på mot target?",
      "Markus + Hannah: vilka prospekt prioriteras denna vecka?",
      "Lucas: vilka kunder har upsell-potential just nu?",
      "Sätt nästa aktivitet på ALLT som saknar en.",
    ],
  },
  {
    day: "Tisdag–Onsdag", emoji: "📡", owner: "Markus + Hannah", title: "Prospektering",
    tasks: [
      "Hitta 10 nya bolag var (Apollo/LinkedIn) — lägg in i pipeline direkt.",
      "Skicka 7–8 första kontakter var (mail eller LinkedIn DM).",
      "Regel: inga generiska meddelanden — alltid en relevant hook.",
      "Uppdatera status i systemet samma dag.",
    ],
  },
  {
    day: "Tisdag–Torsdag", emoji: "🔄", owner: "Alla", title: "Uppföljningar",
    tasks: [
      "Öppna pipeline — filtrera på 'Nästa aktivitet = idag'.",
      "Följ upp alla leads som inte svarat inom 4 dagar.",
      "Max 3 uppföljningar per lead innan du byter kanal.",
      "Vid svar → boka möte direkt, föreslå 2 tider.",
    ],
  },
  {
    day: "Torsdag", emoji: "💼", owner: "Markus", title: "Offertvecka",
    tasks: [
      "Alla möten från veckan ska ha en tydlig next step.",
      "Skicka offert inom 24h från avslutat möte.",
      "Offert ska alltid ha ett förfallodatum (5 arbetsdagar).",
      "Följ upp offert dag 3 om inget svar.",
    ],
  },
  {
    day: "Fredag", emoji: "📊", owner: "Alla", title: "Pipeline-hygien",
    tasks: [
      "Uppdatera status på alla aktiva leads.",
      "Inget lead får ligga utan nästa aktivitet in i nästa vecka.",
      "Leads utan aktivitet i 5+ dagar → markera för granskning.",
      "Fyll i Weekly Pulse för veckan som gått.",
    ],
  },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function Tag({ children, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
      background: color + "22", color, border: `1px solid ${color}33`,
    }}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{
        width: 28, height: 28, border: `3px solid ${COLORS.border}`,
        borderTopColor: COLORS.accent, borderRadius: "50%",
        animation: "spin 0.7s linear infinite"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Toast({ message, type }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 2000,
      background: type === "error" ? COLORS.red : COLORS.green,
      color: "#000", padding: "10px 18px", borderRadius: 8,
      fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px #00000066",
      animation: "fadeIn 0.2s ease"
    }}>
      {message}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

function MetricBar({ value, target, label }) {
  const pct = Math.min((value / target) * 100, 100);
  const color = pct >= 100 ? COLORS.green : pct >= 60 ? COLORS.accent : COLORS.red;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: COLORS.mutedLight, fontSize: 12 }}>{label}</span>
        <span style={{ color, fontSize: 12, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
          {value} / {target}
        </span>
      </div>
      <div style={{ height: 4, background: COLORS.border, borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "#000000CC", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 12, padding: 28, width: "100%", maxWidth: 540,
        maxHeight: "88vh", overflowY: "auto"
      }}>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", options, placeholder }) {
  const style = {
    width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 6, padding: "8px 12px", color: COLORS.text, fontSize: 13,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", color: COLORS.muted, fontSize: 11, marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>}
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={style}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />
      )}
    </div>
  );
}

// ─── PIPELINE VIEW ──────────────────────────────────────────────────────────

function PipelineView({ showToast }) {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { company: "", contact_name: "", contact_title: "", channel: "LinkedIn", status: "New", next_action: "", next_action_date: "", owner: "Markus", deal_value: "", source: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("prospects").select("*").order("next_action_date", { ascending: true });
    if (error) { showToast("Kunde inte ladda prospects", "error"); }
    else setProspects(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = prospects.filter(p => {
    if (filter !== "All" && p.status !== filter) return false;
    if (ownerFilter !== "All" && p.owner !== ownerFilter) return false;
    return true;
  });

  const overdue = prospects.filter(p => p.next_action_date && p.next_action_date < today && !["Won", "Lost"].includes(p.status)).length;
  const totalPipeline = prospects.filter(p => !["Won", "Lost"].includes(p.status)).reduce((s, p) => s + (p.deal_value || 0), 0);

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p) => { setEditItem(p); setForm({ ...p, deal_value: p.deal_value || "" }); setShowModal(true); };

  const save = async () => {
    if (!form.company.trim()) return;
    setSaving(true);
    const payload = { ...form, deal_value: parseInt(form.deal_value) || 0, next_action_date: form.next_action_date || null };
    delete payload.id; delete payload.created_at; delete payload.updated_at;

    let error;
    if (editItem) {
      ({ error } = await supabase.schema("sales").from("prospects").update(payload).eq("id", editItem.id));
    } else {
      ({ error } = await supabase.schema("sales").from("prospects").insert(payload));
    }
    setSaving(false);
    if (error) { showToast("Kunde inte spara", "error"); return; }
    showToast(editItem ? "Lead uppdaterat ✓" : "Lead tillagt ✓", "success");
    setShowModal(false);
    load();
  };

  const remove = async (id) => {
    const { error } = await supabase.schema("sales").from("prospects").delete().eq("id", id);
    if (error) { showToast("Kunde inte ta bort", "error"); return; }
    showToast("Lead borttaget", "success");
    setProspects(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Aktiva leads", value: prospects.filter(p => !["Won","Lost"].includes(p.status)).length, color: COLORS.accent },
          { label: "Pipeline värde", value: `${(totalPipeline/1000).toFixed(0)}K SEK`, color: COLORS.blue },
          { label: "Möten", value: prospects.filter(p => p.status === "Meeting").length, color: COLORS.purple },
          { label: "Försenade", value: overdue, color: overdue > 0 ? COLORS.red : COLORS.green },
        ].map(s => (
          <div key={s.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filter === s ? COLORS.accent : COLORS.surface,
              color: filter === s ? "#000" : COLORS.muted,
            }}>
              {s === "All" ? "Alla" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["All", ...OWNERS].map(o => (
            <button key={o} onClick={() => setOwnerFilter(o)} style={{
              padding: "5px 12px", borderRadius: 20, border: `1px solid ${COLORS.border}`, cursor: "pointer", fontSize: 12,
              background: ownerFilter === o ? COLORS.surface : "transparent",
              color: ownerFilter === o ? COLORS.text : COLORS.muted,
            }}>
              {o === "All" ? "Alla" : o}
            </button>
          ))}
          <button onClick={openAdd} style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", background: COLORS.accent, color: "#000", fontSize: 12, fontWeight: 700 }}>
            + Nytt lead
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              {["Bolag", "Kontakt", "Kanal", "Status", "Nästa aktivitet", "Datum", "Ägare", "Värde", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: COLORS.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const isOverdue = p.next_action_date && p.next_action_date < today && !["Won","Lost"].includes(p.status);
              return (
                <tr key={p.id} onClick={() => openEdit(p)} style={{
                  borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer",
                  background: i % 2 === 0 ? "transparent" : "#ffffff03",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = COLORS.accentDim}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "#ffffff03"}
                >
                  <td style={{ padding: "10px 14px", color: COLORS.text, fontSize: 13, fontWeight: 600 }}>{p.company}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ color: COLORS.mutedLight, fontSize: 12 }}>{p.contact_name}</div>
                    <div style={{ color: COLORS.muted, fontSize: 10 }}>{p.contact_title}</div>
                  </td>
                  <td style={{ padding: "10px 14px" }}><Tag color={COLORS.blue}>{p.channel}</Tag></td>
                  <td style={{ padding: "10px 14px" }}><Tag color={STATUS_CONFIG[p.status]?.color}>{STATUS_CONFIG[p.status]?.label}</Tag></td>
                  <td style={{ padding: "10px 14px", color: COLORS.mutedLight, fontSize: 12, maxWidth: 160 }}>{p.next_action}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "DM Mono, monospace", color: isOverdue ? COLORS.red : COLORS.mutedLight, whiteSpace: "nowrap" }}>
                    {p.next_action_date || "—"}{isOverdue && " ⚠"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <Tag color={p.owner === "Markus" ? COLORS.accent : p.owner === "Hannah" ? COLORS.purple : COLORS.green}>{p.owner}</Tag>
                  </td>
                  <td style={{ padding: "10px 14px", color: COLORS.text, fontSize: 12, fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>
                    {p.deal_value ? `${(p.deal_value/1000).toFixed(0)}K` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={e => { e.stopPropagation(); remove(p.id); }} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>
            {prospects.length === 0 ? "Inga leads ännu — lägg till ditt första" : "Inga leads matchar filtret"}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h3 style={{ color: COLORS.text, margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
          {editItem ? "Redigera lead" : "Nytt lead"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="Bolag *" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} />
          <Input label="Kontaktperson" value={form.contact_name} onChange={v => setForm(f => ({ ...f, contact_name: v }))} />
          <Input label="Titel" value={form.contact_title} onChange={v => setForm(f => ({ ...f, contact_title: v }))} />
          <Input label="Kanal" value={form.channel} onChange={v => setForm(f => ({ ...f, channel: v }))} options={CHANNELS} />
          <Input label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUSES} />
          <Input label="Ägare" value={form.owner} onChange={v => setForm(f => ({ ...f, owner: v }))} options={OWNERS} />
          <Input label="Nästa aktivitet" value={form.next_action} onChange={v => setForm(f => ({ ...f, next_action: v }))} />
          <Input label="Datum" value={form.next_action_date} onChange={v => setForm(f => ({ ...f, next_action_date: v }))} type="date" />
          <Input label="Deal-värde (SEK)" value={form.deal_value} onChange={v => setForm(f => ({ ...f, deal_value: v }))} type="number" />
          <Input label="Källa" value={form.source} onChange={v => setForm(f => ({ ...f, source: v }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: COLORS.muted, fontSize: 11, marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>Anteckningar</label>
          <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{
            width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 6, padding: "8px 12px", color: COLORS.text, fontSize: 13,
            fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 70, boxSizing: "border-box"
          }} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setShowModal(false)} style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13 }}>Avbryt</button>
          <button onClick={save} disabled={saving} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: COLORS.accent, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── ACCOUNTS VIEW ───────────────────────────────────────────────────────────

function AccountsView({ showToast }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { company: "", contact_name: "", current_mrr: "", upsell_potential: "", last_contact: "", status: "Active", next_action: "", next_action_date: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.schema("sales").from("accounts").select("*").order("status").order("company");
    if (error) showToast("Kunde inte ladda kunder", "error");
    else setAccounts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalMRR = accounts.reduce((s, a) => s + (a.current_mrr || 0), 0);
  const totalUpsell = accounts.reduce((s, a) => s + (a.upsell_potential || 0), 0);

  const openEdit = (a) => { setEditItem(a); setForm({ ...a, current_mrr: a.current_mrr || "", upsell_potential: a.upsell_potential || "" }); setShowModal(true); };
  const openAdd = () => { setEditItem(null); setForm(emptyForm); setShowModal(true); };

  const save = async () => {
    if (!form.company.trim()) return;
    setSaving(true);
    const payload = { ...form, current_mrr: parseInt(form.current_mrr) || 0, upsell_potential: parseInt(form.upsell_potential) || 0, last_contact: form.last_contact || null, next_action_date: form.next_action_date || null };
    delete payload.id; delete payload.created_at; delete payload.updated_at;

    let error;
    if (editItem) {
      ({ error } = await supabase.schema("sales").from("accounts").update(payload).eq("id", editItem.id));
    } else {
      ({ error } = await supabase.schema("sales").from("accounts").insert(payload));
    }
    setSaving(false);
    if (error) { showToast("Kunde inte spara", "error"); return; }
    showToast(editItem ? "Kund uppdaterad ✓" : "Kund tillagd ✓", "success");
    setShowModal(false);
    load();
  };

  const remove = async (id) => {
    const { error } = await supabase.schema("sales").from("accounts").delete().eq("id", id);
    if (error) { showToast("Kunde inte ta bort", "error"); return; }
    showToast("Kund borttagen", "success");
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total MRR", value: `${(totalMRR/1000).toFixed(0)}K SEK/mån`, color: COLORS.green },
          { label: "Upsell-potential", value: `${(totalUpsell/1000).toFixed(0)}K SEK/mån`, color: COLORS.accent },
          { label: "Aktiva kunder", value: accounts.filter(a => a.status === "Active").length, color: COLORS.blue },
        ].map(s => (
          <div key={s.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={openAdd} style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", background: COLORS.accent, color: "#000", fontSize: 12, fontWeight: 700 }}>
          + Ny kund
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {accounts.map(a => (
          <div key={a.id} onClick={() => openEdit(a)} style={{
            background: COLORS.card, border: `1px solid ${a.status === "At Risk" ? COLORS.red + "44" : COLORS.border}`,
            borderRadius: 10, padding: "16px 20px", cursor: "pointer", position: "relative"
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "66"}
            onMouseLeave={e => e.currentTarget.style.borderColor = a.status === "At Risk" ? COLORS.red + "44" : COLORS.border}
          >
            <button onClick={e => { e.stopPropagation(); remove(a.id); }} style={{
              position: "absolute", top: 12, right: 12, background: "none", border: "none",
              color: COLORS.muted, cursor: "pointer", fontSize: 18, lineHeight: 1
            }}>×</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 15 }}>{a.company}</span>
                  <Tag color={a.status === "At Risk" ? COLORS.red : a.status === "Churned" ? COLORS.muted : COLORS.green}>
                    {a.status === "At Risk" ? "Risk" : a.status === "Churned" ? "Churnad" : "Aktiv"}
                  </Tag>
                </div>
                <div style={{ color: COLORS.muted, fontSize: 12 }}>{a.contact_name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: COLORS.green, fontSize: 16, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
                  {(a.current_mrr/1000).toFixed(0)}K/mån
                </div>
                <div style={{ color: COLORS.muted, fontSize: 11 }}>+{(a.upsell_potential/1000).toFixed(0)}K potential</div>
              </div>
            </div>
            {a.next_action && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: COLORS.mutedLight, fontSize: 12 }}>→ {a.next_action}</span>
                <span style={{ color: COLORS.muted, fontSize: 11, fontFamily: "DM Mono, monospace" }}>{a.next_action_date || ""}</span>
              </div>
            )}
          </div>
        ))}
        {accounts.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>Inga kunder ännu</div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h3 style={{ color: COLORS.text, margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
          {editItem ? "Redigera kund" : "Ny kund"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="Bolag *" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} />
          <Input label="Kontaktperson" value={form.contact_name} onChange={v => setForm(f => ({ ...f, contact_name: v }))} />
          <Input label="MRR (SEK/mån)" value={form.current_mrr} onChange={v => setForm(f => ({ ...f, current_mrr: v }))} type="number" />
          <Input label="Upsell-potential (SEK/mån)" value={form.upsell_potential} onChange={v => setForm(f => ({ ...f, upsell_potential: v }))} type="number" />
          <Input label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={["Active", "At Risk", "Churned"]} />
          <Input label="Senaste kontakt" value={form.last_contact} onChange={v => setForm(f => ({ ...f, last_contact: v }))} type="date" />
          <Input label="Nästa aktivitet" value={form.next_action} onChange={v => setForm(f => ({ ...f, next_action: v }))} />
          <Input label="Datum" value={form.next_action_date} onChange={v => setForm(f => ({ ...f, next_action_date: v }))} type="date" />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={() => setShowModal(false)} style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13 }}>Avbryt</button>
          <button onClick={save} disabled={saving} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: COLORS.accent, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── PULSE VIEW ──────────────────────────────────────────────────────────────

function PulseView({ showToast }) {
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const weekStart = getWeekStart();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.schema("sales").from("weekly_pulse").select("*").eq("week_start", weekStart).eq("owner", "Team").maybeSingle();
    setPulse(data || { new_prospects: 0, contacts_sent: 0, followups: 0, meetings_booked: 0, proposals_sent: 0 });
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    const payload = { ...draft, week_start: weekStart, owner: "Team" };
    const existing = pulse?.id;
    let error;
    if (existing) {
      ({ error } = await supabase.schema("sales").from("weekly_pulse").update(payload).eq("id", existing));
    } else {
      ({ error } = await supabase.schema("sales").from("weekly_pulse").insert(payload));
    }
    setSaving(false);
    if (error) { showToast("Kunde inte spara puls", "error"); return; }
    showToast("Veckopuls sparad ✓", "success");
    setEditing(false);
    load();
  };

  if (loading) return <Spinner />;

  const totalScore = Object.keys(WEEKLY_TARGETS).reduce((score, key) => score + Math.min((pulse[key] || 0) / WEEKLY_TARGETS[key], 1), 0);
  const healthPct = Math.round((totalScore / Object.keys(WEEKLY_TARGETS).length) * 100);
  const healthColor = healthPct >= 80 ? COLORS.green : healthPct >= 50 ? COLORS.accent : COLORS.red;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div>
        {/* Weekly pulse card */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ color: COLORS.text, margin: 0, fontSize: 15, fontWeight: 700 }}>Veckopuls</h3>
              <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>{weekStart}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: healthColor, fontSize: 28, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{healthPct}%</div>
              <div style={{ color: COLORS.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>hälsa</div>
            </div>
          </div>
          {Object.keys(WEEKLY_TARGETS).map(key => (
            <MetricBar key={key} label={METRIC_LABELS[key]} value={pulse[key] || 0} target={WEEKLY_TARGETS[key]} />
          ))}
          <button onClick={() => { setDraft({ ...pulse }); setEditing(true); }} style={{
            marginTop: 8, padding: "8px 16px", borderRadius: 6, border: `1px solid ${COLORS.border}`,
            background: "none", color: COLORS.mutedLight, cursor: "pointer", fontSize: 12, width: "100%"
          }}>
            Uppdatera veckosiffror
          </button>
        </div>

        {/* MRR progress */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24 }}>
          <h3 style={{ color: COLORS.text, margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>MRR-progress mot mål</h3>
          {[
            { label: "Nu (baseline)", value: 340, max: 1250 },
            { label: "Mål Dec 2026", value: 1250, max: 1250 },
          ].map(m => (
            <div key={m.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: COLORS.mutedLight, fontSize: 12 }}>{m.label}</span>
                <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{m.value}K SEK/mån</span>
              </div>
              <div style={{ height: 6, background: COLORS.border, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${(m.value/m.max)*100}%`, background: COLORS.accent, borderRadius: 3 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "12px 16px", background: COLORS.accentDim, borderRadius: 8, border: `1px solid ${COLORS.accent}33` }}>
            <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 2 }}>Gap att stänga</div>
            <div style={{ color: COLORS.accent, fontSize: 20, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>910K SEK/mån</div>
            <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>≈ 9–10 nya avtal á 100K SEK/mån</div>
          </div>
        </div>
      </div>

      {/* Playbook */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24 }}>
        <h3 style={{ color: COLORS.text, margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>Veckoplaybook</h3>
        {PLAYBOOK.map((day, i) => (
          <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < PLAYBOOK.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{day.emoji}</span>
              <div>
                <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 13 }}>{day.day}</div>
                <div style={{ color: COLORS.muted, fontSize: 11 }}>{day.owner} · {day.title}</div>
              </div>
            </div>
            {day.tasks.map((t, j) => (
              <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
                <span style={{ color: COLORS.accent, fontSize: 10, marginTop: 3, flexShrink: 0 }}>▸</span>
                <span style={{ color: COLORS.mutedLight, fontSize: 12, lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)}>
        <h3 style={{ color: COLORS.text, margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Uppdatera veckopuls</h3>
        {Object.keys(WEEKLY_TARGETS).map(key => (
          <Input key={key} label={`${METRIC_LABELS[key]} (mål: ${WEEKLY_TARGETS[key]})`} value={draft[key] || ""} onChange={v => setDraft(d => ({ ...d, [key]: parseInt(v) || 0 }))} type="number" />
        ))}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setEditing(false)} style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13 }}>Avbryt</button>
          <button onClick={save} disabled={saving} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: COLORS.accent, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── PROSPECTING AI VIEW ─────────────────────────────────────────────────────

const ICP = {
  beskrivning: "Svenska tillväxtbolag inom tech, SaaS, e-handel eller fintech. 10–150 anställda. Inte ett renodlat techbolag internt — behöver en extern techpartner. Beslutsfattare: VD, CTO eller Head of Product.",
  branscher: ["SaaS", "E-handel", "Fintech", "Proptech", "Healthtech", "Cleantech", "B2B-tjänster"],
  storlek: "10–150 anställda",
  geografi: "Sverige (primärt Stockholm, Göteborg, Malmö)",
  exkludera: "Rena konsultbolag, myndigheter, bolag med egen stor IT-avdelning",
};

function ProspectingView({ showToast }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [bransch, setBransch] = useState("SaaS");
  const [ort, setOrt] = useState("Stockholm");
  const [storlek, setStorlek] = useState("10–50");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [todayLeads, setTodayLeads] = useState([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("mail");
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [addingToDb, setAddingToDb] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  // Load today's contacts from Supabase
  useEffect(() => {
    const load = async () => {
      setLoadingToday(true);
      const { data } = await supabase
        .schema("sales")
        .from("prospects")
        .select("*")
        .lte("next_action_date", today)
        .not("status", "in", '("Won","Lost")')
        .order("next_action_date", { ascending: true })
        .limit(10);
      setTodayLeads(data || []);
      setLoadingToday(false);
    };
    load();
  }, []);

  const searchProspects = async () => {
    if (!searchQuery.trim() && !bransch) return;
    setSearching(true);
    setResults([]);
    setSelectedProspect(null);
    setMessage("");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Du är ett prospekteringsverktyg för We Know IT, ett svenskt techkonsultbolag. 
Generera alltid svar som ett JSON-objekt med ett fält "prospects" som är en array.
Varje prospect ska ha: company, contact_name, contact_title, city, employees, industry, why_good_fit, linkedin_hint, channel.
Svara ENDAST med JSON, inga förklaringar, ingen markdown.`,
          messages: [{
            role: "user",
            content: `Generera 6 realistiska svenska tillväxtbolag som matchar detta ICP:
- Bransch: ${bransch}
- Ort: ${ort}  
- Storlek: ${storlek} anställda
- Sökning: "${searchQuery || "generell sökning"}"
- ICP: ${ICP.beskrivning}

Hitta på realistiska svenska bolagsnamn och kontaktpersoner (svenska namn).
Förklara kort varför varje bolag är ett bra prospekt för We Know IT (techpartner för tillväxtbolag).`
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResults(parsed.prospects || []);
    } catch (e) {
      showToast("Kunde inte hämta prospekt", "error");
    }
    setSearching(false);
  };

  const generateMessage = async (prospect) => {
    setSelectedProspect(prospect);
    setMessage("");
    setGeneratingMsg(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Du skriver säljmeddelanden på svenska åt Markus Noaksson, VD på We Know IT.
We Know IT är ett techkonsultbolag med 26 anställda och kontor i Stockholm, Göteborg, Linköping, Lund och Umeå.
Vi positionerar oss som "techpartner för tillväxtbolag" — vi hjälper växande bolag bygga och driva sin digitala produkt.
Ton: Direkt, professionell men mänsklig. Ingen säljjargong. Kort och konkret.
Svara ENDAST med meddelandet, ingen förklaring eller etikett innan.`,
          messages: [{
            role: "user",
            content: `Skriv ett ${messageType === "mail" ? "kallt säljmail" : "LinkedIn DM"} till:
Bolag: ${prospect.company}
Kontakt: ${prospect.contact_name}, ${prospect.contact_title}
Bransch: ${prospect.industry}
Varför passar de: ${prospect.why_good_fit}

${messageType === "mail" ? "Inkludera ämnesrad (Ämne: ...) och ett kort mail på max 5 meningar." : "Max 3 meningar, LinkedIn-ton, ingen ämnesrad."}`
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      setMessage(text);
    } catch (e) {
      showToast("Kunde inte generera meddelande", "error");
    }
    setGeneratingMsg(false);
  };

  const addToProspects = async (prospect) => {
    setAddingToDb(prospect.company);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { error } = await supabase.schema("sales").from("prospects").insert({
      company: prospect.company,
      contact_name: prospect.contact_name,
      contact_title: prospect.contact_title,
      channel: prospect.channel || "LinkedIn",
      status: "New",
      next_action: "Skicka första kontakt",
      next_action_date: tomorrow.toISOString().split("T")[0],
      owner: "Markus",
      source: "AI-prospektering",
    });
    setAddingToDb(null);
    if (error) { showToast("Kunde inte lägga till", "error"); return; }
    showToast(`${prospect.company} tillagt i pipeline ✓`, "success");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

      {/* LEFT — Search + Results */}
      <div>
        {/* Search card */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24, marginBottom: 16 }}>
          <h3 style={{ color: COLORS.text, margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>🔍 Hitta prospekt</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: COLORS.muted, fontSize: 11, marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>Fritext</label>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchProspects()}
              placeholder="t.ex. e-handelsbolag som växer snabbt..."
              style={{
                width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: 6, padding: "8px 12px", color: COLORS.text, fontSize: 13,
                fontFamily: "inherit", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Bransch", value: bransch, set: setBransch, options: ICP.branscher },
              { label: "Ort", value: ort, set: setOrt, options: ["Stockholm", "Göteborg", "Malmö", "Linköping", "Uppsala", "Sverige"] },
              { label: "Storlek", value: storlek, set: setStorlek, options: ["1–10", "10–50", "50–150", "150+"] },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", color: COLORS.muted, fontSize: 11, marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>{f.label}</label>
                <select value={f.value} onChange={e => f.set(e.target.value)} style={{
                  width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                  borderRadius: 6, padding: "7px 10px", color: COLORS.text, fontSize: 12,
                  fontFamily: "inherit", outline: "none"
                }}>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <button onClick={searchProspects} disabled={searching} style={{
            width: "100%", padding: "10px", borderRadius: 6, border: "none",
            background: searching ? COLORS.border : COLORS.accent,
            color: searching ? COLORS.muted : "#000",
            fontWeight: 700, fontSize: 13, cursor: searching ? "not-allowed" : "pointer",
            fontFamily: "inherit", transition: "background 0.15s"
          }}>
            {searching ? "Söker..." : "Generera prospektlista"}
          </button>
        </div>

        {/* Results */}
        {searching && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 40, textAlign: "center" }}>
            <div style={{ color: COLORS.accent, fontSize: 13, marginBottom: 8 }}>Analyserar ICP och genererar leads...</div>
            <Spinner />
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map((p, i) => (
              <div key={i} style={{
                background: COLORS.card, border: `1px solid ${selectedProspect?.company === p.company ? COLORS.accent + "66" : COLORS.border}`,
                borderRadius: 10, padding: "14px 16px", cursor: "pointer",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "44"}
                onMouseLeave={e => e.currentTarget.style.borderColor = selectedProspect?.company === p.company ? COLORS.accent + "66" : COLORS.border}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 14 }}>{p.company}</div>
                    <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 1 }}>{p.contact_name} · {p.contact_title}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <button onClick={() => generateMessage(p)} style={{
                      padding: "5px 10px", borderRadius: 5, border: `1px solid ${COLORS.accent}44`,
                      background: COLORS.accentDim, color: COLORS.accent, fontSize: 11, fontWeight: 600,
                      cursor: "pointer", whiteSpace: "nowrap"
                    }}>
                      ✍️ Skriv meddelande
                    </button>
                    <button onClick={() => addToProspects(p)} disabled={addingToDb === p.company} style={{
                      padding: "5px 10px", borderRadius: 5, border: "none",
                      background: addingToDb === p.company ? COLORS.border : COLORS.green + "22",
                      color: addingToDb === p.company ? COLORS.muted : COLORS.green,
                      fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
                    }}>
                      {addingToDb === p.company ? "..." : "+ Pipeline"}
                    </button>
                  </div>
                </div>
                <div style={{ color: COLORS.mutedLight, fontSize: 11, lineHeight: 1.5 }}>
                  {p.city} · {p.employees} anst. · {p.industry}
                </div>
                <div style={{ marginTop: 6, color: COLORS.muted, fontSize: 11, fontStyle: "italic", lineHeight: 1.4 }}>
                  {p.why_good_fit}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT — Today's contacts + Message */}
      <div>
        {/* Today's contacts */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24, marginBottom: 16 }}>
          <h3 style={{ color: COLORS.text, margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>📅 Dagens kontakter</h3>
          <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 16 }}>{today} — leads med aktivitet idag eller försenade</div>

          {loadingToday ? <Spinner /> : todayLeads.length === 0 ? (
            <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              Inga leads att kontakta idag 🎉
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayLeads.map(lead => {
                const isOverdue = lead.next_action_date < today;
                return (
                  <div key={lead.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", background: COLORS.surface,
                    border: `1px solid ${isOverdue ? COLORS.red + "33" : COLORS.border}`,
                    borderRadius: 8
                  }}>
                    <div>
                      <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 13 }}>{lead.company}</div>
                      <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>{lead.next_action}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: isOverdue ? COLORS.red : COLORS.mutedLight, fontSize: 11, fontFamily: "DM Mono, monospace" }}>
                        {isOverdue ? "⚠ försenad" : "idag"}
                      </span>
                      <button onClick={() => generateMessage({ company: lead.company, contact_name: lead.contact_name, contact_title: lead.contact_title, industry: "—", why_good_fit: lead.notes || "Befintligt prospekt i pipeline" })} style={{
                        padding: "4px 10px", borderRadius: 5, border: `1px solid ${COLORS.accent}44`,
                        background: COLORS.accentDim, color: COLORS.accent, fontSize: 11,
                        fontWeight: 600, cursor: "pointer"
                      }}>
                        ✍️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Message generator */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: COLORS.text, margin: 0, fontSize: 15, fontWeight: 700 }}>
              ✍️ {selectedProspect ? `Meddelande till ${selectedProspect.company}` : "AI-meddelande"}
            </h3>
            <div style={{ display: "flex", gap: 6 }}>
              {["mail", "linkedin"].map(t => (
                <button key={t} onClick={() => { setMessageType(t); if (selectedProspect) generateMessage(selectedProspect); }} style={{
                  padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 600,
                  background: messageType === t ? COLORS.accent : COLORS.surface,
                  color: messageType === t ? "#000" : COLORS.muted,
                }}>
                  {t === "mail" ? "📧 Mail" : "💼 LinkedIn"}
                </button>
              ))}
            </div>
          </div>

          {!selectedProspect && !generatingMsg && (
            <div style={{ color: COLORS.muted, fontSize: 12, textAlign: "center", padding: "30px 0", lineHeight: 1.6 }}>
              Klicka på "Skriv meddelande" på ett prospekt<br />eller en lead från dagens kontakter
            </div>
          )}

          {generatingMsg && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ color: COLORS.accent, fontSize: 12, marginBottom: 12 }}>Genererar meddelande...</div>
              <Spinner />
            </div>
          )}

          {message && !generatingMsg && (
            <>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                  borderRadius: 8, padding: "12px 14px", color: COLORS.text, fontSize: 12,
                  fontFamily: "inherit", outline: "none", resize: "vertical",
                  minHeight: 200, lineHeight: 1.6, boxSizing: "border-box"
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => { navigator.clipboard.writeText(message); showToast("Kopierat ✓", "success"); }} style={{
                  flex: 1, padding: "8px", borderRadius: 6, border: `1px solid ${COLORS.border}`,
                  background: "none", color: COLORS.mutedLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit"
                }}>
                  📋 Kopiera
                </button>
                <button onClick={() => generateMessage(selectedProspect)} style={{
                  flex: 1, padding: "8px", borderRadius: 6, border: `1px solid ${COLORS.accent}44`,
                  background: COLORS.accentDim, color: COLORS.accent, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit"
                }}>
                  🔄 Regenerera
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APP SHELL ───────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("pipeline");
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3000);
  };

  const NAV = [
    { id: "prospecting", label: "Hitta leads", emoji: "🔍" },
    { id: "pipeline", label: "Prospektering", emoji: "📡" },
    { id: "accounts", label: "Befintliga kunder", emoji: "🤝" },
    { id: "pulse", label: "Pulse & Playbook", emoji: "📊" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
        select option { background: #1A1A1A; color: #F0EDE8; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
      `}</style>

      {/* Nav */}
      <div style={{
        borderBottom: `1px solid ${COLORS.border}`, padding: "0 28px",
        display: "flex", alignItems: "center", height: 54,
        position: "sticky", top: 0, background: COLORS.bg, zIndex: 100
      }}>
        <div style={{ marginRight: 32 }}>
          <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>WKIT</span>
          <span style={{ color: COLORS.muted, fontWeight: 400, fontSize: 13, marginLeft: 6 }}>Sales Engine</span>
        </div>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{
            padding: "0 18px", height: 54, border: "none", background: "none", cursor: "pointer",
            color: view === n.id ? COLORS.accent : COLORS.muted,
            borderBottom: view === n.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            fontSize: 13, fontWeight: view === n.id ? 700 : 400, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 7, transition: "color 0.15s"
          }}>
            <span>{n.emoji}</span>{n.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 8px ${COLORS.green}88` }} />
          <span style={{ color: COLORS.muted, fontSize: 11, fontFamily: "DM Mono, monospace" }}>Supabase live</span>
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
        {view === "prospecting" && <ProspectingView showToast={showToast} />}
        {view === "pipeline" && <PipelineView showToast={showToast} />}
        {view === "accounts" && <AccountsView showToast={showToast} />}
        {view === "pulse" && <PulseView showToast={showToast} />}
      </div>

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}
