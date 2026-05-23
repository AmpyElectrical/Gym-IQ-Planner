"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard" },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan" },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs" },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks" },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: "/dashboard/coach" },
  { id: "profile", icon: "👤",  label: "Profile", route: "/dashboard/profile" },
];

const EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const PHYSICAL_DEMAND_OPTIONS = [
  "Desk/office",
  "Light physical",
  "Moderate physical (trades)",
  "Heavy physical (labour)",
  "Mixed",
];
const WEAK_POINT_OPTIONS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"];

type ProfileForm = {
  name: string;
  age: string;
  weight: string;
  experience: string;
  occupation: string;
  physicalDemand: string;
  workHours: string;
  wakeTime: string;
  sleepTime: string;
  gymTime: string;
  injuries: string;
  goals: string[];
  weakPoints: string[];
};

const EMPTY: ProfileForm = {
  name: "", age: "", weight: "", experience: "", occupation: "",
  physicalDemand: "", workHours: "", wakeTime: "", sleepTime: "",
  gymTime: "", injuries: "", goals: [], weakPoints: [],
};

export default function ProfilePage() {
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  // Dictation
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.replace("/"); return null; } return r.json(); })
      .then((d) => { if (!d) return; setPageLoading(false); })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (pageLoading) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.profile) return;
        const p = d.profile;
        setForm({
          name:           p.name           || "",
          age:            p.age            || "",
          weight:         p.weight ? String(p.weight) : "",
          experience:     p.experience     || "",
          occupation:     p.occupation     || "",
          physicalDemand: p.physicalDemand || "",
          workHours:      p.workHours      || "",
          wakeTime:       p.wakeTime       || "",
          sleepTime:      p.sleepTime      || "",
          gymTime:        p.gymTime        || "",
          injuries:       p.injuries       || "",
          goals:          Array.isArray(p.goals)      ? p.goals      : [],
          weakPoints:     Array.isArray(p.weakPoints) ? p.weakPoints : [],
        });
      })
      .catch(() => {});
  }, [pageLoading]);

  function set(field: keyof ProfileForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  function toggleWeakPoint(wp: string) {
    setForm((f) => ({
      ...f,
      weakPoints: f.weakPoints.includes(wp)
        ? f.weakPoints.filter((w) => w !== wp)
        : [...f.weakPoints, wp],
    }));
    setSaved(false);
  }

  function addGoal() {
    if (!goalInput.trim()) return;
    setForm((f) => ({ ...f, goals: [...f.goals, goalInput.trim()] }));
    setGoalInput("");
    setSaved(false);
  }

  function removeGoal(i: number) {
    setForm((f) => ({ ...f, goals: f.goals.filter((_, idx) => idx !== i) }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, weight: parseFloat(form.weight) || 0 }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function toggleRecording() {
    const SpeechRecognitionAPI =
      (typeof window !== "undefined" &&
        ((window as unknown as Record<string, unknown>).SpeechRecognition as typeof SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof SpeechRecognition)) || null;

    if (!SpeechRecognitionAPI) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-AU";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript;
      }
      setTranscript(full);
    };

    recognition.onend = () => setRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }

  async function handleInterpret() {
    if (!transcript.trim()) return;
    setInterpreting(true);
    try {
      const res = await fetch("/api/profile/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      const f = data.fields ?? {};
      setForm((prev) => ({
        name:           f.name           ?? prev.name,
        age:            f.age            ? String(f.age)    : prev.age,
        weight:         f.weight         ? String(f.weight) : prev.weight,
        experience:     f.experience     ?? prev.experience,
        occupation:     f.occupation     ?? prev.occupation,
        physicalDemand: f.physicalDemand ?? prev.physicalDemand,
        workHours:      f.workHours      ?? prev.workHours,
        wakeTime:       f.wakeTime       ?? prev.wakeTime,
        sleepTime:      f.sleepTime      ?? prev.sleepTime,
        gymTime:        f.gymTime        ?? prev.gymTime,
        injuries:       f.injuries       ?? prev.injuries,
        goals:          Array.isArray(f.goals)      ? f.goals      : prev.goals,
        weakPoints:     Array.isArray(f.weakPoints) ? f.weakPoints : prev.weakPoints,
      }));
      setSaved(false);
    } finally {
      setInterpreting(false);
    }
  }

  if (pageLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 32, height: 32, border: "3px solid #222", borderTopColor: "#FF5F1F", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#F5F5F5", fontFamily: "'Barlow', sans-serif", paddingBottom: 100 }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>YOUR</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1, margin: 0 }}>PROFILE</h1>
        </div>

        {/* ── DICTATION CARD ── */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 14px" }}>
            VOICE FILL
          </p>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            Describe yourself out loud — your job, injuries, goals, schedule — and we'll fill your profile automatically.
          </p>

          <button
            onClick={toggleRecording}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 50, border: "none",
              background: recording ? "#EF444422" : "#FF5F1F22",
              color: recording ? "#EF4444" : "#FF5F1F",
              border: `1px solid ${recording ? "#EF444455" : "#FF5F1F55"}`,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: 1.5,
              cursor: "pointer", marginBottom: 12, transition: "all 0.2s",
              animation: recording ? "pulse 1.5s ease-in-out infinite" : "none",
            } as React.CSSProperties}
          >
            {recording ? "⏹ STOP RECORDING" : "🎙 START RECORDING"}
          </button>

          {transcript && (
            <div style={{ background: "#1E1E1E", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#ccc", lineHeight: 1.6, maxHeight: 100, overflowY: "auto" }}>
              {transcript}
            </div>
          )}

          <button
            onClick={handleInterpret}
            disabled={!transcript.trim() || interpreting}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 50, border: "none",
              background: !transcript.trim() || interpreting ? "#333" : "#1E1E1E",
              color: !transcript.trim() || interpreting ? "#555" : "#F5F5F5",
              border: "1px solid #333",
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 1,
              cursor: !transcript.trim() || interpreting ? "not-allowed" : "pointer",
            } as React.CSSProperties}
          >
            {interpreting ? "INTERPRETING..." : "⚡ FILL PROFILE FROM TRANSCRIPT"}
          </button>
        </div>

        {/* ── BASICS CARD ── */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: 0 }}>BASICS</p>

          <Field label="NAME">
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Alex" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="AGE">
              <input value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 28" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="BODYWEIGHT (kg)">
              <input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="e.g. 82" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
          </div>

          <Field label="EXPERIENCE">
            <div style={{ display: "flex", gap: 6 }}>
              {EXPERIENCE_OPTIONS.map((o) => (
                <button key={o} onClick={() => set("experience", o)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: form.experience === o ? "2px solid #FF5F1F" : "1px solid #333", background: form.experience === o ? "#FF5F1F22" : "#1E1E1E", color: form.experience === o ? "#FF5F1F" : "#666", fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {o}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* ── SCHEDULE CARD ── */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: 0 }}>SCHEDULE</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="WAKE TIME">
              <input value={form.wakeTime} onChange={(e) => set("wakeTime", e.target.value)} placeholder="e.g. 5:30am" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="SLEEP TIME">
              <input value={form.sleepTime} onChange={(e) => set("sleepTime", e.target.value)} placeholder="e.g. 9:30pm" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
          </div>

          <Field label="GYM TIME">
            <input value={form.gymTime} onChange={(e) => set("gymTime", e.target.value)} placeholder="e.g. 5am" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>
        </div>

        {/* ── OCCUPATION CARD ── */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: 0 }}>OCCUPATION</p>

          <Field label="JOB TITLE">
            <input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="e.g. Electrician" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>

          <Field label="PHYSICAL DEMAND OF JOB">
            <select value={form.physicalDemand} onChange={(e) => set("physicalDemand", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Select…</option>
              {PHYSICAL_DEMAND_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="WORK HOURS">
            <input value={form.workHours} onChange={(e) => set("workHours", e.target.value)} placeholder="e.g. 7am–3pm" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>
        </div>

        {/* ── INJURIES CARD ── */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 16px" }}>INJURIES / LIMITATIONS</p>
          <textarea value={form.injuries} onChange={(e) => set("injuries", e.target.value)} placeholder="e.g. Left shoulder impingement, lower back tightness" rows={3} style={{ ...inputStyle, resize: "none" }} onFocus={focusStyle} onBlur={blurStyle} />
        </div>

        {/* ── GOALS CARD ── */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 16px" }}>GOALS</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {form.goals.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FF5F1F22", border: "1px solid #FF5F1F44", borderRadius: 8, padding: "4px 10px" }}>
                <span style={{ fontSize: 13, color: "#F5F5F5" }}>{g}</span>
                <button onClick={() => removeGoal(i)} style={{ background: "none", border: "none", color: "#FF5F1F", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGoal())} placeholder="Add a goal and press Enter" style={{ ...inputStyle, flex: 1 }} onFocus={focusStyle} onBlur={blurStyle} />
            <button onClick={addGoal} disabled={!goalInput.trim()} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: goalInput.trim() ? "#FF5F1F" : "#333", color: goalInput.trim() ? "#fff" : "#555", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, cursor: goalInput.trim() ? "pointer" : "not-allowed" }}>
              ADD
            </button>
          </div>
        </div>

        {/* ── WEAK POINTS CARD ── */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 14px" }}>PRIORITY / WEAK POINTS</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {WEAK_POINT_OPTIONS.map((wp) => (
              <button
                key={wp}
                onClick={() => toggleWeakPoint(wp)}
                style={{
                  padding: "9px 16px", borderRadius: 10, cursor: "pointer",
                  border: form.weakPoints.includes(wp) ? "2px solid #FF5F1F" : "1px solid #333",
                  background: form.weakPoints.includes(wp) ? "#FF5F1F22" : "#1E1E1E",
                  color: form.weakPoints.includes(wp) ? "#FF5F1F" : "#666",
                  fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 700,
                  transition: "all 0.15s",
                }}
              >
                {wp}
              </button>
            ))}
          </div>
        </div>

        {/* ── SAVE BUTTON ── */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 50, border: "none",
            background: saved ? "#22C55E" : saving ? "#333" : "#FF5F1F",
            color: saving ? "#666" : "#fff",
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 1.5,
            cursor: saving ? "not-allowed" : "pointer", transition: "background 0.2s",
          }}
        >
          {saved ? "✓ SAVED" : saving ? "SAVING..." : "SAVE PROFILE"}
        </button>
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99,
        background: "#0A0A0A", borderTop: "1px solid #222",
        display: "flex", justifyContent: "space-around",
        padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => t.route && router.push(t.route)}
            style={{
              background: "none", border: "none", cursor: t.route ? "pointer" : "default",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "2px 6px",
              color: t.id === "profile" ? "#FF5F1F" : "#666",
              fontFamily: "'Barlow', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              transform: t.id === "profile" ? "translateY(-2px)" : "none",
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #333",
  borderRadius: 10, padding: "10px 14px", fontSize: 14,
  fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%",
};

const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = "#FF5F1F");
const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = "#333");
