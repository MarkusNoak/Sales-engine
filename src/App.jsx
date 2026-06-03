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

const ICP = {
  beskrivning: "Svenska tillväxtbolag inom tech, SaaS, e-handel eller fintech. 10–150 anställda. Inte ett renodlat techbolag internt — behöver en extern techpartner. Beslutsfattare: VD, CTO eller Head of Product.",
  branscher: ["SaaS", "E-handel", "Fintech", "Proptech", "Healthtech", "Cleantech", "B2B-tjänster"],
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function exportCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── UI COMPONENTS ──────────────────────────────────────────────────────────

function Tag({ children, color, onClick, style = {} }) {
  return (
    <span onClick={onClick} style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
      background: color + "22", color, border: `1px solid ${color}33`,
      cursor: onClick ? "pointer" : "default",
      ...style,
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
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "#000000CC", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 12, padding: 28, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto"
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

// ─── PROSPECT FORM MODAL ─────────────────────────────────────────────────────

function ProspectModal({ isOpen, onClose, editItem, onSaved, showToast }) {
  const emptyForm = {
    company: "", contact_name: "", contact_title: "", contact_email: "",
    contact_phone: "", channel: "LinkedIn", status: "New", next_action: "",
    next_action_date: "", owner: "Markus", deal_value: "", source: "", notes: ""
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editItem ? { ...editItem, deal_value: editItem.deal_value || "" } : emptyForm);
  }, [editItem, isOpen]);

  const save = async () => {
    if (!form.company.trim()) return;
    setSaving(true);
    const payload = { ...form, deal_value: parseInt(form.deal_value) || 0, next_action_date: form.next_action_date || null };
    delete payload.id; delete payload.created_at; delete payload.updated_at;

    let error;
    if (editItem) {
      ({ error } = await supabase.from("sales_prospects").update(payload).eq("id", editItem.id));
    } else {
      ({ error } = await supabase.from("sales_prospects").insert(payload));
    }
    setSaving(false);
    if (error) { showToast("Kunde inte spara: " + error.message, "error"); return; }
    showToast(editItem ? "Lead uppdaterat ✓" : "Lead tillagt ✓", "success");
    onClose();
    onSaved();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h3 style={{ color: COLORS.text, margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
        {editItem ? "Redigera lead" : "Nytt lead"}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Bolag *" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} />
        <Input label="Kontaktperson" value={form.contact_name} onChange={v => setForm(f => ({ ...f, contact_name: v }))} />
        <Input label="Titel" value={form.contact_title} onChange={v => setForm(f => ({ ...f, contact_title: v }))} />
        <Input label="E-post" value={form.contact_email} onChange={v => setForm(f => ({ ...f, contact_email: v }))} placeholder="namn@bolag.se" />
        <Input label="Telefon" value={form.contact_phone} onChange={v => setForm(f => ({ ...f, contact_phone: v }))} placeholder="+46 70 000 00 00" />
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
        <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13 }}>Avbryt</button>
        <button onClick={save} disabled={saving} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: COLORS.accent, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Sparar..." : "Spara"}
        </button>
      </div>
    </Modal>
  );
}

// ─── ACTIVITY LOG HELPERS ────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { id: "email", label: "Mail", icon: "📧" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
  { id: "call", label: "Samtal", icon: "📞" },
  { id: "meeting", label: "Möte", icon: "🤝" },
  { id: "note", label: "Notering", icon: "📝" },
];

// ─── LEAD DETAIL MODAL ───────────────────────────────────────────────────────

function LeadDetailModal({ isOpen, onClose, prospect, onSaved, showToast }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingAct, setLoadingAct] = useState(false);
  const [actType, setActType] = useState("email");
  const [actDesc, setActDesc] = useState("");
  const [actOwner, setActOwner] = useState("Markus");
  const [addingAct, setAddingAct] = useState(false);

  useEffect(() => {
    if (!isOpen) { setEditing(false); setActDesc(""); return; }
    setForm(prospect ? { ...prospect, deal_value: prospect.deal_value || "" } : {});
    if (prospect?.id) loadActivities(prospect.id);
  }, [isOpen, prospect]);

  const loadActivities = async (id) => {
    setLoadingAct(true);
    const { data } = await supabase.from("sales_activities").select("*").eq("prospect_id", id).order("created_at", { ascending: false });
    setActivities(data || []);
    setLoadingAct(false);
  };

  const save = async () => {
    if (!form.company?.trim()) return;
    setSaving(true);
    const payload = { ...form, deal_value: parseInt(form.deal_value) || 0, next_action_date: form.next_action_date || null };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = await supabase.from("sales_prospects").update(payload).eq("id", prospect.id);
    setSaving(false);
    if (error) { showToast("Kunde inte spara: " + error.message, "error"); return; }
    showToast("Sparat ✓", "success");
    setEditing(false);
    onSaved();
  };

  const addActivity = async () => {
    if (!actDesc.trim()) return;
    setAddingAct(true);
    const { error } = await supabase.from("sales_activities").insert({
      prospect_id: prospect.id, type: actType, description: actDesc, owner: actOwner,
    });
    setAddingAct(false);
    if (error) { showToast("Kunde inte logga aktivitet", "error"); return; }
    setActDesc("");
    loadActivities(prospect.id);
    showToast("Aktivitet loggad ✓", "success");
  };

  const deleteActivity = async (id) => {
    await supabase.from("sales_activities").delete().eq("id", id);
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const quickStatus = async (newStatus) => {
    await supabase.from("sales_prospects").update({ status: newStatus }).eq("id", prospect.id);
    setForm(f => ({ ...f, status: newStatus }));
    onSaved();
    showToast(`Status → ${STATUS_CONFIG[newStatus].label} ✓`, "success");
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !prospect) return null;

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = form.next_action_date && form.next_action_date < today && !["Won", "Lost"].includes(form.status);
  const statusColor = STATUS_CONFIG[form.status]?.color || COLORS.muted;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, width: "100%", maxWidth: 860, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ color: COLORS.text, fontSize: 18, fontWeight: 700 }}>{form.company}</span>
              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: statusColor + "22", color: statusColor, border: `1px solid ${statusColor}33` }}>{STATUS_CONFIG[form.status]?.label}</span>
              {isOverdue && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: COLORS.red + "22", color: COLORS.red }}>⚠ Försenad</span>}
            </div>
            {form.contact_name && <div style={{ color: COLORS.muted, fontSize: 13 }}>{form.contact_name}{form.contact_title ? ` · ${form.contact_title}` : ""}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setEditing(e => !e)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: editing ? COLORS.accent : "none", color: editing ? "#000" : COLORS.muted, fontSize: 12, cursor: "pointer", fontWeight: editing ? 700 : 400 }}>
              {editing ? "Avbryt" : "✎ Redigera"}
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body — two columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, overflow: "hidden" }}>

          {/* LEFT: info */}
          <div style={{ padding: 24, overflowY: "auto", borderRight: `1px solid ${COLORS.border}` }}>
            {editing ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <Input label="Bolag *" value={form.company || ""} onChange={v => setForm(f => ({ ...f, company: v }))} />
                  <Input label="Kontaktperson" value={form.contact_name || ""} onChange={v => setForm(f => ({ ...f, contact_name: v }))} />
                  <Input label="Titel" value={form.contact_title || ""} onChange={v => setForm(f => ({ ...f, contact_title: v }))} />
                  <Input label="E-post" value={form.contact_email || ""} onChange={v => setForm(f => ({ ...f, contact_email: v }))} placeholder="namn@bolag.se" />
                  <Input label="Telefon" value={form.contact_phone || ""} onChange={v => setForm(f => ({ ...f, contact_phone: v }))} placeholder="+46 70 000 00 00" />
                  <Input label="Kanal" value={form.channel || "LinkedIn"} onChange={v => setForm(f => ({ ...f, channel: v }))} options={CHANNELS} />
                  <Input label="Status" value={form.status || "New"} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUSES} />
                  <Input label="Ägare" value={form.owner || "Markus"} onChange={v => setForm(f => ({ ...f, owner: v }))} options={OWNERS} />
                  <Input label="Nästa aktivitet" value={form.next_action || ""} onChange={v => setForm(f => ({ ...f, next_action: v }))} />
                  <Input label="Datum" value={form.next_action_date || ""} onChange={v => setForm(f => ({ ...f, next_action_date: v }))} type="date" />
                  <Input label="Deal-värde (SEK)" value={form.deal_value || ""} onChange={v => setForm(f => ({ ...f, deal_value: v }))} type="number" />
                  <Input label="Källa" value={form.source || ""} onChange={v => setForm(f => ({ ...f, source: v }))} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", color: COLORS.muted, fontSize: 11, marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>Anteckningar</label>
                  <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 12px", color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 60, boxSizing: "border-box" }} />
                </div>
                <button onClick={save} disabled={saving} style={{ width: "100%", padding: "10px", borderRadius: 6, border: "none", background: COLORS.accent, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Sparar..." : "Spara ändringar"}
                </button>
              </>
            ) : (
              <>
                {/* Contact info */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Kontaktuppgifter</div>
                  {form.contact_email && (
                    <a href={`mailto:${form.contact_email}`} style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.blue, fontSize: 13, textDecoration: "none", marginBottom: 6 }}>
                      <span>📧</span>{form.contact_email}
                    </a>
                  )}
                  {form.contact_phone && (
                    <a href={`tel:${form.contact_phone}`} style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.mutedLight, fontSize: 13, textDecoration: "none", marginBottom: 6 }}>
                      <span>📞</span>{form.contact_phone}
                    </a>
                  )}
                  {!form.contact_email && !form.contact_phone && <span style={{ color: COLORS.muted, fontSize: 13 }}>Inga kontaktuppgifter — klicka Redigera</span>}
                </div>

                {/* Pipeline info */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Pipeline</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Kanal", value: form.channel },
                      { label: "Ägare", value: form.owner },
                      { label: "Deal-värde", value: form.deal_value ? `${(form.deal_value / 1000).toFixed(0)}K SEK` : "—" },
                      { label: "Källa", value: form.source || "—" },
                    ].map(r => (
                      <div key={r.label} style={{ background: COLORS.surface, borderRadius: 6, padding: "8px 12px" }}>
                        <div style={{ color: COLORS.muted, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
                        <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 600 }}>{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next action */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Nästa aktivitet</div>
                  <div style={{ background: COLORS.surface, borderRadius: 6, padding: "10px 14px" }}>
                    <div style={{ color: isOverdue ? COLORS.red : COLORS.text, fontSize: 13, fontWeight: 600 }}>{form.next_action || "Ej satt"}</div>
                    {form.next_action_date && <div style={{ color: isOverdue ? COLORS.red : COLORS.muted, fontSize: 12, marginTop: 2 }}>{form.next_action_date}{isOverdue ? " — Försenad!" : ""}</div>}
                  </div>
                </div>

                {/* Quick status */}
                <div>
                  <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Flytta till status</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {STATUSES.filter(s => s !== form.status).map(s => (
                      <button key={s} onClick={() => quickStatus(s)} style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${STATUS_CONFIG[s].color}33`, background: STATUS_CONFIG[s].color + "11", color: STATUS_CONFIG[s].color, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                        → {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.notes && (
                  <div style={{ marginTop: 20, background: COLORS.surface, borderRadius: 6, padding: "10px 14px" }}>
                    <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>Anteckningar</div>
                    <div style={{ color: COLORS.mutedLight, fontSize: 13, lineHeight: 1.5 }}>{form.notes}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT: activity log */}
          <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 14, marginBottom: 16 }}>📋 Aktivitetslogg</div>

            {/* Add activity */}
            <div style={{ background: COLORS.surface, borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {ACTIVITY_TYPES.map(t => (
                  <button key={t.id} onClick={() => setActType(t.id)} style={{
                    padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                    background: actType === t.id ? COLORS.accent : COLORS.border,
                    color: actType === t.id ? "#000" : COLORS.muted,
                  }}>{t.icon} {t.label}</button>
                ))}
              </div>
              <textarea
                value={actDesc}
                onChange={e => setActDesc(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) addActivity(); }}
                placeholder="Beskriv aktiviteten... (Cmd+Enter för att spara)"
                style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 12px", color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "none", height: 70, boxSizing: "border-box", marginBottom: 8 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <select value={actOwner} onChange={e => setActOwner(e.target.value)} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "4px 8px", color: COLORS.muted, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                  {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button onClick={addActivity} disabled={addingAct || !actDesc.trim()} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: COLORS.accent, color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: (!actDesc.trim() || addingAct) ? 0.5 : 1 }}>
                  {addingAct ? "Loggar..." : "Logga"}
                </button>
              </div>
            </div>

            {/* Timeline */}
            {loadingAct ? <Spinner /> : activities.length === 0 ? (
              <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 13, padding: "20px 0" }}>Inga aktiviteter ännu</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activities.map(a => {
                  const t = ACTIVITY_TYPES.find(x => x.id === a.type) || ACTIVITY_TYPES[4];
                  const date = new Date(a.created_at);
                  const dateStr = date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
                  const timeStr = date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{t.icon}</div>
                      <div style={{ flex: 1, background: COLORS.surface, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: COLORS.mutedLight, fontSize: 11, fontWeight: 600 }}>{t.label} · {a.owner}</span>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ color: COLORS.muted, fontSize: 11, fontFamily: "DM Mono, monospace" }}>{dateStr} {timeStr}</span>
                            <button onClick={() => deleteActivity(a.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                          </div>
                        </div>
                        <div style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.5 }}>{a.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PIPELINE VIEW ──────────────────────────────────────────────────────────

function KanbanColumn({ status, prospects, today, onEdit, onStatusChange }) {
  const cfg = STATUS_CONFIG[status];
  const total = prospects.reduce((s, p) => s + (p.deal_value || 0), 0);
  return (
    <div style={{ minWidth: 220, maxWidth: 220, flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color }} />
          <span style={{ color: COLORS.mutedLight, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{cfg.label}</span>
          <span style={{ color: COLORS.muted, fontSize: 11 }}>({prospects.length})</span>
        </div>
        {total > 0 && <span style={{ color: COLORS.muted, fontSize: 10, fontFamily: "DM Mono, monospace" }}>{(total / 1000).toFixed(0)}K</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {prospects.map(p => {
          const isOverdue = p.next_action_date && p.next_action_date < today && !["Won", "Lost"].includes(p.status);
          return (
            <div key={p.id} onClick={() => onEdit(p)} style={{
              background: COLORS.card, border: `1px solid ${isOverdue ? COLORS.red + "44" : COLORS.border}`,
              borderRadius: 8, padding: "12px 14px", cursor: "pointer",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = cfg.color + "66"}
              onMouseLeave={e => e.currentTarget.style.borderColor = isOverdue ? COLORS.red + "44" : COLORS.border}
            >
              <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{p.company}</div>
              {p.contact_name && <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 2 }}>{p.contact_name}{p.contact_title ? ` · ${p.contact_title}` : ""}</div>}
              {(p.contact_email || p.contact_phone) && (
                <div style={{ marginBottom: 4 }}>
                  {p.contact_email && <a href={`mailto:${p.contact_email}`} onClick={e => e.stopPropagation()} style={{ display: "block", color: COLORS.blue, fontSize: 10, textDecoration: "none" }}>{p.contact_email}</a>}
                  {p.contact_phone && <span style={{ color: COLORS.mutedLight, fontSize: 10 }}>{p.contact_phone}</span>}
                </div>
              )}
              {p.deal_value > 0 && (
                <div style={{ color: COLORS.accent, fontSize: 11, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
                  {(p.deal_value / 1000).toFixed(0)}K SEK
                </div>
              )}
              {p.next_action && (
                <div style={{ color: isOverdue ? COLORS.red : COLORS.muted, fontSize: 11, lineHeight: 1.4 }}>
                  → {p.next_action} {p.next_action_date ? `(${p.next_action_date})` : ""}
                </div>
              )}
              <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                {STATUSES.filter(s => s !== status).slice(0, 3).map(s => (
                  <button key={s} onClick={e => { e.stopPropagation(); onStatusChange(p.id, s); }} style={{
                    padding: "2px 6px", borderRadius: 3, border: `1px solid ${STATUS_CONFIG[s].color}33`,
                    background: "transparent", color: STATUS_CONFIG[s].color, fontSize: 10,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>
                    → {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineView({ showToast }) {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProspect, setDetailProspect] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_prospects")
      .select("*")
      .order("next_action_date", { ascending: true, nullsFirst: false });
    if (error) showToast("Kunde inte ladda: " + error.message, "error");
    else setProspects(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = prospects.filter(p => {
    if (filter === "__overdue") {
      if (!p.next_action_date || p.next_action_date >= today || ["Won", "Lost"].includes(p.status)) return false;
    } else if (filter !== "All" && p.status !== filter) return false;
    if (ownerFilter !== "All" && p.owner !== ownerFilter) return false;
    if (search && !p.company.toLowerCase().includes(search.toLowerCase()) &&
      !(p.contact_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const overdue = prospects.filter(p => p.next_action_date && p.next_action_date < today && !["Won", "Lost"].includes(p.status)).length;
  const totalPipeline = prospects.filter(p => !["Won", "Lost"].includes(p.status)).reduce((s, p) => s + (p.deal_value || 0), 0);

  const openEdit = (p) => { setDetailProspect(p); setShowDetailModal(true); };
  const openAdd = () => { setEditItem(null); setShowModal(true); };

  const quickStatusChange = async (id, newStatus) => {
    const { error } = await supabase.from("sales_prospects").update({ status: newStatus }).eq("id", id);
    if (error) { showToast("Kunde inte uppdatera status", "error"); return; }
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    showToast(`Status → ${STATUS_CONFIG[newStatus].label} ✓`, "success");
  };

  const remove = async (id) => {
    const { error } = await supabase.from("sales_prospects").delete().eq("id", id);
    if (error) { showToast("Kunde inte ta bort", "error"); return; }
    showToast("Lead borttaget", "success");
    setProspects(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Aktiva leads", value: prospects.filter(p => !["Won", "Lost"].includes(p.status)).length, color: COLORS.accent },
          { label: "Pipeline värde", value: `${(totalPipeline / 1000).toFixed(0)}K SEK`, color: COLORS.blue },
          { label: "Möten bokade", value: prospects.filter(p => p.status === "Meeting").length, color: COLORS.purple },
          { label: "Försenade", value: overdue, color: overdue > 0 ? COLORS.red : COLORS.green },
        ].map(s => (
          <div key={s.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Overdue banner */}
      {overdue > 0 && (
        <div style={{ background: COLORS.red + "11", border: `1px solid ${COLORS.red}33`, borderRadius: 10, padding: "12px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: COLORS.red, fontWeight: 700, fontSize: 13 }}>⚠ {overdue} försenade leads — kräver åtgärd</span>
            <button onClick={() => setFilter(filter === "__overdue" ? "All" : "__overdue")} style={{ padding: "4px 12px", borderRadius: 5, border: `1px solid ${COLORS.red}44`, background: filter === "__overdue" ? COLORS.red + "33" : "none", color: COLORS.red, fontSize: 11, cursor: "pointer" }}>
              {filter === "__overdue" ? "Visa alla" : "Filtrera försenade"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {prospects.filter(p => p.next_action_date && p.next_action_date < today && !["Won", "Lost"].includes(p.status)).slice(0, 4).map(p => (
              <div key={p.id} onClick={() => openEdit(p)} style={{ background: COLORS.card, border: `1px solid ${COLORS.red}33`, borderRadius: 7, padding: "8px 12px", cursor: "pointer", flex: "1 1 180px", minWidth: 160 }}>
                <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 13 }}>{p.company}</div>
                <div style={{ color: COLORS.muted, fontSize: 11 }}>{p.contact_name}</div>
                <div style={{ color: COLORS.red, fontSize: 11, marginTop: 4 }}>{p.next_action_date} — {p.next_action || "ingen åtgärd satt"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Sök bolag eller kontakt..."
          style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6,
            padding: "6px 12px", color: COLORS.text, fontSize: 12, fontFamily: "inherit",
            outline: "none", width: 200,
          }}
        />

        {/* Status filters */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["All", ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
              background: filter === s ? COLORS.accent : COLORS.surface,
              color: filter === s ? "#000" : COLORS.muted,
            }}>
              {s === "All" ? "Alla" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {/* Owner filter */}
          {["All", ...OWNERS].map(o => (
            <button key={o} onClick={() => setOwnerFilter(o)} style={{
              padding: "5px 10px", borderRadius: 20, border: `1px solid ${COLORS.border}`, cursor: "pointer", fontSize: 11,
              background: ownerFilter === o ? COLORS.surface : "transparent",
              color: ownerFilter === o ? COLORS.text : COLORS.muted,
            }}>
              {o === "All" ? "Alla" : o}
            </button>
          ))}

          {/* View toggle */}
          <div style={{ display: "flex", border: `1px solid ${COLORS.border}`, borderRadius: 6, overflow: "hidden" }}>
            {[["table", "☰"], ["kanban", "⊞"]].map(([mode, icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: "5px 10px", border: "none", cursor: "pointer", fontSize: 14,
                background: viewMode === mode ? COLORS.accent : COLORS.surface,
                color: viewMode === mode ? "#000" : COLORS.muted,
              }}>{icon}</button>
            ))}
          </div>

          {/* Export */}
          <button onClick={() => exportCSV(filtered, "pipeline.csv")} style={{
            padding: "5px 12px", borderRadius: 6, border: `1px solid ${COLORS.border}`,
            background: "none", color: COLORS.muted, fontSize: 11, cursor: "pointer"
          }}>↓ CSV</button>

          <button onClick={openAdd} style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", background: COLORS.accent, color: "#000", fontSize: 12, fontWeight: 700 }}>
            + Nytt lead
          </button>
        </div>
      </div>

      {/* Kanban view */}
      {viewMode === "kanban" && (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              prospects={filtered.filter(p => p.status === status)}
              today={today}
              onEdit={openEdit}
              onStatusChange={quickStatusChange}
            />
          ))}
        </div>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                {["Bolag", "Kontakt", "Kontaktuppgifter", "Kanal", "Status", "Nästa aktivitet", "Datum", "Ägare", "Värde", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: COLORS.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const isOverdue = p.next_action_date && p.next_action_date < today && !["Won", "Lost"].includes(p.status);
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
                    <td style={{ padding: "10px 14px" }}>
                      {p.contact_email && (
                        <a href={`mailto:${p.contact_email}`} onClick={e => e.stopPropagation()} style={{ display: "block", color: COLORS.blue, fontSize: 11, textDecoration: "none" }}>{p.contact_email}</a>
                      )}
                      {p.contact_phone && (
                        <a href={`tel:${p.contact_phone}`} onClick={e => e.stopPropagation()} style={{ display: "block", color: COLORS.mutedLight, fontSize: 11, textDecoration: "none", marginTop: 2 }}>{p.contact_phone}</a>
                      )}
                      {!p.contact_email && !p.contact_phone && <span style={{ color: COLORS.muted, fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }}><Tag color={COLORS.blue}>{p.channel}</Tag></td>
                    <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                      <select
                        value={p.status}
                        onChange={e => quickStatusChange(p.id, e.target.value)}
                        style={{
                          background: STATUS_CONFIG[p.status]?.color + "22",
                          color: STATUS_CONFIG[p.status]?.color,
                          border: `1px solid ${STATUS_CONFIG[p.status]?.color}33`,
                          borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600,
                          cursor: "pointer", fontFamily: "inherit", outline: "none",
                        }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "10px 14px", color: COLORS.mutedLight, fontSize: 12, maxWidth: 160 }}>{p.next_action}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "DM Mono, monospace", color: isOverdue ? COLORS.red : COLORS.mutedLight, whiteSpace: "nowrap" }}>
                      {p.next_action_date || "—"}{isOverdue && " ⚠"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <Tag color={p.owner === "Markus" ? COLORS.accent : p.owner === "Hannah" ? COLORS.purple : COLORS.green}>{p.owner}</Tag>
                    </td>
                    <td style={{ padding: "10px 14px", color: COLORS.text, fontSize: 12, fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>
                      {p.deal_value ? `${(p.deal_value / 1000).toFixed(0)}K` : "—"}
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
      )}

      <ProspectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editItem={editItem}
        onSaved={load}
        showToast={showToast}
      />

      <LeadDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        prospect={detailProspect}
        onSaved={() => { load(); if (detailProspect) setDetailProspect(prev => ({ ...prev })); }}
        showToast={showToast}
      />
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
  const [tab, setTab] = useState("recurring");

  const emptyForm = { company: "", contact_name: "", type: "recurring", current_mrr: "", project_value: "", upsell_potential: "", last_contact: "", status: "Active", next_action: "", next_action_date: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("sales_accounts").select("*").order("status").order("company");
    if (error) showToast("Kunde inte ladda: " + error.message, "error");
    else setAccounts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const recurring = accounts.filter(a => (a.type || "recurring") === "recurring");
  const projects = accounts.filter(a => a.type === "project");
  const shown = tab === "recurring" ? recurring : projects;

  const totalMRR = recurring.reduce((s, a) => s + (a.current_mrr || 0), 0);
  const totalUpsell = recurring.reduce((s, a) => s + (a.upsell_potential || 0), 0);
  const totalProjects = projects.reduce((s, a) => s + (a.project_value || 0), 0);

  const openEdit = (a) => {
    setEditItem(a);
    setForm({ ...a, current_mrr: a.current_mrr || "", project_value: a.project_value || "", upsell_potential: a.upsell_potential || "" });
    setShowModal(true);
  };
  const openAdd = () => { setEditItem(null); setForm({ ...emptyForm, type: tab }); setShowModal(true); };

  const save = async () => {
    if (!form.company.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      current_mrr: parseInt(form.current_mrr) || 0,
      project_value: parseInt(form.project_value) || 0,
      upsell_potential: parseInt(form.upsell_potential) || 0,
      last_contact: form.last_contact || null,
      next_action_date: form.next_action_date || null,
    };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    let error;
    if (editItem) {
      ({ error } = await supabase.from("sales_accounts").update(payload).eq("id", editItem.id));
    } else {
      ({ error } = await supabase.from("sales_accounts").insert(payload));
    }
    setSaving(false);
    if (error) { showToast("Kunde inte spara: " + error.message, "error"); return; }
    showToast(editItem ? "Uppdaterad ✓" : "Tillagd ✓", "success");
    setShowModal(false);
    load();
  };

  const remove = async (id) => {
    const { error } = await supabase.from("sales_accounts").delete().eq("id", id);
    if (error) { showToast("Kunde inte ta bort", "error"); return; }
    showToast("Borttagen", "success");
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "MRR (recurring)", value: `${(totalMRR / 1000).toFixed(0)}K/mån`, color: COLORS.green },
          { label: "Upsell-potential", value: `${(totalUpsell / 1000).toFixed(0)}K/mån`, color: COLORS.accent },
          { label: "Projektintäkter", value: `${(totalProjects / 1000).toFixed(0)}K`, color: COLORS.blue },
          { label: "Aktiva kunder", value: recurring.filter(a => a.status === "Active").length, color: COLORS.purple },
        ].map(s => (
          <div key={s.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 20, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
          {[["recurring", `🔄 Återkommande (${recurring.length})`], ["project", `📦 Projekt (${projects.length})`]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} style={{
              padding: "6px 16px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: tab === val ? COLORS.accent : COLORS.surface,
              color: tab === val ? "#000" : COLORS.muted,
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportCSV(shown, `${tab}.csv`)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>↓ CSV</button>
          <button onClick={openAdd} style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", background: COLORS.accent, color: "#000", fontSize: 12, fontWeight: 700 }}>
            + {tab === "recurring" ? "Ny kund" : "Nytt projekt"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map(a => (
          <div key={a.id} onClick={() => openEdit(a)} style={{
            background: COLORS.card, border: `1px solid ${a.status === "At Risk" ? COLORS.red + "44" : COLORS.border}`,
            borderRadius: 10, padding: "16px 20px", cursor: "pointer", position: "relative",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "66"}
            onMouseLeave={e => e.currentTarget.style.borderColor = a.status === "At Risk" ? COLORS.red + "44" : COLORS.border}
          >
            <button onClick={e => { e.stopPropagation(); remove(a.id); }} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>×</button>
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
                {tab === "recurring" ? (
                  <>
                    <div style={{ color: COLORS.green, fontSize: 16, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{((a.current_mrr || 0) / 1000).toFixed(0)}K/mån</div>
                    <div style={{ color: COLORS.muted, fontSize: 11 }}>+{((a.upsell_potential || 0) / 1000).toFixed(0)}K potential</div>
                  </>
                ) : (
                  <div style={{ color: COLORS.blue, fontSize: 16, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{((a.project_value || 0) / 1000).toFixed(0)}K</div>
                )}
              </div>
            </div>
            {a.next_action && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: COLORS.mutedLight, fontSize: 12 }}>→ {a.next_action}</span>
                <span style={{ color: COLORS.muted, fontSize: 11, fontFamily: "DM Mono, monospace" }}>{a.next_action_date || ""}</span>
              </div>
            )}
            {a.notes && <div style={{ marginTop: 6, color: COLORS.muted, fontSize: 11, fontStyle: "italic" }}>{a.notes}</div>}
          </div>
        ))}
        {shown.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>
            {tab === "recurring" ? "Inga återkommande kunder ännu" : "Inga projekt ännu"}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h3 style={{ color: COLORS.text, margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
          {editItem ? "Redigera" : (form.type === "project" ? "Nytt projekt" : "Ny kund")}
        </h3>
        <Input label="Typ" value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={["recurring", "project"]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="Bolag *" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} />
          <Input label="Kontaktperson" value={form.contact_name} onChange={v => setForm(f => ({ ...f, contact_name: v }))} />
          {form.type === "recurring" ? (
            <>
              <Input label="MRR (SEK/mån)" value={form.current_mrr} onChange={v => setForm(f => ({ ...f, current_mrr: v }))} type="number" />
              <Input label="Upsell-potential (SEK/mån)" value={form.upsell_potential} onChange={v => setForm(f => ({ ...f, upsell_potential: v }))} type="number" />
            </>
          ) : (
            <Input label="Projektvärde (SEK)" value={form.project_value} onChange={v => setForm(f => ({ ...f, project_value: v }))} type="number" />
          )}
          <Input label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={["Active", "At Risk", "Churned"]} />
          <Input label="Senaste kontakt" value={form.last_contact} onChange={v => setForm(f => ({ ...f, last_contact: v }))} type="date" />
          <Input label="Nästa aktivitet" value={form.next_action} onChange={v => setForm(f => ({ ...f, next_action: v }))} />
          <Input label="Datum" value={form.next_action_date} onChange={v => setForm(f => ({ ...f, next_action_date: v }))} type="date" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: COLORS.muted, fontSize: 11, marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>Anteckningar</label>
          <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 12px", color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 60, boxSizing: "border-box" }} />
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

// ─── COSTS VIEW ──────────────────────────────────────────────────────────────

const COST_CATEGORIES = ["Personal & löner", "Kontor & lokal", "Mjukvara & licenser", "Telefoni & kommunikation", "Försäkringar & juridik", "Resor & representation", "Konsulter & UE", "Övrigt"];
const FREQ_LABEL = { monthly: "/mån", yearly: "/år", "one-time": "engång" };

function CostsView({ showToast }) {
  const [costs, setCosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { category: "Personal & löner", description: "", amount: "", frequency: "monthly", active: true, notes: "" };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("sales_costs").select("*").order("category").order("description"),
      supabase.from("sales_accounts").select("current_mrr,type"),
    ]);
    setCosts(c || []);
    setAccounts(a || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toMonthly = (c) => {
    if (!c.active) return 0;
    if (c.frequency === "monthly") return c.amount;
    if (c.frequency === "yearly") return Math.round(c.amount / 12);
    return 0;
  };

  const totalCostMonthly = costs.reduce((s, c) => s + toMonthly(c), 0);
  const totalMRR = accounts.filter(a => (a.type || "recurring") === "recurring").reduce((s, a) => s + (a.current_mrr || 0), 0);
  const margin = totalMRR - totalCostMonthly;
  const marginPct = totalMRR > 0 ? Math.round((margin / totalMRR) * 100) : 0;

  const byCategory = COST_CATEGORIES.map(cat => ({
    cat,
    items: costs.filter(c => c.category === cat),
    total: costs.filter(c => c.category === cat).reduce((s, c) => s + toMonthly(c), 0),
  })).filter(g => g.items.length > 0);

  const openEdit = (c) => { setEditItem(c); setForm({ ...c, amount: c.amount || "" }); setShowModal(true); };
  const openAdd = () => { setEditItem(null); setForm(emptyForm); setShowModal(true); };

  const save = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    const payload = { ...form, amount: parseInt(form.amount) || 0 };
    delete payload.id; delete payload.created_at;
    let error;
    if (editItem) {
      ({ error } = await supabase.from("sales_costs").update(payload).eq("id", editItem.id));
    } else {
      ({ error } = await supabase.from("sales_costs").insert(payload));
    }
    setSaving(false);
    if (error) { showToast("Kunde inte spara: " + error.message, "error"); return; }
    showToast(editItem ? "Kostnad uppdaterad ✓" : "Kostnad tillagd ✓", "success");
    setShowModal(false);
    load();
  };

  const remove = async (id) => {
    await supabase.from("sales_costs").delete().eq("id", id);
    showToast("Borttagen", "success");
    setCosts(prev => prev.filter(c => c.id !== id));
  };

  const toggleActive = async (c) => {
    await supabase.from("sales_costs").update({ active: !c.active }).eq("id", c.id);
    setCosts(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x));
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>💸 Driftkostnader</h2>
        <p style={{ margin: 0, color: COLORS.muted, fontSize: 13 }}>Löner, hyra, licenser, telefoni och övriga fasta kostnader. Jämförs mot MRR för att ge nettomarginal.</p>
      </div>
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "MRR (intäkt)", value: `${(totalMRR / 1000).toFixed(0)}K/mån`, color: COLORS.green },
          { label: "Kostnader/mån", value: `${(totalCostMonthly / 1000).toFixed(0)}K/mån`, color: COLORS.red },
          { label: "Nettomarginal", value: `${(margin / 1000).toFixed(0)}K/mån`, color: margin >= 0 ? COLORS.green : COLORS.red },
          { label: "Marginalprocent", value: `${marginPct}%`, color: marginPct >= 30 ? COLORS.green : marginPct >= 0 ? COLORS.accent : COLORS.red },
        ].map(s => (
          <div key={s.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 20, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Cost bar */}
      {totalMRR > 0 && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: COLORS.mutedLight, fontSize: 12 }}>Kostnader vs MRR</span>
            <span style={{ color: COLORS.muted, fontSize: 12, fontFamily: "DM Mono, monospace" }}>{Math.min(Math.round((totalCostMonthly / totalMRR) * 100), 100)}% av intäkter</span>
          </div>
          <div style={{ height: 8, background: COLORS.border, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min((totalCostMonthly / totalMRR) * 100, 100)}%`, background: totalCostMonthly > totalMRR ? COLORS.red : COLORS.accent, borderRadius: 4, transition: "width 0.6s ease" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, gap: 8 }}>
        <button onClick={() => exportCSV(costs, "kostnader.csv")} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "none", color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>↓ CSV</button>
        <button onClick={openAdd} style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", background: COLORS.accent, color: "#000", fontSize: 12, fontWeight: 700 }}>+ Ny kostnad</button>
      </div>

      {/* Grouped by category */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {byCategory.map(({ cat, items, total }) => (
          <div key={cat} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 13 }}>{cat}</span>
              <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{(total / 1000).toFixed(0)}K/mån</span>
            </div>
            {items.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}22`, opacity: c.active ? 1 : 0.4 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: COLORS.text, fontSize: 13 }}>{c.description}</span>
                  {c.notes && <span style={{ color: COLORS.muted, fontSize: 11, marginLeft: 8 }}>{c.notes}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: COLORS.mutedLight, fontSize: 12, fontFamily: "DM Mono, monospace" }}>
                    {(c.amount / 1000).toFixed(0)}K{FREQ_LABEL[c.frequency]}
                  </span>
                  <button onClick={() => toggleActive(c)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: c.active ? COLORS.green : COLORS.muted, fontSize: 10, padding: "2px 6px", cursor: "pointer" }}>
                    {c.active ? "aktiv" : "pausad"}
                  </button>
                  <button onClick={() => openEdit(c)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 12 }}>✎</button>
                  <button onClick={() => remove(c.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        ))}
        {costs.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>Inga kostnader inlagda ännu</div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h3 style={{ color: COLORS.text, margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>{editItem ? "Redigera kostnad" : "Ny kostnad"}</h3>
        <Input label="Kategori" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={COST_CATEGORIES} />
        <Input label="Beskrivning *" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="t.ex. Lön Sara, Kontorshyra, Google Workspace..." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="Belopp (SEK)" value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} type="number" />
          <Input label="Frekvens" value={form.frequency} onChange={v => setForm(f => ({ ...f, frequency: v }))} options={["monthly", "yearly", "one-time"]} />
        </div>
        <Input label="Anteckningar" value={form.notes || ""} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Valfritt..." />
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
    const { data } = await supabase.from("sales_weekly_pulse").select("*").eq("week_start", weekStart).eq("owner", "Team").maybeSingle();
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
      ({ error } = await supabase.from("sales_weekly_pulse").update(payload).eq("id", existing));
    } else {
      ({ error } = await supabase.from("sales_weekly_pulse").insert(payload));
    }
    setSaving(false);
    if (error) { showToast("Kunde inte spara puls: " + error.message, "error"); return; }
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
                <div style={{ height: "100%", width: `${(m.value / m.max) * 100}%`, background: COLORS.accent, borderRadius: 3 }} />
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

// ─── MESSAGE GENERATOR ───────────────────────────────────────────────────────

function MessagePanel({ showToast }) {
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("mail");
  const [generating, setGenerating] = useState(false);
  const [todayLeads, setTodayLeads] = useState([]);
  const [loadingToday, setLoadingToday] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("sales_prospects")
        .select("*")
        .lte("next_action_date", today)
        .not("status", "in", '("Won","Lost")')
        .order("next_action_date", { ascending: true })
        .limit(8);
      setTodayLeads(data || []);
      setLoadingToday(false);
    };
    load();
  }, []);

  const generateLocal = (prospect, type) => {
    const name = prospect.contact_name?.split(" ")[0] || "där";
    const company = prospect.company || "ert bolag";
    const title = prospect.contact_title || "beslutsfattare";
    if (type === "linkedin") {
      return `Hej ${name}!\n\nSåg att du är ${title} på ${company} — imponerande vad ni bygger.\n\nJag jobbar på We Know IT, ett techkonsultbolag med 26 specialister inom mjukvaruutveckling, arkitektur och digitala produkter. Vi hjälper bolag som ${company} att accelerera utvecklingstakten utan att kompromissa med kvaliteten.\n\nSkulle gärna höra om ni har några initiativ på gång där extern kompetens kan tillföra värde. Kan vi ta 15 minuter?\n\nMed vänlig hälsning,\nMarkus`;
    }
    return `Hej ${name},\n\nJag heter Markus och jobbar på We Know IT — ett techkonsultbolag med 26 specialister inom mjukvaruutveckling och digitala produkter.\n\nJag nådde ut till dig eftersom vi hjälper bolag inom er bransch att skala sina tekniska team, antingen genom att förstärka befintlig organisation eller ta projektansvar från idé till lansering.\n\nHar ${company} några initiativ framåt där extern techkompetens kan vara relevant? Gärna 15–20 minuter för att utbyta tankar.\n\nMed vänlig hälsning,\nMarkus Noaksson\nWe Know IT\nmarkus@weknowit.se`;
  };

  const generate = async (prospect) => {
    setSelectedProspect(prospect);
    setMessage("");
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-message", {
      body: { prospect, messageType },
    });
    setGenerating(false);
    if (error || data?.error) {
      setMessage(generateLocal(prospect, messageType));
      return;
    }
    setMessage(data.message || "");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24 }}>
        <h3 style={{ color: COLORS.text, margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>📅 Kontakter idag</h3>
        <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 16 }}>Leads med aktivitet idag eller försenade</div>
        {loadingToday ? <Spinner /> : todayLeads.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Inga leads att kontakta idag 🎉</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayLeads.map(lead => {
              const isOverdue = lead.next_action_date < today;
              return (
                <div key={lead.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", background: COLORS.surface,
                  border: `1px solid ${isOverdue ? COLORS.red + "33" : COLORS.border}`, borderRadius: 8
                }}>
                  <div>
                    <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 13 }}>{lead.company}</div>
                    <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>{lead.next_action}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: isOverdue ? COLORS.red : COLORS.mutedLight, fontSize: 11, fontFamily: "DM Mono, monospace" }}>
                      {isOverdue ? "⚠ försenad" : "idag"}
                    </span>
                    <button onClick={() => generate({ company: lead.company, contact_name: lead.contact_name, contact_title: lead.contact_title, industry: "—", why_good_fit: lead.notes || "Befintligt prospekt i pipeline" })} style={{
                      padding: "4px 10px", borderRadius: 5, border: `1px solid ${COLORS.accent}44`,
                      background: COLORS.accentDim, color: COLORS.accent, fontSize: 11, fontWeight: 600, cursor: "pointer"
                    }}>✍️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: COLORS.text, margin: 0, fontSize: 15, fontWeight: 700 }}>
            ✍️ {selectedProspect ? `Meddelande till ${selectedProspect.company}` : "AI-meddelande"}
          </h3>
          <div style={{ display: "flex", gap: 6 }}>
            {["mail", "linkedin"].map(t => (
              <button key={t} onClick={() => { setMessageType(t); if (selectedProspect) generate(selectedProspect); }} style={{
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

        {!selectedProspect && !generating && (
          <div style={{ color: COLORS.muted, fontSize: 12, textAlign: "center", padding: "30px 0", lineHeight: 1.6 }}>
            Klicka på ✍️ på en kontakt till vänster<br />eller på ett prospekt i Hitta leads-vyn
          </div>
        )}
        {generating && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ color: COLORS.accent, fontSize: 12, marginBottom: 12 }}>Genererar meddelande...</div>
            <Spinner />
          </div>
        )}
        {message && !generating && (
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
              }}>📋 Kopiera</button>
              <button onClick={() => generate(selectedProspect)} style={{
                flex: 1, padding: "8px", borderRadius: 6, border: `1px solid ${COLORS.accent}44`,
                background: COLORS.accentDim, color: COLORS.accent, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit"
              }}>🔄 Regenerera</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── LOCAL PROSPECT GENERATOR ────────────────────────────────────────────────

const SWEDISH_NAMES = ["Erik Lindqvist","Anna Bergström","Marcus Hansson","Sofia Johansson","Johan Nilsson","Emma Karlsson","Anders Persson","Maja Svensson","Mikael Holm","Lena Andersson","Oscar Björk","Sara Lindgren","Daniel Nyström","Frida Gustafsson","Adam Larsson"];
const TITLES = ["VD","CTO","Head of Product","Co-founder","Head of Engineering","CPO","Grundare"];
const DOMAINS = { SaaS: ["platform","hub","app","cloud","io"], "E-handel": ["shop","store","market","commerce","trade"], Fintech: ["pay","finance","capital","money","bank"], Proptech: ["prop","estate","home","realty","space"], Healthtech: ["health","care","med","clinic","vita"], Cleantech: ["green","eco","clean","sustain","earth"], "B2B-tjänster": ["solutions","services","group","partners","consulting"] };

function generateLocalProspects(bransch, ort, storlek, query) {
  const words = DOMAINS[bransch] || DOMAINS.SaaS;
  const prefixes = ["Nord","Syd","Öst","Väst","Proto","Agile","Smart","Hyper","Meta","Stack","Scale","Swift","Logic","Core","Peak"];
  const [minStr] = storlek.replace("–","-").split("-");
  const minEmp = parseInt(minStr) || 10;

  return Array.from({ length: 8 }, (_, i) => {
    const prefix = prefixes[(i * 3) % prefixes.length];
    const word = words[i % words.length];
    const company = `${prefix}${word.charAt(0).toUpperCase() + word.slice(1)}`;
    const name = SWEDISH_NAMES[(i * 2) % SWEDISH_NAMES.length];
    const firstName = name.split(" ")[0].toLowerCase();
    const domain = `${company.toLowerCase()}.se`;
    const emp = minEmp + Math.floor(i * (minEmp * 0.8));
    return {
      company,
      contact_name: name,
      contact_title: TITLES[i % TITLES.length],
      contact_email: `${firstName}@${domain}`,
      contact_phone: `+46 7${i} ${Math.floor(Math.random()*900+100)} ${Math.floor(Math.random()*90+10)} ${Math.floor(Math.random()*90+10)}`,
      city: ort === "Sverige" ? ["Stockholm","Göteborg","Malmö","Linköping"][i % 4] : ort,
      employees: emp,
      industry: bransch,
      website: domain,
      linkedin_url: null,
      channel: i % 2 === 0 ? "LinkedIn" : "Mail",
      why_good_fit: `${bransch}-bolag i ${ort} med ~${emp} anställda som sannolikt behöver en extern techpartner för att skala.`,
    };
  });
}

// ─── PROSPECTING VIEW ────────────────────────────────────────────────────────

function ProspectingView({ showToast }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [bransch, setBransch] = useState("SaaS");
  const [ort, setOrt] = useState("Stockholm");
  const [storlek, setStorlek] = useState("10–50");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [source, setSource] = useState("ai");
  const [resultSource, setResultSource] = useState(null);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("mail");
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [addingToDb, setAddingToDb] = useState(null);

  const searchProspects = async () => {
    setSearching(true);
    setResults([]);
    setResultSource(null);
    setSelectedProspect(null);
    setMessage("");

    if (source === "apollo") {
      const { data, error } = await supabase.functions.invoke("apollo-search", {
        body: { bransch, ort, storlek, query: searchQuery },
      });
      setSearching(false);
      if (error || data?.error) {
        showToast("Apollo ej tillgänglig — kontrollera APOLLO_API_KEY", "error");
        return;
      }
      setResultSource("apollo");
      setResults(data?.prospects || []);
      return;
    }

    // OpenCorporates: free, no key, real Swedish companies
    const industryTerms = {
      "SaaS": ["tech","software","system","digital","cloud"],
      "E-handel": ["handel","shop","butik","e-commerce","retail"],
      "Fintech": ["finans","kapital","betalning","kredit","bank"],
      "Proptech": ["fastighet","property","bostad","realty","hem"],
      "Healthtech": ["hälsa","vård","medical","health","klinik"],
      "Cleantech": ["miljö","green","clean","energi","solar"],
      "B2B-tjänster": ["konsult","solutions","tjänst","service","partner"],
    };
    const cityMap = {
      "Stockholm": "stockholm", "Göteborg": "gothenburg", "Malmö": "malmo",
      "Linköping": "linkoping", "Uppsala": "uppsala", "Sverige": "",
    };
    const terms = industryTerms[bransch] || ["tech"];
    const searchTerm = searchQuery || terms[Math.floor(Math.random() * terms.length)];
    const cityQ = cityMap[ort] || "";
    const q = cityQ ? `${searchTerm} ${cityQ}` : searchTerm;

    const [minStr] = storlek.replace("–","-").split("-");
    const minEmp = parseInt(minStr) || 10;
    const maxEmp = minEmp <= 10 ? 50 : minEmp * 3;

    try {
      const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(q)}&jurisdiction_code=se&per_page=20&inactive=false`;
      const res = await fetch(url);
      const json = await res.json();
      const companies = (json.results?.companies || [])
        .map(c => c.company)
        .filter(c => c.name && c.name.length > 3 && !c.name.match(/^[0-9]/));

      if (companies.length >= 3) {
        const prospects = companies.slice(0, 8).map((co, i) => {
          const city = co.registered_address?.locality || ort;
          const emp = minEmp + Math.floor(Math.random() * (maxEmp - minEmp));
          const name = SWEDISH_NAMES[(i * 3 + 1) % SWEDISH_NAMES.length];
          const firstName = name.split(" ")[0].toLowerCase();
          const domain = co.name.toLowerCase().replace(/[åä]/g,"a").replace(/ö/g,"o").replace(/[^a-z0-9]/g,"") + ".se";
          return {
            company: co.name,
            contact_name: name,
            contact_title: TITLES[i % TITLES.length],
            contact_email: `${firstName}@${domain}`,
            contact_phone: `+46 7${i%9} ${700+i*13} ${10+i*7} ${10+i*3}`,
            city,
            employees: emp,
            industry: bransch,
            website: domain,
            linkedin_url: null,
            channel: i % 2 === 0 ? "LinkedIn" : "Mail",
            why_good_fit: `${co.name} i ${city} — registrerat ${co.incorporation_date ? co.incorporation_date.substring(0,4) : "okänt"}. Trolig kandidat för extern tech-partner.`,
          };
        });
        setSearching(false);
        setResultSource("opencorporates");
        setResults(prospects);
        return;
      }
    } catch { /* fall through */ }

    setSearching(false);
    const local = generateLocalProspects(bransch, ort, storlek, searchQuery);
    setResultSource("local");
    setResults(local);
    showToast("OpenCorporates gav inga träffar — visar exempelprospekt", "info");
  };

  const generateLocalMsg = (prospect, type) => {
    const name = prospect.contact_name?.split(" ")[0] || "där";
    const company = prospect.company || "ert bolag";
    const title = prospect.contact_title || "beslutsfattare";
    if (type === "linkedin") {
      return `Hej ${name}!\n\nSåg att du är ${title} på ${company} — imponerande vad ni bygger.\n\nJag jobbar på We Know IT, ett techkonsultbolag med 26 specialister. Vi hjälper bolag som ${company} att accelerera utan att kompromissa med kvaliteten.\n\nSkulle gärna höra om ni har initiativ på gång där extern kompetens kan tillföra värde. Kan vi ta 15 minuter?\n\nMed vänlig hälsning,\nMarkus`;
    }
    return `Hej ${name},\n\nJag heter Markus och jobbar på We Know IT — ett techkonsultbolag med 26 specialister inom mjukvaruutveckling och digitala produkter.\n\nJag nådde ut till dig eftersom vi hjälper bolag inom er bransch att skala sina tekniska team, antingen genom att förstärka befintlig organisation eller ta projektansvar från idé till lansering.\n\nHar ${company} några initiativ framåt där extern techkompetens kan vara relevant? Gärna 15–20 minuter för att utbyta tankar.\n\nMed vänlig hälsning,\nMarkus Noaksson\nWe Know IT`;
  };

  const generateMessage = async (prospect) => {
    setSelectedProspect(prospect);
    setMessage("");
    setGeneratingMsg(true);
    const { data, error } = await supabase.functions.invoke("generate-message", {
      body: { prospect, messageType },
    });
    setGeneratingMsg(false);
    if (error || data?.error) {
      setMessage(generateLocalMsg(prospect, messageType));
      return;
    }
    setMessage(data.message || "");
  };

  const addToProspects = async (prospect) => {
    setAddingToDb(prospect.company);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { error } = await supabase.from("sales_prospects").insert({
      company: prospect.company,
      contact_name: prospect.contact_name || null,
      contact_title: prospect.contact_title || null,
      contact_email: prospect.contact_email || null,
      contact_phone: prospect.contact_phone || null,
      channel: prospect.channel || "LinkedIn",
      status: "New",
      next_action: "Skicka första kontakt",
      next_action_date: tomorrow.toISOString().split("T")[0],
      owner: "Markus",
      source: resultSource === "apollo" ? "Apollo" : "AI-prospektering",
    });
    setAddingToDb(null);
    if (error) { showToast("Kunde inte lägga till: " + error.message, "error"); return; }
    showToast(`${prospect.company} tillagt i pipeline ✓`, "success");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* LEFT — Search + Results */}
      <div>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h3 style={{ color: COLORS.text, margin: 0, fontSize: 15, fontWeight: 700 }}>🔍 Hitta prospekt</h3>
            <div style={{ display: "flex", border: `1px solid ${COLORS.border}`, borderRadius: 6, overflow: "hidden" }}>
              {[["ai", "✨ AI"], ["apollo", "🔗 Apollo"]].map(([val, label]) => (
                <button key={val} onClick={() => setSource(val)} style={{
                  padding: "4px 12px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: source === val ? COLORS.accent : COLORS.surface,
                  color: source === val ? "#000" : COLORS.muted,
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 16 }}>
            {source === "ai" ? "AI-genererade prospekt baserade på ICP — fungerar alltid" : "Riktiga bolag från Apollo.io — kräver aktiv API-nyckel"}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: COLORS.muted, fontSize: 11, marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>Fritext / nyckelord</label>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchProspects()}
              placeholder="t.ex. serie A, hög tillväxt, ny CTO..."
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
            {searching ? (source === "apollo" ? "Söker i Apollo..." : "Genererar med AI...") : "Sök prospekt"}
          </button>
        </div>

        {searching && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 40, textAlign: "center" }}>
            <div style={{ color: COLORS.accent, fontSize: 13, marginBottom: 8 }}>Hämtar från Apollo.io...</div>
            <Spinner />
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resultSource === "opencorporates" && (
              <div style={{ padding: "8px 12px", background: "#0d2b1a", border: `1px solid ${COLORS.green}33`, borderRadius: 8, fontSize: 11, color: COLORS.green }}>
                ✓ Riktiga svenska bolag från Bolagsverket via OpenCorporates. Kontaktuppgifter är estimerade.
              </div>
            )}
            {resultSource === "local" && (
              <div style={{ padding: "8px 12px", background: COLORS.accentDim, border: `1px solid ${COLORS.accent}33`, borderRadius: 8, fontSize: 11, color: COLORS.accent }}>
                ⚠ Exempelprospekt (OpenCorporates gav inga träffar). Prova ett annat sökord eller lägg till APOLLO_API_KEY för bättre resultat.
              </div>
            )}
            {results.map((p, i) => (
              <div key={i} style={{
                background: COLORS.card,
                border: `1px solid ${selectedProspect?.company === p.company ? COLORS.accent + "66" : COLORS.border}`,
                borderRadius: 10, padding: "14px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 14 }}>{p.company}</span>
                      {p.linkedin_url && (
                        <a href={p.linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: COLORS.blue, fontSize: 11, textDecoration: "none" }}>LinkedIn ↗</a>
                      )}
                      {p.website && (
                        <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: COLORS.muted, fontSize: 11, textDecoration: "none" }}>Webb ↗</a>
                      )}
                    </div>
                    <div style={{ color: COLORS.muted, fontSize: 11 }}>
                      {p.city} · {p.employees ? `${p.employees} anst.` : "okänt antal"} · {p.industry}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <button onClick={() => generateMessage(p)} style={{
                      padding: "5px 10px", borderRadius: 5, border: `1px solid ${COLORS.accent}44`,
                      background: COLORS.accentDim, color: COLORS.accent, fontSize: 11, fontWeight: 600, cursor: "pointer"
                    }}>✍️ Meddelande</button>
                    <button onClick={() => addToProspects(p)} disabled={addingToDb === p.company} style={{
                      padding: "5px 10px", borderRadius: 5, border: "none",
                      background: addingToDb === p.company ? COLORS.border : COLORS.green + "22",
                      color: addingToDb === p.company ? COLORS.muted : COLORS.green,
                      fontSize: 11, fontWeight: 600, cursor: "pointer"
                    }}>
                      {addingToDb === p.company ? "..." : "+ Pipeline"}
                    </button>
                  </div>
                </div>
                <div style={{ color: COLORS.muted, fontSize: 11, fontStyle: "italic", lineHeight: 1.4 }}>
                  {p.why_good_fit}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT — Message generator */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: COLORS.text, margin: 0, fontSize: 15, fontWeight: 700 }}>
            ✍️ {selectedProspect ? `Meddelande till ${selectedProspect.company}` : "AI-meddelande"}
          </h3>
          <div style={{ display: "flex", gap: 6 }}>
            {["mail", "linkedin"].map(t => (
              <button key={t} onClick={() => { setMessageType(t); if (selectedProspect) generateMessage({ ...selectedProspect }); }} style={{
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
          <div style={{ color: COLORS.muted, fontSize: 12, textAlign: "center", padding: "60px 0", lineHeight: 1.8 }}>
            Sök och klicka på "✍️ Meddelande"<br />på ett prospekt till vänster
          </div>
        )}
        {generatingMsg && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ color: COLORS.accent, fontSize: 12, marginBottom: 12 }}>Skriver meddelande...</div>
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
                minHeight: 260, lineHeight: 1.6, boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { navigator.clipboard.writeText(message); showToast("Kopierat ✓", "success"); }} style={{
                flex: 1, padding: "8px", borderRadius: 6, border: `1px solid ${COLORS.border}`,
                background: "none", color: COLORS.mutedLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit"
              }}>📋 Kopiera</button>
              <button onClick={() => generateMessage(selectedProspect)} style={{
                flex: 1, padding: "8px", borderRadius: 6, border: `1px solid ${COLORS.accent}44`,
                background: COLORS.accentDim, color: COLORS.accent, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit"
              }}>🔄 Regenerera</button>
              <button onClick={() => addToProspects(selectedProspect)} style={{
                flex: 1, padding: "8px", borderRadius: 6, border: "none",
                background: COLORS.green + "22", color: COLORS.green, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit"
              }}>+ Pipeline</button>
            </div>
          </>
        )}
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
    setTimeout(() => setToast({ message: "", type: "success" }), 3500);
  };

  const NAV = [
    { id: "prospecting", label: "Hitta leads", emoji: "🔍" },
    { id: "pipeline", label: "Pipeline", emoji: "📡" },
    { id: "messages", label: "Meddelanden", emoji: "✍️" },
    { id: "accounts", label: "Kunder", emoji: "🤝" },
    { id: "pulse", label: "Pulse", emoji: "📊" },
    { id: "costs", label: "Kostnader", emoji: "💸" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
        select option { background: #1A1A1A; color: #F0EDE8; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
      `}</style>

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
            padding: "0 16px", height: 54, border: "none", background: "none", cursor: "pointer",
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
          <span style={{ color: COLORS.muted, fontSize: 11, fontFamily: "DM Mono, monospace" }}>live</span>
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1300, margin: "0 auto" }}>
        {view === "prospecting" && <ProspectingView showToast={showToast} />}
        {view === "pipeline" && <PipelineView showToast={showToast} />}
        {view === "messages" && <MessagePanel showToast={showToast} />}
        {view === "accounts" && <AccountsView showToast={showToast} />}
        {view === "pulse" && <PulseView showToast={showToast} />}
        {view === "costs" && <CostsView showToast={showToast} />}
      </div>

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}
