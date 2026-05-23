"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SESSION_TYPES = [
  { id: "push",    label: "Push",             icon: "💪", color: "#FF5F1F" },
  { id: "pull",    label: "Pull",             icon: "🔙", color: "#FF8C42" },
  { id: "legs",    label: "Legs",             icon: "🦵", color: "#34D399" },
  { id: "upper",   label: "Upper Body",       icon: "🏋️", color: "#FF8C42" },
  { id: "lower",   label: "Lower Body",       icon: "⬇️", color: "#34D399" },
  { id: "arms",    label: "Arms",             icon: "💪", color: "#A78BFA" },
  { id: "core",    label: "Core",             icon: "🎯", color: "#22D3EE" },
  { id: "cardio",  label: "Cardio",           icon: "🏃", color: "#F472B6" },
  { id: "stretch", label: "Stretch/Recovery", icon: "🧘", color: "#34D399" },
  { id: "rest",    label: "Rest",             icon: "😴", color: "#666"    },
];

const SESSION_BODY_PARTS: Record<string, string[]> = {
  push:   ["chest", "shoulders", "arms"],
  pull:   ["back",  "arms"],
  legs:   ["legs"],
  upper:  ["chest", "back", "shoulders", "arms"],
  lower:  ["legs",  "core"],
  arms:   ["arms"],
  core:   ["core"],
  cardio: ["cardio"],
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
};

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard" },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan" },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs" },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks" },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: "/dashboard/coach" },
  { id: "profile", icon: "👤",  label: "Profile", route: "/dashboard/profile" },
];

type PlanEntry = { id: string; day: string; week: string; typeId: string };
type Exercise  = { id: string; name: string; bodyPart: string; equipment: string; description: string };

export default function PlanPage() {
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [week, setWeek] = useState<"1" | "2">("1");
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailDay, setDetailDay] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expandedEx, setExpandedEx] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => { if (!res.ok) { router.replace("/"); return null; } return res.json(); })
      .then((data) => { if (!data) return; setPageLoading(false); })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (pageLoading) return;
    fetch("/api/plan")
      .then((res) => res.json())
      .then((data) => setPlan(data.plan ?? []))
      .catch(() => {});
    fetch("/api/exercises")
      .then((res) => res.json())
      .then((data) => setExercises(data.exercises ?? []))
      .catch(() => {});
  }, [pageLoading]);

  const getEntry = (day: string) => plan.find((p) => p.day === day && p.week === week) ?? null;
  const getType  = (typeId: string) => SESSION_TYPES.find((s) => s.id === typeId) ?? null;

  async function handleSelect(typeId: string) {
    if (!selectedDay) return;
    setSaving(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: selectedDay, week, typeId }),
      });
      const data = await res.json();
      setPlan((prev) => [
        ...prev.filter((p) => !(p.day === selectedDay && p.week === week)),
        data.plan,
      ]);
    } finally {
      setSaving(false);
      setSelectedDay(null);
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

  // ── Detail view data (computed when detailDay is set) ──
  const detailEntry = detailDay ? getEntry(detailDay) : null;
  const detailSt    = detailEntry ? getType(detailEntry.typeId) : null;
  const detailBodyParts = detailEntry ? (SESSION_BODY_PARTS[detailEntry.typeId] ?? []) : [];
  const detailTarget    = detailEntry ? (SESSION_TARGETS[detailEntry.typeId] ?? { sets: 3, reps: 10 }) : { sets: 3, reps: 10 };
  const detailGrouped   = detailBodyParts
    .map((bp) => ({ bodyPart: bp, exercises: exercises.filter((e) => e.bodyPart === bp) }))
    .filter((g) => g.exercises.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#F5F5F5", fontFamily: "'Barlow', sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>YOUR</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1, margin: 0 }}>
            TRAINING PLAN
          </h1>
        </div>

        {/* Week toggle */}
        <div style={{ display: "flex", background: "#161616", borderRadius: 50, padding: 4, marginBottom: 24, border: "1px solid #222" }}>
          {(["1", "2"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 50, border: "none",
                background: week === w ? "#FF5F1F" : "transparent",
                color: week === w ? "#fff" : "#666",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 16, letterSpacing: 1, cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              WEEK {w}
            </button>
          ))}
        </div>

        {/* Day cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DAYS.map((day) => {
            const entry = getEntry(day);
            const st = entry ? getType(entry.typeId) : null;
            return (
              <div
                key={day}
                style={{
                  display: "flex", alignItems: "center",
                  background: "#161616", border: "1px solid #222", borderRadius: 14,
                  overflow: "hidden", transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#444")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#222")}
              >
                {/* Main tap area — opens session picker */}
                <button
                  onClick={() => setSelectedDay(day)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 16,
                    padding: "14px 18px", cursor: "pointer", textAlign: "left",
                    background: "transparent", border: "none",
                  }}
                >
                  {/* Day label */}
                  <div style={{ width: 40, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, color: "#555", flexShrink: 0 }}>
                    {day}
                  </div>

                  {/* Session icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: st ? `${st.color}22` : "#1E1E1E",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                  }}>
                    {st ? st.icon : ""}
                  </div>

                  {/* Session name or placeholder */}
                  <div style={{ flex: 1 }}>
                    {st ? (
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#F5F5F5" }}>
                        {st.label.toUpperCase()}
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, color: "#444", fontStyle: "italic" }}>Tap to assign</div>
                    )}
                  </div>

                  {!st && <div style={{ fontSize: 20, color: "#333" }}>+</div>}
                </button>

                {/* Detail chevron — only when session is assigned */}
                {st && (
                  <button
                    onClick={() => setDetailDay(day)}
                    style={{
                      padding: "0 18px", alignSelf: "stretch", flexShrink: 0,
                      background: `${st.color}18`, border: "none", borderLeft: "1px solid #2a2a2a",
                      color: st.color, fontSize: 22, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = `${st.color}30`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = `${st.color}18`)}
                    title="View exercises"
                  >
                    ›
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SESSION DETAIL OVERLAY ── */}
      {detailDay && detailSt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 160, background: "#000", overflowY: "auto" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 96px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 4px" }}>
                  WEEK {week} · {detailDay}
                </p>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, lineHeight: 1, margin: 0, color: "#F5F5F5" }}>
                  {detailSt.label.toUpperCase()}
                </h2>
              </div>
              <button
                onClick={() => setDetailDay(null)}
                style={{ background: "#161616", border: "1px solid #222", borderRadius: 50, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Session hero */}
            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, flexShrink: 0, background: `${detailSt.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
                {detailSt.icon}
              </div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1, color: "#F5F5F5" }}>
                  {detailSt.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  Target: {detailTarget.sets} sets × {detailTarget.reps} reps per exercise
                </div>
              </div>
            </div>

            {/* No exercises (rest/stretch) */}
            {detailGrouped.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{detailSt.icon}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22 }}>
                  REST UP — YOU&#39;VE EARNED IT
                </div>
              </div>
            )}

            {/* Exercises grouped by body part */}
            {detailGrouped.map((group) => (
              <div key={group.bodyPart} style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 12px" }}>
                  {group.bodyPart.toUpperCase()}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {group.exercises.map((ex) => {
                    const isExpanded = expandedEx[ex.id] ?? false;
                    return (
                      <div
                        key={ex.id}
                        style={{ background: "#161616", border: "1px solid #222", borderRadius: 14, padding: 16 }}
                      >
                        {/* Exercise header row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#F5F5F5", lineHeight: 1.1 }}>
                              {ex.name}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: detailSt.color, background: `${detailSt.color}18`, border: `1px solid ${detailSt.color}44`, borderRadius: 6, padding: "2px 7px", textTransform: "uppercase" }}>
                                {ex.bodyPart}
                              </span>
                              <span style={{ fontSize: 11, color: "#555" }}>
                                {ex.equipment} · {detailTarget.sets}×{detailTarget.reps}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setExpandedEx((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                            style={{
                              background: isExpanded ? "#FF5F1F22" : "#1E1E1E",
                              border: `1px solid ${isExpanded ? "#FF5F1F55" : "#2a2a2a"}`,
                              borderRadius: 8, width: 30, height: 30,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", color: isExpanded ? "#FF5F1F" : "#555",
                              fontSize: 14, flexShrink: 0, marginLeft: 10,
                            }}
                          >
                            ℹ
                          </button>
                        </div>

                        {/* Expandable description */}
                        {isExpanded && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a2a", fontSize: 13, color: "#ccc", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                            {ex.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session picker bottom sheet */}
      {selectedDay && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.88)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
          onClick={() => !saving && setSelectedDay(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#161616", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", maxHeight: "80vh", overflowY: "auto" }}
          >
            {/* Sheet header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 4px" }}>
                  {selectedDay} · WEEK {week}
                </p>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: "#F5F5F5" }}>
                  SELECT SESSION TYPE
                </div>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                style={{ background: "none", border: "none", color: "#666", fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Session type list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SESSION_TYPES.map((st) => (
                <button
                  key={st.id}
                  onClick={() => handleSelect(st.id)}
                  disabled={saving}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: "#1E1E1E", border: "1px solid #2a2a2a", borderRadius: 12,
                    padding: "13px 16px", cursor: saving ? "not-allowed" : "pointer",
                    textAlign: "left", width: "100%", opacity: saving ? 0.5 : 1,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.borderColor = "#444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `${st.color}22`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  }}>
                    {st.icon}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#F5F5F5" }}>
                    {st.label.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
            onClick={() => router.push(t.route)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "2px 6px",
              color: t.id === "plan" ? "#FF5F1F" : "#666",
              fontFamily: "'Barlow', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              transform: t.id === "plan" ? "translateY(-2px)" : "none",
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
