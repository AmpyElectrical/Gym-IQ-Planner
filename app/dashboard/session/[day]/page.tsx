"use client";

import React from "react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Exercise = {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  difficulty: string;
  description: string;
};

type PBResult = {
  exerciseName: string;
  weight: number;
  reps: number;
  estE1rm: number;
  bucketId: string;
};

const SESSION_META: Record<string, { label: string; icon: string; color: string }> = {
  push:    { label: "Push Day",            icon: "💪", color: "#FF5F1F" },
  pull:    { label: "Pull Day",            icon: "🔙", color: "#FF8C42" },
  legs:    { label: "Leg Day",             icon: "🦵", color: "#34D399" },
  upper:   { label: "Upper Body",          icon: "🏋️", color: "#FF8C42" },
  lower:   { label: "Lower Body",          icon: "⬇️", color: "#34D399" },
  arms:    { label: "Arms Day",            icon: "💪", color: "#A78BFA" },
  core:    { label: "Core Day",            icon: "🎯", color: "#22D3EE" },
  cardio:  { label: "Cardio",              icon: "🏃", color: "#F472B6" },
  stretch: { label: "Stretch / Recovery",  icon: "🧘", color: "#34D399" },
  rest:    { label: "Rest Day",            icon: "😴", color: "#666"    },
  custom:  { label: "Custom Session",      icon: "✏️", color: "#FF5F1F" },
};

const SESSION_BODY_PARTS: Record<string, string[]> = {
  push:   ["chest", "shoulders", "arms"],
  pull:   ["back",  "arms"],
  legs:   ["legs"],
  upper:  ["chest", "back", "shoulders", "arms"],
  lower:  ["legs",  "core"],
  arms:   ["arms"],
  core:   ["core"],
  cardio: ["cardio"],
  custom: ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"],
};

const SESSION_TARGETS: Record<string, { sets: number; reps: number }> = {
  push:   { sets: 3, reps: 10 },
  pull:   { sets: 3, reps: 10 },
  legs:   { sets: 4, reps: 8  },
  upper:  { sets: 3, reps: 10 },
  lower:  { sets: 4, reps: 8  },
  arms:   { sets: 3, reps: 12 },
  core:   { sets: 3, reps: 15 },
  cardio: { sets: 3, reps: 20 },
  custom: { sets: 3, reps: 10 },
};

const BUCKETS = [
  { id: "1",    label: "1 RM",    color: "#FF5F1F" },
  { id: "2-3",  label: "2–3 RM",  color: "#FF8C42" },
  { id: "3-5",  label: "3–5 RM",  color: "#FBBF24" },
  { id: "5-8",  label: "5–8 RM",  color: "#34D399" },
  { id: "8-12", label: "8–12 RM", color: "#60A5FA" },
  { id: "12+",  label: "12+ RM",  color: "#A78BFA" },
];

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard"         },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan"    },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs"     },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks"   },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: "/dashboard/coach"   },
  { id: "profile", icon: "👤",  label: "Profile", route: "/dashboard/profile" },
];

const e1RM = (w: number, r: number) => (r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10);

const inputStyle: React.CSSProperties = {
  background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #333",
  borderRadius: 10, padding: "10px 14px", fontSize: 15,
  fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%",
};

function SessionContent({ day }: { day: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeId = searchParams.get("typeId") ?? "custom";

  const [pageLoading, setPageLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [inputs, setInputs] = useState<Record<string, { weight: string; reps: string }>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [logResults, setLogResults] = useState<Record<string, { isPB: boolean; bucketId: string } | "logging">>({});
  const [pbModal, setPbModal] = useState<PBResult | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.replace("/"); return null; } return r.json(); })
      .then((d) => { if (!d) return; setPageLoading(false); })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (pageLoading) return;
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => setExercises(d.exercises ?? []));
  }, [pageLoading]);

  const meta = SESSION_META[typeId] ?? SESSION_META.custom;
  const bodyParts = SESSION_BODY_PARTS[typeId] ?? [];
  const target = SESSION_TARGETS[typeId] ?? { sets: 3, reps: 10 };

  const grouped = bodyParts.map((bp) => ({
    bodyPart: bp,
    exercises: exercises.filter((e) => e.bodyPart === bp),
  })).filter((g) => g.exercises.length > 0);

  function setInput(id: string, field: "weight" | "reps", value: string) {
    setInputs((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { weight: "", reps: "" }), [field]: value } }));
  }

  async function handleLog(ex: Exercise) {
    const inp = inputs[ex.id] ?? { weight: "", reps: "" };
    if (!inp.weight || !inp.reps) return;
    const w = parseFloat(inp.weight);
    const r = parseInt(inp.reps);
    if (!w || !r) return;

    setLogResults((prev) => ({ ...prev, [ex.id]: "logging" }));
    try {
      const res = await fetch("/api/pbs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseName: ex.name, weight: w, reps: r }),
      });
      const data = await res.json();
      setLogResults((prev) => ({ ...prev, [ex.id]: { isPB: data.isPB, bucketId: data.bucketId } }));
      if (data.isPB) {
        setPbModal({ exerciseName: ex.name, weight: w, reps: r, estE1rm: e1RM(w, r), bucketId: data.bucketId });
      }
    } catch {
      setLogResults((prev) => { const n = { ...prev }; delete n[ex.id]; return n; });
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

  const renderCard = (ex: Exercise) => {
    const inp = inputs[ex.id] ?? { weight: "", reps: "" };
    const result = logResults[ex.id];
    const isLogging = result === "logging";
    const logged = result && result !== "logging" ? result : null;
    const isExpanded = expanded[ex.id] ?? false;
    const canLog = !!inp.weight && !!inp.reps && parseFloat(inp.weight) > 0 && parseInt(inp.reps) > 0;

    return (
      <div key={ex.id} style={{ background: "#161616", border: `1px solid ${logged?.isPB ? "#FF5F1F55" : "#222"}`, borderRadius: 14, padding: 16, marginBottom: 10 }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#F5F5F5", lineHeight: 1.1 }}>
              {ex.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}44`, borderRadius: 6, padding: "2px 8px", textTransform: "uppercase" }}>
                {ex.bodyPart}
              </span>
              <span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {ex.equipment} · {target.sets}×{target.reps}
              </span>
            </div>
          </div>
          <button
            onClick={() => setExpanded((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
            style={{ background: "#1E1E1E", border: "1px solid #2a2a2a", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: isExpanded ? "#FF5F1F" : "#555", fontSize: 14, flexShrink: 0, marginLeft: 10 }}
          >
            ℹ
          </button>
        </div>

        {/* Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>WEIGHT (kg)</label>
            <input
              type="number"
              placeholder="e.g. 80"
              value={inp.weight}
              onChange={(e) => setInput(ex.id, "weight", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
              onBlur={(e) => (e.target.style.borderColor = "#333")}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>REPS</label>
            <input
              type="number"
              placeholder="e.g. 8"
              value={inp.reps}
              onChange={(e) => setInput(ex.id, "reps", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
              onBlur={(e) => (e.target.style.borderColor = "#333")}
            />
          </div>
        </div>

        {/* Log button or result */}
        {logged ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: logged.isPB ? "#FF5F1F22" : "#1E1E1E", border: `1px solid ${logged.isPB ? "#FF5F1F55" : "#333"}` }}>
            <span style={{ fontSize: 18 }}>{logged.isPB ? "🏆" : "✅"}</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, color: logged.isPB ? "#FF5F1F" : "#F5F5F5" }}>
              {logged.isPB ? "NEW PERSONAL BEST!" : "LOGGED"}
            </span>
          </div>
        ) : (
          <button
            onClick={() => handleLog(ex)}
            disabled={!canLog || isLogging}
            style={{
              width: "100%", padding: "11px 0", borderRadius: 50, border: "none",
              background: !canLog || isLogging ? "#222" : meta.color,
              color: !canLog || isLogging ? "#555" : "#fff",
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 1.5,
              cursor: !canLog || isLogging ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {isLogging ? "LOGGING..." : "LOG LIFT"}
          </button>
        )}

        {/* Expandable description */}
        {isExpanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a2a" }}>
            <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {ex.description}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#F5F5F5", fontFamily: "'Barlow', sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>

        {/* Back + breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "8px 14px", color: "#999", fontSize: 13, cursor: "pointer", fontFamily: "'Barlow', sans-serif", fontWeight: 600, flexShrink: 0 }}
          >
            ← Back
          </button>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#555", textTransform: "uppercase" }}>
            {day} · {meta.label}
          </span>
        </div>

        {/* Session hero */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, flexShrink: 0, background: `${meta.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 30, lineHeight: 1, color: "#F5F5F5" }}>
              {meta.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Target: {target.sets} sets × {target.reps} reps per exercise
            </div>
          </div>
        </div>

        {/* Rest / Stretch placeholder */}
        {grouped.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>{meta.icon}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: "#444" }}>
              {typeId === "rest" ? "RECOVERY DAY" : typeId === "stretch" ? "STRETCH & RECOVER" : "NO EXERCISES"}
            </div>
            <div style={{ fontSize: 14, color: "#444", marginTop: 8 }}>Rest up — you've earned it.</div>
          </div>
        )}

        {/* Exercises grouped by body part */}
        {grouped.map((group) => (
          <div key={group.bodyPart} style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 12px" }}>
              {group.bodyPart.toUpperCase()}
            </p>
            {group.exercises.map(renderCard)}
          </div>
        ))}

        {/* Done for today */}
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 50, border: "none",
            background: "#161616", color: "#666",
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 1.5,
            cursor: "pointer", marginTop: 8, marginBottom: 8,
            border: "1px solid #222",
          } as React.CSSProperties}
        >
          DONE FOR TODAY ›
        </button>
      </div>

      {/* PB Celebration Modal */}
      {pbModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 88, marginBottom: 4, lineHeight: 1 }}>🏆</div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#FF5F1F", textTransform: "uppercase", margin: "0 0 8px" }}>NEW PERSONAL BEST</p>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 34, color: "#F5F5F5", lineHeight: 1.1, marginBottom: 24 }}>
            {pbModal.exerciseName.toUpperCase()}
          </div>

          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 24, width: "100%", maxWidth: 320, marginBottom: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>WEIGHT</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#F5F5F5" }}>
                  {pbModal.weight} <span style={{ fontSize: 16, color: "#666" }}>kg</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>REPS</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#F5F5F5" }}>{pbModal.reps}</div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #222", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>EST. 1RM</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#FF5F1F" }}>
                  {pbModal.estE1rm} <span style={{ fontSize: 16, color: "#FF8C42" }}>kg</span>
                </div>
              </div>
              {(() => {
                const bkt = BUCKETS.find((b) => b.id === pbModal.bucketId);
                return bkt ? (
                  <div style={{ background: `${bkt.color}22`, border: `1px solid ${bkt.color}66`, borderRadius: 10, padding: "8px 16px" }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: bkt.color }}>{bkt.label}</div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          <button
            onClick={() => setPbModal(null)}
            style={{ padding: "14px 48px", borderRadius: 50, border: "none", background: "#FF5F1F", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: 1.5, cursor: "pointer" }}
          >
            KEEP GOING
          </button>
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99, background: "#0A0A0A", borderTop: "1px solid #222", display: "flex", justifyContent: "space-around", padding: "8px 0 max(8px, env(safe-area-inset-bottom))" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => router.push(t.route)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "2px 6px", color: "#666", fontFamily: "'Barlow', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, transition: "all 0.2s" }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function SessionPage({ params }: { params: { day: string } }) {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <SessionContent day={params.day} />
    </Suspense>
  );
}
