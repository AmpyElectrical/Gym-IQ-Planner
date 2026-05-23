"use client";

import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getCurrentWeek } from "@/lib/weekUtils";

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

const SESSION_TARGETS: Record<string, { sets: number; reps: string }> = {
  push:   { sets: 3, reps: "10"   },
  pull:   { sets: 3, reps: "10"   },
  legs:   { sets: 4, reps: "8"    },
  upper:  { sets: 3, reps: "10"   },
  lower:  { sets: 4, reps: "8"    },
  arms:   { sets: 3, reps: "12"   },
  core:   { sets: 3, reps: "15"   },
  cardio: { sets: 3, reps: "20"   },
};

const BODY_PART_OPTIONS = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"];
const EQUIPMENT_OPTIONS  = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Band", "Other"];

const DEFAULT_EXERCISES: Record<string, string[]> = {
  push:  ["Bench Press", "Overhead Press", "Lateral Raises", "Tricep Pushdown"],
  pull:  ["Deadlift", "Barbell Row", "Pull-ups", "Barbell Curl"],
  legs:  ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl"],
  upper: ["Bench Press", "Barbell Row", "Overhead Press", "Pull-ups"],
  lower: ["Squat", "Romanian Deadlift", "Leg Press", "Calf Raises"],
  arms:  ["Barbell Curl", "Skull Crushers", "Hammer Curl", "Tricep Pushdown"],
  core:  ["Plank", "Cable Crunch", "Hanging Leg Raise", "Ab Wheel"],
};

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard"         },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan"    },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs"     },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks"   },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: "/dashboard/coach"   },
  { id: "profile",  icon: "👤",  label: "Profile",  route: "/dashboard/profile"  },
  { id: "settings", icon: "⚙️",  label: "Settings", route: "/dashboard/settings" },
];

type PlanEntry    = { id: string; day: string; week: string; typeId: string };
type Exercise     = { id: string; name: string; bodyPart: string; equipment: string; description: string };
type BuilderItem  = { exId: string; name: string; bodyPart: string; equipment: string; sets: number; reps: string };
type TrainingPlan = { id: string; name: string; isActive: boolean };

const inputStyle: React.CSSProperties = {
  background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #333",
  borderRadius: 8, padding: "8px 12px", fontSize: 14,
  fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%",
};

export default function PlanPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [pageLoading, setPageLoading] = useState(true);
  const [week, setWeek]               = useState<"1" | "2">("1");
  const [plan, setPlan]               = useState<PlanEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [detailDay, setDetailDay]     = useState<string | null>(null);
  const [exercises, setExercises]     = useState<Exercise[]>([]);
  const [expandedEx, setExpandedEx]         = useState<Record<string, boolean>>({});
  const [expandedBuilder, setExpandedBuilder] = useState<Record<string, boolean>>({});
  const [expandedPicker, setExpandedPicker]   = useState<Record<string, boolean>>({});

  // ── Builder state ──
  const [customizeDay, setCustomizeDay]   = useState<string | null>(null);
  const [builderItems, setBuilderItems]   = useState<BuilderItem[]>([]);
  const [builderSaving, setBuilderSaving] = useState(false);

  // ── Exercise picker state ──
  const [showExPicker, setShowExPicker]     = useState(false);
  const [pickerSearch, setPickerSearch]     = useState("");
  const [pickerBodyPart, setPickerBodyPart] = useState<string | null>(null);

  // ── Custom exercise form state ──
  const [customName, setCustomName]           = useState("");
  const [customBodyPart, setCustomBodyPart]   = useState("");
  const [customEquipment, setCustomEquipment] = useState("");
  const [customDesc, setCustomDesc]           = useState("");
  const [generatingDesc, setGeneratingDesc]   = useState(false);
  const [savingCustom, setSavingCustom]       = useState(false);

  // ── AI generate plan state ──
  const [generating, setGenerating]         = useState(false);
  const [aiReasoning, setAiReasoning]       = useState("");
  const [showAiInput, setShowAiInput]       = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");

  // ── Training plans state ──
  const [trainingPlans, setTrainingPlans]       = useState<TrainingPlan[]>([]);
  const [activePlanId, setActivePlanId]         = useState<string | null>(null);
  const [newPlanName, setNewPlanName]           = useState("");
  const [creatingPlan, setCreatingPlan]         = useState(false);
  const [showNewPlanInput, setShowNewPlanInput] = useState(false);
  const [planDataCache, setPlanDataCache]       = useState<Record<string, PlanEntry[]>>({});
  const [planSwitching, setPlanSwitching]       = useState(false);
  const [renamingPlanId, setRenamingPlanId]     = useState<string | null>(null);
  const [renameValue, setRenameValue]           = useState("");
  const [deletingPlanId, setDeletingPlanId]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => { if (!res.ok) { router.replace("/"); return null; } return res.json(); })
      .then((data) => { if (!data) return; setWeek(getCurrentWeek(data.user.createdAt)); setPageLoading(false); })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (pageLoading) return;
    Promise.all([
      fetch("/api/plans").then((r) => r.json()),
      fetch("/api/exercises").then((r) => r.json()),
    ]).then(async ([plansData, exData]) => {
      const plans: TrainingPlan[] = plansData.plans ?? [];
      setTrainingPlans(plans);
      setExercises(exData.exercises ?? []);
      if (plans.length === 0) return;
      const planData = await fetch("/api/plan").then((r) => r.json());
      const entries: PlanEntry[] = planData.plan ?? [];
      const activeId: string | null = planData.activePlan?.id ?? null;
      setPlan(entries);
      if (activeId) {
        setActivePlanId(activeId);
        setPlanDataCache({ [activeId]: entries });
      }
    }).catch(() => {});
  }, [pageLoading]);

  const getEntry = (day: string) => plan.find((p) => p.day === day && p.week === week) ?? null;
  const getType  = (typeId: string) => SESSION_TYPES.find((s) => s.id === typeId) ?? null;

  async function handleSelect(typeId: string) {
    if (!selectedDay) return;
    setSaving(true);
    try {
      const res  = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day: selectedDay, week, typeId }) });
      const data = await res.json();
      setPlan((prev) => [...prev.filter((p) => !(p.day === selectedDay && p.week === week)), data.plan]);
    } finally {
      setSaving(false);
      setSelectedDay(null);
    }
  }

  // ── Builder helpers ──
  function openBuilder(day: string) {
    const entry = getEntry(day);
    if (!entry) return;
    const target       = SESSION_TARGETS[entry.typeId] ?? { sets: 3, reps: "10" };
    const defaultNames = DEFAULT_EXERCISES[entry.typeId] ?? [];
    const defaults     = defaultNames
      .map((name) => exercises.find((e) => e.name === name))
      .filter((e): e is Exercise => !!e);
    setBuilderItems(defaults.map((ex) => ({ exId: ex.id, name: ex.name, bodyPart: ex.bodyPart, equipment: ex.equipment, sets: target.sets, reps: target.reps })));
    setCustomizeDay(day);
  }

  async function handleBuilderSave() {
    if (!customizeDay) return;
    const entry = getEntry(customizeDay);
    if (!entry) return;
    setBuilderSaving(true);
    try {
      const res  = await fetch("/api/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day: customizeDay, week, typeId: entry.typeId, exercises: builderItems }) });
      const data = await res.json();
      setPlan((prev) => [...prev.filter((p) => !(p.day === customizeDay && p.week === week)), data.plan]);
      setCustomizeDay(null);
    } finally {
      setBuilderSaving(false);
    }
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= builderItems.length) return;
    const copy = [...builderItems];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    setBuilderItems(copy);
  }

  function removeBuilderItem(idx: number) {
    setBuilderItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateBuilderItem(idx: number, field: "sets" | "reps", value: string) {
    setBuilderItems((prev) =>
      prev.map((item, i) => i === idx ? { ...item, [field]: field === "sets" ? Math.max(1, parseInt(value) || 1) : value } : item)
    );
  }

  // ── Exercise picker helpers ──
  const filteredExercises = useMemo(() => {
    let list = exercises;
    if (pickerBodyPart) list = list.filter((e) => e.bodyPart === pickerBodyPart);
    if (pickerSearch.trim()) list = list.filter((e) => e.name.toLowerCase().includes(pickerSearch.toLowerCase()));
    return list;
  }, [exercises, pickerBodyPart, pickerSearch]);

  function addExerciseToBuilder(ex: Exercise) {
    if (builderItems.some((b) => b.exId === ex.id)) return;
    setBuilderItems((prev) => [...prev, { exId: ex.id, name: ex.name, bodyPart: ex.bodyPart, equipment: ex.equipment, sets: 3, reps: "10" }]);
  }

  async function handleGenerateDesc() {
    if (!customName || !customBodyPart || !customEquipment) return;
    setGeneratingDesc(true);
    try {
      const res  = await fetch("/api/exercises/describe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: customName, bodyPart: customBodyPart, equipment: customEquipment }) });
      const data = await res.json();
      setCustomDesc(data.description ?? "");
    } finally {
      setGeneratingDesc(false);
    }
  }

  async function handleAddCustom() {
    if (!customName || !customBodyPart || !customEquipment) return;
    setSavingCustom(true);
    try {
      const res  = await fetch("/api/exercises", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: customName, bodyPart: customBodyPart, equipment: customEquipment, description: customDesc }) });
      const data = await res.json();
      const ex   = data.exercise;
      setExercises((prev) => [...prev, ex]);
      addExerciseToBuilder(ex);
      setCustomName(""); setCustomBodyPart(""); setCustomEquipment(""); setCustomDesc("");
      setShowExPicker(false);
    } finally {
      setSavingCustom(false);
    }
  }

  // ── Training plan management ──
  async function handleActivatePlan(planId: string) {
    if (planId === activePlanId) return;
    setActivePlanId(planId);
    setTrainingPlans((prev) => prev.map((p) => ({ ...p, isActive: p.id === planId })));
    if (planDataCache[planId]) {
      setPlan(planDataCache[planId]);
      fetch(`/api/plans/${planId}/activate`, { method: "POST" });
      return;
    }
    setPlanSwitching(true);
    setPlan([]);
    try {
      await fetch(`/api/plans/${planId}/activate`, { method: "POST" });
      const data = await fetch("/api/plan").then((r) => r.json());
      const entries: PlanEntry[] = data.plan ?? [];
      setPlan(entries);
      setPlanDataCache((prev) => ({ ...prev, [planId]: entries }));
    } finally {
      setPlanSwitching(false);
    }
  }

  async function handleCreatePlan() {
    if (!newPlanName.trim()) return;
    setCreatingPlan(true);
    try {
      const res  = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPlanName.trim() }) });
      const data = await res.json();
      setTrainingPlans((prev) => [...prev, data.plan]);
      setNewPlanName("");
      setShowNewPlanInput(false);
    } finally {
      setCreatingPlan(false);
    }
  }

  async function handleRenamePlan(planId: string) {
    const name = renameValue.trim();
    if (!name) { setRenamingPlanId(null); return; }
    await fetch(`/api/plans/${planId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setTrainingPlans((prev) => prev.map((p) => p.id === planId ? { ...p, name } : p));
    setRenamingPlanId(null);
  }

  async function handleDeletePlan(planId: string) {
    await fetch(`/api/plans/${planId}`, { method: "DELETE" });
    setTrainingPlans((prev) => prev.filter((p) => p.id !== planId));
    setPlanDataCache((prev) => { const next = { ...prev }; delete next[planId]; return next; });
    if (activePlanId === planId) { setActivePlanId(null); setPlan([]); }
    setDeletingPlanId(null);
  }

  // ── AI plan generation ──
  async function handleAiGenerate() {
    setGenerating(true);
    setAiReasoning("");
    try {
      const res  = await fetch("/api/plan/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ additionalInstructions: aiInstructions.trim() }) });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setAiReasoning(data.reasoning ?? "");
      }
    } finally {
      setGenerating(false);
      setShowAiInput(false);
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

  function renderDescription(description: string) {
    const tMatch = description?.match(/🎯 Targets:\s*(.+?)(?=\n|$)/);
    const hMatch = description?.match(/📋 How to do it:\s*([\s\S]+?)(?=\n💡|$)/);
    const kMatch = description?.match(/💡 Key tip:\s*(.+?)(?=\n|$)/);
    const targets = tMatch?.[1]?.trim();
    const howTo   = hMatch?.[1]?.trim();
    const tip     = kMatch?.[1]?.trim();
    if (!targets && !howTo && !tip) {
      return <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{description || "No description available yet."}</div>;
    }
    return (
      <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7 }}>
        {targets && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#FF5F1F", textTransform: "uppercase", marginBottom: 4 }}>TARGETS</div><div>{targets}</div></div>}
        {howTo && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#FF5F1F", textTransform: "uppercase", marginBottom: 4 }}>HOW TO DO IT</div><div style={{ whiteSpace: "pre-wrap" }}>{howTo}</div></div>}
        {tip && <div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#FF5F1F", textTransform: "uppercase", marginBottom: 4 }}>KEY TIP</div><div>{tip}</div></div>}
      </div>
    );
  }

  // ── Detail view computed values ──
  const detailEntry     = detailDay ? getEntry(detailDay) : null;
  const detailSt        = detailEntry ? getType(detailEntry.typeId) : null;
  const detailBodyParts = detailEntry ? (SESSION_BODY_PARTS[detailEntry.typeId] ?? []) : [];
  const detailTarget    = detailEntry ? (SESSION_TARGETS[detailEntry.typeId] ?? { sets: 3, reps: "10" }) : { sets: 3, reps: "10" };
  const detailGrouped   = detailBodyParts.map((bp) => ({ bodyPart: bp, exercises: exercises.filter((e) => e.bodyPart === bp) })).filter((g) => g.exercises.length > 0);

  // ── Builder computed values ──
  const builderEntry = customizeDay ? getEntry(customizeDay) : null;
  const builderSt    = builderEntry ? getType(builderEntry.typeId) : null;

  return (
    <div style={{ height: "100vh", background: "#000", color: "#F5F5F5", fontFamily: "'Barlow', sans-serif", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #111", flexShrink: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 2px" }}>YOUR</p>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, lineHeight: 1, margin: 0 }}>TRAINING PLAN</h1>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{ width: 64, borderRight: "1px solid #111", display: "flex", flexDirection: "column", background: "#050505", flexShrink: 0, overflowY: "auto" }}>
          {trainingPlans.map((tp) => {
            const isActive = tp.id === activePlanId;
            return (
              <div
                key={tp.id}
                style={{ flexShrink: 0, borderLeft: `3px solid ${isActive ? "#FF5F1F" : "transparent"}`, borderBottom: "1px solid #111", background: isActive ? "#FF5F1F10" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", minHeight: 96, padding: "12px 6px" }}
                onClick={() => handleActivatePlan(tp.id)}
              >
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", width: "100%", padding: "0 6px" }}>
                  <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 11, letterSpacing: 0.5, color: isActive ? "#FF5F1F" : "#555", overflow: "hidden", whiteSpace: "nowrap", maxHeight: 64, textTransform: "uppercase", display: "block" }}>
                    {tp.name}
                  </span>
                </div>
              </div>
            );
          })}
          {/* + New Plan */}
          <button
            onClick={() => { setShowNewPlanInput(true); setDeletingPlanId(null); }}
            style={{ width: "100%", padding: "14px 0", background: "transparent", border: "none", borderBottom: "1px solid #111", color: "#333", fontSize: 22, cursor: "pointer", flexShrink: 0, transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FF5F1F")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
          >
            +
          </button>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
          {planSwitching && (
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
              <div style={{ width: 16, height: 16, border: "2px solid #222", borderTopColor: "#FF5F1F", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          )}

          {/* Plan action bar */}
          {activePlanId && (
            <div style={{ padding: "14px 14px 0" }}>
              <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 14, padding: "12px 14px" }}>
                {renamingPlanId === activePlanId ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenamePlan(renamingPlanId); if (e.key === "Escape") setRenamingPlanId(null); }}
                      style={{ flex: 1, background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #FF5F1F", borderRadius: 10, padding: "0 14px", fontSize: 15, fontFamily: "'Barlow', sans-serif", outline: "none", minHeight: 44 }}
                    />
                    <button
                      onClick={() => handleRenamePlan(renamingPlanId)}
                      style={{ minHeight: 44, minWidth: 44, borderRadius: 10, border: "none", background: "#FF5F1F", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, cursor: "pointer", flexShrink: 0 }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setRenamingPlanId(null)}
                      style={{ minHeight: 44, minWidth: 44, borderRadius: 10, border: "1px solid #333", background: "transparent", color: "#666", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, cursor: "pointer", flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                ) : deletingPlanId === activePlanId ? (
                  <div>
                    <p style={{ fontSize: 13, color: "#ccc", margin: "0 0 12px", lineHeight: 1.4 }}>
                      Delete <strong style={{ color: "#F5F5F5" }}>{trainingPlans.find((p) => p.id === activePlanId)?.name}</strong>? This cannot be undone.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleDeletePlan(deletingPlanId)}
                        style={{ flex: 1, minHeight: 44, borderRadius: 50, border: "none", background: "#EF4444", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: 1, cursor: "pointer" }}
                      >
                        DELETE
                      </button>
                      <button
                        onClick={() => setDeletingPlanId(null)}
                        style={{ flex: 1, minHeight: 44, borderRadius: 50, border: "1px solid #333", background: "transparent", color: "#666", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: 1, cursor: "pointer" }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { const p = trainingPlans.find((p) => p.id === activePlanId); if (p) { setRenameValue(p.name); setRenamingPlanId(activePlanId); } }}
                      style={{ flex: 1, minHeight: 44, borderRadius: 50, border: "1px solid #333", background: "transparent", color: "#F5F5F5", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 1, cursor: "pointer" }}
                    >
                      RENAME
                    </button>
                    <button
                      onClick={() => setDeletingPlanId(activePlanId)}
                      style={{ flex: 1, minHeight: 44, borderRadius: 50, border: "1px solid #EF444455", background: "transparent", color: "#EF4444", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 1, cursor: "pointer" }}
                    >
                      DELETE
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI GENERATE CARD */}
          <div style={{ padding: "14px 14px 0" }}>
            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 18, marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 10px" }}>AI PLAN BUILDER</p>
              <p style={{ fontSize: 13, color: "#666", marginBottom: 12, lineHeight: 1.5 }}>Generates a personalised 2-week rotating plan based on your profile, goals, and lifestyle.</p>
              {generating ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", color: "#666", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 1.5 }}>
                  <div style={{ width: 14, height: 14, border: "2px solid #555", borderTopColor: "#999", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  GENERATING...
                </div>
              ) : showAiInput ? (
                <>
                  <textarea
                    autoFocus
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    placeholder="Tell the AI what you want — e.g. focus on legs, train 5 days, more upper body volume..."
                    rows={3}
                    style={{ width: "100%", background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #FF5F1F", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "'Barlow', sans-serif", outline: "none", resize: "none", marginBottom: 10, boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleAiGenerate}
                      style={{ flex: 1, minHeight: 44, borderRadius: 50, border: "none", background: "#FF5F1F", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 1.5, cursor: "pointer" }}
                    >
                      ⚡ GENERATE
                    </button>
                    <button
                      onClick={() => { setShowAiInput(false); setAiInstructions(""); }}
                      style={{ minHeight: 44, padding: "0 16px", borderRadius: 50, border: "1px solid #333", background: "transparent", color: "#666", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 14, cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setShowAiInput(true)}
                  style={{ width: "100%", padding: "12px 0", borderRadius: 50, border: "none", background: "#FF5F1F", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 1.5, cursor: "pointer", transition: "background 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  ⚡ GENERATE MY PLAN WITH AI
                </button>
              )}
              {aiReasoning && <p style={{ fontSize: 12, color: "#555", marginTop: 10, lineHeight: 1.5, fontStyle: "italic" }}>{aiReasoning}</p>}
            </div>
          </div>

          {/* Week toggle */}
          <div style={{ padding: "0 14px 14px" }}>
            <div style={{ display: "flex", background: "#161616", borderRadius: 50, padding: 4, border: "1px solid #222" }}>
              {(["1", "2"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setWeek(w)}
                  style={{ flex: 1, minHeight: 44, padding: "11px 0", borderRadius: 50, border: "none", background: week === w ? "#FF5F1F" : "transparent", color: week === w ? "#fff" : "#666", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 1, cursor: "pointer", transition: "all 0.2s" }}
                >
                  WEEK {w}
                </button>
              ))}
            </div>
          </div>

          {/* Day cards */}
          <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {DAYS.map((day) => {
              const entry = getEntry(day);
              const st    = entry ? getType(entry.typeId) : null;
              return (
                <div
                  key={day}
                  style={{ background: "#161616", border: "1px solid #222", borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#444")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#222")}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                      onClick={() => setSelectedDay(day)}
                      style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", cursor: "pointer", textAlign: "left", background: "transparent", border: "none" }}
                    >
                      <div style={{ width: 34, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 14, color: "#555", flexShrink: 0 }}>{day}</div>
                      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: st ? `${st.color}22` : "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                        {st ? st.icon : ""}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {st ? (
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, color: "#F5F5F5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st.label.toUpperCase()}</div>
                        ) : (
                          <div style={{ fontSize: 13, color: "#444", fontStyle: "italic" }}>Tap to assign</div>
                        )}
                      </div>
                      {!st && <div style={{ fontSize: 18, color: "#333" }}>+</div>}
                    </button>
                    {st && (
                      <button
                        onClick={() => setDetailDay(day)}
                        style={{ padding: "0 14px", alignSelf: "stretch", flexShrink: 0, background: `${st.color}18`, border: "none", borderLeft: "1px solid #2a2a2a", color: st.color, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${st.color}30`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = `${st.color}18`)}
                        title="View exercises"
                      >
                        ›
                      </button>
                    )}
                  </div>
                  {st && entry && !["rest", "stretch"].includes(entry.typeId) && (
                    <button
                      onClick={() => openBuilder(day)}
                      style={{ width: "100%", minHeight: 44, padding: "0 12px", background: "transparent", border: "none", borderTop: "1px solid #1a1a1a", color: "#555", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 11, letterSpacing: 1.5, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 5, transition: "color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#FF5F1F")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
                    >
                      ✎ CUSTOMISE SESSION
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New plan input panel */}
      {showNewPlanInput && (
        <>
          <div onClick={() => { setShowNewPlanInput(false); setNewPlanName(""); }} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
          <div style={{ position: "fixed", bottom: 60, left: 0, right: 0, zIndex: 200, background: "#111", borderTop: "1px solid #222", padding: "12px 14px" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreatePlan(); if (e.key === "Escape") { setShowNewPlanInput(false); setNewPlanName(""); } }}
                placeholder="Plan name…"
                style={{ flex: 1, background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #FF5F1F", borderRadius: 10, padding: "9px 14px", fontSize: 14, fontFamily: "'Barlow', sans-serif", outline: "none" }}
              />
              <button
                onClick={handleCreatePlan}
                disabled={!newPlanName.trim() || creatingPlan}
                style={{ padding: "9px 16px", borderRadius: 50, border: "none", background: !newPlanName.trim() || creatingPlan ? "#333" : "#FF5F1F", color: !newPlanName.trim() || creatingPlan ? "#555" : "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 14, cursor: !newPlanName.trim() || creatingPlan ? "not-allowed" : "pointer" }}
              >
                {creatingPlan ? "..." : "CREATE"}
              </button>
              <button
                onClick={() => { setShowNewPlanInput(false); setNewPlanName(""); }}
                style={{ padding: "9px 14px", borderRadius: 50, border: "1px solid #333", background: "transparent", color: "#666", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 14, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SESSION DETAIL OVERLAY ── */}
      {detailDay && detailSt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 160, background: "#000", overflowY: "auto" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 96px" }}>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 4px" }}>WEEK {week} · {detailDay}</p>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, lineHeight: 1, margin: 0, color: "#F5F5F5" }}>{detailSt.label.toUpperCase()}</h2>
              </div>
              <button onClick={() => setDetailDay(null)} style={{ background: "#161616", border: "1px solid #222", borderRadius: 50, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>✕</button>
            </div>

            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, flexShrink: 0, background: `${detailSt.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{detailSt.icon}</div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1, color: "#F5F5F5" }}>{detailSt.label.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Target: {detailTarget.sets} sets × {detailTarget.reps} reps per exercise</div>
              </div>
            </div>

            {detailGrouped.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{detailSt.icon}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22 }}>REST UP — YOU&#39;VE EARNED IT</div>
              </div>
            )}

            {detailGrouped.map((group) => (
              <div key={group.bodyPart} style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 12px" }}>{group.bodyPart.toUpperCase()}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {group.exercises.map((ex) => {
                    const isExpanded = expandedEx[ex.id] ?? false;
                    return (
                      <div key={ex.id} style={{ background: "#161616", border: "1px solid #222", borderRadius: 14, padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#F5F5F5", lineHeight: 1.1 }}>{ex.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: detailSt.color, background: `${detailSt.color}18`, border: `1px solid ${detailSt.color}44`, borderRadius: 6, padding: "2px 7px", textTransform: "uppercase" }}>{ex.bodyPart}</span>
                              <span style={{ fontSize: 11, color: "#555" }}>{ex.equipment} · {detailTarget.sets}×{detailTarget.reps}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setExpandedEx((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                            style={{ background: isExpanded ? "#FF5F1F22" : "#1E1E1E", border: `1px solid ${isExpanded ? "#FF5F1F55" : "#2a2a2a"}`, borderRadius: 8, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: isExpanded ? "#FF5F1F" : "#555", fontSize: 14, flexShrink: 0, marginLeft: 10 }}
                          >ℹ</button>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a2a" }}>
                            {renderDescription(ex.description)}
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

      {/* ── BUILDER OVERLAY ── */}
      {customizeDay && builderEntry && builderSt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 170, background: "#000", overflowY: "auto" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 100px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 4px" }}>WEEK {week} · {customizeDay}</p>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, lineHeight: 1, margin: 0, color: "#F5F5F5" }}>CUSTOMISE SESSION</h2>
              </div>
              <button onClick={() => setCustomizeDay(null)} style={{ background: "#161616", border: "1px solid #222", borderRadius: 50, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>✕</button>
            </div>

            {/* Session type pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#161616", border: "1px solid #222", borderRadius: 14, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${builderSt.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{builderSt.icon}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: "#F5F5F5" }}>{builderSt.label.toUpperCase()}</div>
            </div>

            {/* Exercise list */}
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 12px" }}>
              EXERCISES ({builderItems.length})
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {builderItems.map((item, idx) => (
                <div key={`${item.exId}-${idx}`} style={{ background: "#161616", border: "1px solid #222", borderRadius: 14, padding: 14 }}>
                  {/* Name row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, color: "#F5F5F5", lineHeight: 1.1 }}>{item.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: builderSt.color, background: `${builderSt.color}18`, border: `1px solid ${builderSt.color}44`, borderRadius: 6, padding: "2px 7px", textTransform: "uppercase" }}>{item.bodyPart}</span>
                        <span style={{ fontSize: 11, color: "#555" }}>{item.equipment}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                      <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #2a2a2a", background: "#1E1E1E", color: idx === 0 ? "#333" : "#999", fontSize: 13, cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
                      <button onClick={() => moveItem(idx, 1)} disabled={idx === builderItems.length - 1} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #2a2a2a", background: "#1E1E1E", color: idx === builderItems.length - 1 ? "#333" : "#999", fontSize: 13, cursor: idx === builderItems.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↓</button>
                      <button onClick={() => setExpandedBuilder((prev) => ({ ...prev, [item.exId]: !prev[item.exId] }))} style={{ width: 44, height: 44, borderRadius: 7, border: "1px solid #2a2a2a", background: expandedBuilder[item.exId] ? "#FF5F1F22" : "#1E1E1E", color: expandedBuilder[item.exId] ? "#FF5F1F" : "#555", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>ℹ</button>
                      <button onClick={() => removeBuilderItem(idx)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #2a2a2a", background: "#1E1E1E", color: "#EF4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                  </div>
                  {/* Sets + reps */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>SETS</label>
                      <input type="number" min="1" value={item.sets} onChange={(e) => updateBuilderItem(idx, "sets", e.target.value)} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")} onBlur={(e) => (e.target.style.borderColor = "#333")} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>REPS</label>
                      <input type="text" placeholder="e.g. 8-12" value={item.reps} onChange={(e) => updateBuilderItem(idx, "reps", e.target.value)} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")} onBlur={(e) => (e.target.style.borderColor = "#333")} />
                    </div>
                  </div>
                  {expandedBuilder[item.exId] && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a2a" }}>
                      {renderDescription(exercises.find((e) => e.id === item.exId)?.description ?? "")}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ADD EXERCISE */}
            <button
              onClick={() => { setPickerSearch(""); setPickerBodyPart(null); setShowExPicker(true); }}
              style={{ width: "100%", padding: "13px 0", borderRadius: 50, border: "1px solid #333", background: "#161616", color: "#F5F5F5", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: 1.5, cursor: "pointer", marginBottom: 12 }}
            >
              + ADD EXERCISE
            </button>

            {/* SAVE SESSION */}
            <button
              onClick={handleBuilderSave}
              disabled={builderSaving || builderItems.length === 0}
              style={{ width: "100%", padding: "14px 0", borderRadius: 50, border: "none", background: builderSaving || builderItems.length === 0 ? "#333" : "#FF5F1F", color: builderSaving || builderItems.length === 0 ? "#555" : "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 1.5, cursor: builderSaving || builderItems.length === 0 ? "not-allowed" : "pointer", transition: "background 0.2s" }}
            >
              {builderSaving ? "SAVING..." : "SAVE SESSION"}
            </button>
          </div>
        </div>
      )}

      {/* ── EXERCISE PICKER OVERLAY ── */}
      {showExPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 180, background: "#000", overflowY: "auto" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 100px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1, margin: 0, color: "#F5F5F5" }}>ADD EXERCISE</h2>
              <button onClick={() => setShowExPicker(false)} style={{ background: "#161616", border: "1px solid #222", borderRadius: 50, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* ── CUSTOM EXERCISE FORM ── */}
            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 18, marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 14px" }}>CREATE CUSTOM EXERCISE</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>NAME</label>
                  <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Dumbbell Lateral Raise" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")} onBlur={(e) => (e.target.style.borderColor = "#333")} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>BODY PART</label>
                    <select value={customBodyPart} onChange={(e) => setCustomBodyPart(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="">Select…</option>
                      {BODY_PART_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>EQUIPMENT</label>
                    <select value={customEquipment} onChange={(e) => setCustomEquipment(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="">Select…</option>
                      {EQUIPMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {customDesc ? (
                <div style={{ background: "#1E1E1E", borderRadius: 8, padding: "10px 12px", marginBottom: 10, fontSize: 12, color: "#ccc", lineHeight: 1.6, maxHeight: 80, overflowY: "auto" }}>{customDesc}</div>
              ) : null}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleGenerateDesc}
                  disabled={!customName || !customBodyPart || !customEquipment || generatingDesc}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 50, background: !customName || !customBodyPart || !customEquipment || generatingDesc ? "#2a2a2a" : "#1E1E1E", color: !customName || !customBodyPart || !customEquipment || generatingDesc ? "#555" : "#FF5F1F", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: !customName || !customBodyPart || !customEquipment || generatingDesc ? "not-allowed" : "pointer", border: "1px solid #333" }}
                >
                  {generatingDesc ? "GENERATING..." : "⚡ AI GENERATE DESC"}
                </button>
                <button
                  onClick={handleAddCustom}
                  disabled={!customName || !customBodyPart || !customEquipment || savingCustom}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 50, border: "none", background: !customName || !customBodyPart || !customEquipment || savingCustom ? "#333" : "#FF5F1F", color: !customName || !customBodyPart || !customEquipment || savingCustom ? "#555" : "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: 1, cursor: !customName || !customBodyPart || !customEquipment || savingCustom ? "not-allowed" : "pointer" }}
                >
                  {savingCustom ? "SAVING..." : "ADD & USE"}
                </button>
              </div>
            </div>

            {/* Search + filter */}
            <input
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search exercises…"
              style={{ ...inputStyle, marginBottom: 12, borderRadius: 10, fontSize: 15 }}
              onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
              onBlur={(e) => (e.target.style.borderColor = "#333")}
            />

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              <button onClick={() => setPickerBodyPart(null)} style={{ padding: "6px 14px", borderRadius: 50, border: "none", background: pickerBodyPart === null ? "#FF5F1F" : "#161616", color: pickerBodyPart === null ? "#fff" : "#666", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>ALL</button>
              {BODY_PART_OPTIONS.map((bp) => (
                <button key={bp} onClick={() => setPickerBodyPart(pickerBodyPart === bp ? null : bp)} style={{ padding: "6px 14px", borderRadius: 50, border: "none", background: pickerBodyPart === bp ? "#FF5F1F" : "#161616", color: pickerBodyPart === bp ? "#fff" : "#666", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 13, cursor: "pointer", textTransform: "uppercase" }}>{bp}</button>
              ))}
            </div>

            {/* Exercise list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredExercises.map((ex) => {
                const alreadyAdded = builderItems.some((b) => b.exId === ex.id);
                return (
                  <div key={ex.id} style={{ background: "#161616", border: `1px solid ${alreadyAdded ? "#FF5F1F33" : "#222"}`, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, color: "#F5F5F5", lineHeight: 1 }}>{ex.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#FF5F1F", background: "#FF5F1F18", border: "1px solid #FF5F1F44", borderRadius: 6, padding: "2px 7px", textTransform: "uppercase" }}>{ex.bodyPart}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#555", background: "#1E1E1E", border: "1px solid #2a2a2a", borderRadius: 6, padding: "2px 7px" }}>{ex.equipment}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                        <button
                          onClick={() => setExpandedPicker((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                          style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid #2a2a2a", background: expandedPicker[ex.id] ? "#FF5F1F22" : "#1E1E1E", color: expandedPicker[ex.id] ? "#FF5F1F" : "#555", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >ℹ</button>
                        <button
                          onClick={() => { addExerciseToBuilder(ex); setShowExPicker(false); }}
                          disabled={alreadyAdded}
                          style={{ width: 44, height: 44, borderRadius: 8, border: "none", background: alreadyAdded ? "#2a2a2a" : "#FF5F1F", color: alreadyAdded ? "#555" : "#fff", fontSize: 18, cursor: alreadyAdded ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          {alreadyAdded ? "✓" : "+"}
                        </button>
                      </div>
                    </div>
                    {expandedPicker[ex.id] && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a2a" }}>
                        {renderDescription(ex.description)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 4px" }}>{selectedDay} · WEEK {week}</p>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: "#F5F5F5" }}>SELECT SESSION TYPE</div>
              </div>
              <button onClick={() => setSelectedDay(null)} style={{ background: "none", border: "none", color: "#666", fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SESSION_TYPES.map((st) => (
                <button
                  key={st.id}
                  onClick={() => handleSelect(st.id)}
                  disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 14, background: "#1E1E1E", border: "1px solid #2a2a2a", borderRadius: 12, padding: "13px 16px", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", width: "100%", opacity: saving ? 0.5 : 1, transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.borderColor = "#444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${st.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{st.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#F5F5F5" }}>{st.label.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99, background: "#0A0A0A", borderTop: "1px solid #222", display: "flex", justifyContent: "space-around", padding: "8px 0 max(8px, env(safe-area-inset-bottom))" }}>
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.route}
            prefetch={true}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "2px 6px", color: pathname === t.route ? "#FF5F1F" : "#666", fontFamily: "'Barlow', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, transform: pathname === t.route ? "translateY(-2px)" : "none", transition: "all 0.2s", textDecoration: "none" }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
