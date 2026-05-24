"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// Web Speech API types removed from TypeScript DOM lib in TS 5.9
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
declare var SpeechRecognition: { prototype: SpeechRecognition; new(): SpeechRecognition };

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard" },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan" },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs" },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks" },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: "/dashboard/coach" },
  { id: "profile",  icon: "👤",  label: "Profile",  route: "/dashboard/profile"  },
  { id: "settings", icon: "⚙️",  label: "Settings", route: "/dashboard/settings" },
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
const TIMEZONE_OPTIONS = [
  { value: "Australia/Melbourne", label: "Melbourne / Sydney (AEST)" },
  { value: "Australia/Sydney",    label: "Sydney (AEDT)" },
  { value: "Australia/Brisbane",  label: "Brisbane (AEST, no DST)" },
  { value: "Australia/Adelaide",  label: "Adelaide (ACST)" },
  { value: "Australia/Perth",     label: "Perth (AWST)" },
  { value: "Australia/Darwin",    label: "Darwin (ACST, no DST)" },
  { value: "Australia/Hobart",    label: "Hobart (AEST)" },
  { value: "Pacific/Auckland",    label: "Auckland (NZST)" },
  { value: "Asia/Singapore",      label: "Singapore (SGT)" },
  { value: "Europe/London",       label: "London (GMT/BST)" },
  { value: "America/New_York",    label: "New York (ET)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
];

type ProfileNote = { id: string; content: string; createdAt: string };

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
  programStartDate: string;
  timezone: string;
  injuries: string;
  goals: string[];
  weakPoints: string[];
};

const EMPTY: ProfileForm = {
  name: "", age: "", weight: "", experience: "", occupation: "",
  physicalDemand: "", workHours: "", wakeTime: "", sleepTime: "",
  gymTime: "", programStartDate: "", timezone: "Australia/Melbourne", injuries: "", goals: [], weakPoints: [],
};

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [pageLoading, setPageLoading] = useState(true);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  // ── Security fields ──
  const [username, setUsername]         = useState("");
  const [nickname, setNickname]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Dictation
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Notes
  const [notes, setNotes] = useState<ProfileNote[]>([]);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [interpretSummary, setInterpretSummary] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.replace("/"); return null; } return r.json(); })
      .then((d) => { if (!d) return; setUsername(d.user.username ?? ""); setNickname(d.user.nickname ?? ""); setPageLoading(false); })
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
          gymTime:          p.gymTime          || "",
          programStartDate: p.programStartDate ? new Date(p.programStartDate).toISOString().split("T")[0] : "",
          timezone:         p.timezone         || "Australia/Melbourne",
          injuries:         p.injuries         || "",
          goals:          Array.isArray(p.goals)      ? p.goals      : [],
          weakPoints:     Array.isArray(p.weakPoints) ? p.weakPoints : [],
        });
      })
      .catch(() => {});
    fetch("/api/profile/notes")
      .then((r) => r.json())
      .then((d) => setNotes(d.notes ?? []))
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
      const saves: Promise<unknown>[] = [
        fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, weight: parseFloat(form.weight) || 0 }),
        }),
      ];
      const securityBody: Record<string, string | null> = {};
      if (username) securityBody.username = username;
      securityBody.nickname = nickname || null;
      if (password) securityBody.password = password;
      if (Object.keys(securityBody).length > 0) {
        saves.push(
          fetch("/api/users/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(securityBody),
          })
        );
      }
      await Promise.all(saves);
      setSaved(true);
      setPassword("");
    } finally {
      setSaving(false);
    }
  }

  function toggleRecording() {
    setSpeechError("");

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const SpeechRecognitionAPI =
      (typeof window !== "undefined" &&
        ((window as unknown as Record<string, unknown>).SpeechRecognition as typeof SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof SpeechRecognition)) || null;

    if (!SpeechRecognitionAPI) {
      setSpeechError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
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

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed") {
        setSpeechError("Microphone permission denied. Allow mic access and try again.");
      } else if (e.error !== "aborted") {
        setSpeechError(`Speech error: ${e.error}`);
      }
      setRecording(false);
    };

    recognition.onend = () => setRecording(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setRecording(true);
    } catch {
      setSpeechError("Could not start recording. Ensure the page is served over HTTPS.");
    }
  }

  async function handleInterpret() {
    if (!transcript.trim()) return;
    setInterpreting(true);
    const savedTranscript = transcript;
    try {
      const res = await fetch("/api/profile/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: savedTranscript }),
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
        goals:            Array.isArray(f.goals)      ? f.goals      : prev.goals,
        weakPoints:       Array.isArray(f.weakPoints) ? f.weakPoints : prev.weakPoints,
        programStartDate: prev.programStartDate,
        timezone:         prev.timezone,
      }));
      const FIELD_LABELS: Record<string, string> = {
        name: "name", age: "age", weight: "weight", experience: "experience",
        occupation: "occupation", physicalDemand: "job demand", workHours: "work hours",
        wakeTime: "wake time", sleepTime: "sleep time", gymTime: "gym time",
        injuries: "injuries", goals: "goals", weakPoints: "priority areas",
      };
      const filled = Object.keys(f).filter((k) => f[k] !== undefined && f[k] !== null && (Array.isArray(f[k]) ? (f[k] as unknown[]).length > 0 : String(f[k]).trim() !== ""));
      setInterpretSummary(filled.length > 0 ? `Filled in: ${filled.map((k) => FIELD_LABELS[k] ?? k).join(", ")}` : "No fields recognised — try speaking more detail.");
      setSaved(false);
      fetch("/api/profile/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: savedTranscript }),
      }).then((r) => r.json()).then((d) => { if (d.note) setNotes((prev) => [d.note, ...prev]); }).catch(() => {});
    } finally {
      setInterpreting(false);
    }
  }

  async function deleteNote(id: string) {
    setDeletingNoteId(id);
    try {
      await fetch(`/api/profile/notes/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } finally {
      setDeletingNoteId(null);
    }
  }

  if (pageLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 32, height: 32, border: "3px solid #222", borderTopColor: "#FF5F1F", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "'Barlow', sans-serif", paddingBottom: 100 }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>YOUR</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1, margin: 0 }}>PROFILE</h1>
        </div>

        {/* ── DICTATION CARD ── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 14px" }}>
            VOICE FILL
          </p>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            Describe yourself out loud — your job, injuries, goals, schedule — and we'll fill your profile automatically.
          </p>

          <button
            onClick={toggleRecording}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 50,
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

          {speechError && (
            <div style={{ background: "#EF444418", border: "1px solid #EF444444", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#EF4444", lineHeight: 1.5 }}>
              {speechError}
            </div>
          )}

          {transcript && (
            <div style={{ background: "var(--input-bg)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#ccc", lineHeight: 1.6, maxHeight: 100, overflowY: "auto" }}>
              {transcript}
            </div>
          )}

          {!recording && transcript && (
            <button
              onClick={handleInterpret}
              disabled={interpreting}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 50,
                background: interpreting ? "#333" : "#1E1E1E",
                color: interpreting ? "#555" : "#F5F5F5",
                border: "1px solid var(--border)",
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 1,
                cursor: interpreting ? "not-allowed" : "pointer",
              } as React.CSSProperties}
            >
              {interpreting ? "INTERPRETING..." : "⚡ FILL PROFILE FROM TRANSCRIPT"}
            </button>
          )}
          {interpretSummary && !interpreting && (
            <div style={{ background: "#22C55E18", border: "1px solid #22C55E44", borderRadius: 10, padding: "10px 14px", marginTop: 8, fontSize: 13, color: "#22C55E", lineHeight: 1.5 }}>
              {interpretSummary}
            </div>
          )}
        </div>

        {/* ── PERSONAL DETAILS CARD ── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: 0 }}>PERSONAL DETAILS</p>

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
                <button key={o} onClick={() => set("experience", o)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: form.experience === o ? "2px solid #FF5F1F" : "1px solid var(--border)", background: form.experience === o ? "#FF5F1F22" : "#1E1E1E", color: form.experience === o ? "#FF5F1F" : "#666", fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {o}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* ── SECURITY CARD ── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: 0 }}>SECURITY</p>

          <Field label="USERNAME">
            <input value={username} onChange={(e) => { setUsername(e.target.value); setSaved(false); }} placeholder="e.g. ironmike" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>

          <Field label="PASSWORD">
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setSaved(false); }}
                placeholder="Leave blank to keep current"
                style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
              <button
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </Field>

          <Field label="NICKNAME">
            <input value={nickname} onChange={(e) => { setNickname(e.target.value); setSaved(false); }} placeholder="Displayed on leaderboard" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            <p style={{ fontSize: 11, color: "#555", marginTop: 6, marginBottom: 0 }}>This is the name other users see on the leaderboard. Leave blank to use your username.</p>
          </Field>
        </div>

        {/* ── SCHEDULE CARD ── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
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

          <Field label="PROGRAM START DATE">
            <input type="date" value={form.programStartDate} onChange={(e) => set("programStartDate", e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>

          <Field label="TIMEZONE">
            <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }} onFocus={focusStyle} onBlur={blurStyle}>
              {TIMEZONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p style={{ fontSize: 11, color: "#555", marginTop: 6, marginBottom: 0 }}>Used to show the correct session on your home screen.</p>
          </Field>
        </div>

        {/* ── OCCUPATION CARD ── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
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
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 16px" }}>INJURIES & LIMITATIONS</p>
          <textarea value={form.injuries} onChange={(e) => set("injuries", e.target.value)} placeholder="e.g. Left shoulder impingement, lower back tightness" rows={3} style={{ ...inputStyle, resize: "none" }} onFocus={focusStyle} onBlur={blurStyle} />
        </div>

        {/* ── GOALS CARD ── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 16px" }}>GOALS</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {form.goals.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FF5F1F22", border: "1px solid #FF5F1F44", borderRadius: 8, padding: "4px 10px" }}>
                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{g}</span>
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
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 14px" }}>PRIORITY AREAS</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {WEAK_POINT_OPTIONS.map((wp) => (
              <button
                key={wp}
                onClick={() => toggleWeakPoint(wp)}
                style={{
                  padding: "9px 16px", borderRadius: 10, cursor: "pointer",
                  border: form.weakPoints.includes(wp) ? "2px solid #FF5F1F" : "1px solid var(--border)",
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

        {/* ── CONVERSATION HISTORY CARD ── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginTop: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 16px" }}>CONVERSATION HISTORY</p>
          {notes.length === 0 ? (
            <p style={{ fontSize: 13, color: "#444", fontStyle: "italic", margin: 0 }}>No notes yet. Voice dictation transcripts will appear here.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {notes.map((note) => (
                <div key={note.id} style={{ background: "var(--input-bg)", border: "1px solid #2a2a2a", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#555", textTransform: "uppercase", marginBottom: 6 }}>
                        {new Date(note.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} · {new Date(note.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6, wordBreak: "break-word" }}>{note.content}</div>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      disabled={deletingNoteId === note.id}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #EF444433", background: "transparent", color: deletingNoteId === note.id ? "#555" : "#EF4444", fontSize: 14, cursor: deletingNoteId === note.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99,
        background: "var(--card-bg)", borderTop: "1px solid var(--border)",
        display: "flex", justifyContent: "space-around",
        padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
      }}>
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.route}
            prefetch={true}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "2px 6px",
              color: pathname === t.route ? "#FF5F1F" : "#666",
              fontFamily: "'Barlow', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              transform: pathname === t.route ? "translateY(-2px)" : "none",
              transition: "all 0.2s",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </Link>
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
  background: "var(--input-bg)", color: "var(--text-primary)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "10px 14px", fontSize: 14,
  fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%",
};

const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = "#FF5F1F");
const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = "var(--border)");
