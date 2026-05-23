"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";

const BUCKETS = [
  { id: "1",    label: "1 RM",    color: "#FF5F1F" },
  { id: "2-3",  label: "2–3 RM",  color: "#FF8C42" },
  { id: "3-5",  label: "3–5 RM",  color: "#FBBF24" },
  { id: "5-8",  label: "5–8 RM",  color: "#34D399" },
  { id: "8-12", label: "8–12 RM", color: "#60A5FA" },
  { id: "12+",  label: "12+ RM",  color: "#A78BFA" },
];

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard" },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan" },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs" },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks"   },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: "/dashboard/coach"   },
  { id: "profile", icon: "👤",  label: "Profile", route: "/dashboard/profile" },
];

type Exercise = { id: string; name: string; bodyPart: string };
type PB = { id: string; exerciseName: string; bucketId: string; weight: number; reps: number; date: string };
type Grouped = Record<string, PB[]>;
type PBResult = { isPB: boolean; bucketId: string; exerciseName: string; weight: number; reps: number; estE1rm: number };

const e1RM = (w: number, r: number) => (r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10);

function getBucketId(r: number): string {
  if (r === 1) return "1";
  if (r <= 3) return "2-3";
  if (r <= 5) return "3-5";
  if (r <= 8) return "5-8";
  if (r <= 12) return "8-12";
  return "12+";
}

function getBestE1RM(pbs: PB[]): number | null {
  if (!pbs.length) return null;
  return Math.max(...pbs.map((p) => e1RM(p.weight, p.reps)));
}

function getBucketBest(pbs: PB[], bucketId: string): PB | null {
  const entries = pbs.filter((p) => p.bucketId === bucketId);
  if (!entries.length) return null;
  return entries.reduce((best, p) => (p.weight > best.weight ? p : best), entries[0]);
}

export default function PBsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [pageLoading, setPageLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [grouped, setGrouped] = useState<Grouped>({});

  const [search, setSearch] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pbResult, setPbResult] = useState<PBResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLift, setSelectedLift] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => { if (!res.ok) { router.replace("/"); return null; } return res.json(); })
      .then((data) => { if (!data) return; setPageLoading(false); })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (pageLoading) return;
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => setExercises(d.exercises ?? []));
    fetch("/api/pbs")
      .then((r) => r.json())
      .then((d) => setGrouped(d.grouped ?? {}));
  }, [pageLoading]);

  const filtered = useMemo(() => {
    if (!search.trim()) return exercises.slice(0, 8);
    return exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  }, [search, exercises]);

  async function handleSubmit() {
    if (!selectedExercise || !weight || !reps) return;
    setSubmitting(true);
    setPbResult(null);
    const w = parseFloat(weight);
    const r = parseInt(reps);
    try {
      const res = await fetch("/api/pbs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseName: selectedExercise, weight: w, reps: r }),
      });
      const data = await res.json();
      setPbResult({ isPB: data.isPB, bucketId: data.bucketId, exerciseName: selectedExercise, weight: w, reps: r, estE1rm: e1RM(w, r) });
      const refreshed = await fetch("/api/pbs").then((r) => r.json());
      setGrouped(refreshed.grouped ?? {});
      setWeight("");
      setReps("");
    } finally {
      setSubmitting(false);
    }
  }

  const liveBucketId = reps && parseInt(reps) > 0 ? getBucketId(parseInt(reps)) : null;
  const liveBucket = liveBucketId ? BUCKETS.find((b) => b.id === liveBucketId) ?? null : null;
  const resultBucket = pbResult ? BUCKETS.find((b) => b.id === pbResult.bucketId) ?? null : null;
  const trackedLifts = Object.keys(grouped).sort();

  if (pageLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 32, height: 32, border: "3px solid #222", borderTopColor: "#FF5F1F", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#F5F5F5", fontFamily: "'Barlow', sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>TRACK YOUR</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1, margin: 0 }}>PERSONAL BESTS</h1>
        </div>

        {/* Log PB card */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 16px" }}>LOG A LIFT</p>

          {/* Non-PB logged indicator */}
          {pbResult && !pbResult.isPB && (
            <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#F5F5F5" }}>Lift logged</div>
            </div>
          )}

          {/* Exercise search */}
          <div style={{ marginBottom: 12, position: "relative" }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 6 }}>EXERCISE</label>
            <input
              type="text"
              placeholder="Search exercises…"
              value={selectedExercise || search}
              onChange={(e) => { setSearch(e.target.value); setSelectedExercise(""); setShowDropdown(true); setPbResult(null); }}
              onFocus={() => setShowDropdown(true)}
              style={{ background: "#1E1E1E", color: "#F5F5F5", border: `1px solid ${selectedExercise ? "#FF5F1F" : "#333"}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%" }}
            />
            {showDropdown && filtered.length > 0 && !selectedExercise && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1E1E1E", border: "1px solid #333", borderRadius: 10, zIndex: 50, maxHeight: 220, overflowY: "auto", marginTop: 4 }}>
                {filtered.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => { setSelectedExercise(ex.name); setSearch(""); setShowDropdown(false); }}
                    style={{ display: "block", width: "100%", padding: "10px 14px", background: "transparent", border: "none", color: "#F5F5F5", fontFamily: "'Barlow', sans-serif", fontSize: 14, cursor: "pointer", textAlign: "left", borderBottom: "1px solid #2a2a2a" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {ex.name}
                    <span style={{ fontSize: 11, color: "#666", marginLeft: 8 }}>{ex.bodyPart}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Weight + Reps */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 6 }}>WEIGHT (kg)</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                style={{ background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #333", borderRadius: 10, padding: "10px 14px", fontSize: 15, fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%" }}
                onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                onBlur={(e) => (e.target.style.borderColor = "#333")}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 6 }}>REPS</label>
              <input
                type="number"
                placeholder="e.g. 5"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                style={{ background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #333", borderRadius: 10, padding: "10px 14px", fontSize: 15, fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%" }}
                onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                onBlur={(e) => (e.target.style.borderColor = "#333")}
              />
            </div>
          </div>

          {/* Live bucket label + e1RM preview */}
          {liveBucket && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, background: `${liveBucket.color}18`, border: `1px solid ${liveBucket.color}44`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: liveBucket.color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>REP RANGE</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: liveBucket.color }}>{liveBucket.label}</span>
              </div>
              {weight && parseFloat(weight) > 0 && (
                <div style={{ flex: 1, background: "#1E1E1E", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>EST. 1RM</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#FF5F1F" }}>
                    {e1RM(parseFloat(weight), parseInt(reps))} kg
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!selectedExercise || !weight || !reps || submitting}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 50, border: "none",
              background: !selectedExercise || !weight || !reps || submitting ? "#333" : "#FF5F1F",
              color: !selectedExercise || !weight || !reps || submitting ? "#666" : "#fff",
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 1.5,
              cursor: !selectedExercise || !weight || !reps || submitting ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {submitting ? "SAVING..." : "LOG LIFT"}
          </button>
        </div>

        {/* Tracked lifts */}
        {trackedLifts.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 12px" }}>
              TRACKED LIFTS ({trackedLifts.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trackedLifts.map((name) => {
                const entries = grouped[name];
                const best = getBestE1RM(entries);
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedLift(name)}
                    style={{ background: "#161616", border: "1px solid #222", borderRadius: 14, padding: 18, textAlign: "left", cursor: "pointer", width: "100%", transition: "border-color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#444")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#222")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#F5F5F5" }}>{name}</div>
                      {best !== null && (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: "#666", fontWeight: 600, letterSpacing: 1 }}>BEST e1RM</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: "#FF5F1F" }}>{best} kg</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {BUCKETS.map((b) => {
                        const bBest = getBucketBest(entries, b.id);
                        if (!bBest) return null;
                        return (
                          <div key={b.id} style={{ background: `${b.color}18`, border: `1px solid ${b.color}44`, borderRadius: 8, padding: "5px 10px" }}>
                            <div style={{ fontSize: 10, color: b.color, fontWeight: 700, letterSpacing: 0.5 }}>{b.label}</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, color: "#F5F5F5" }}>
                              {bBest.weight}kg × {bBest.reps}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lift detail overlay */}
      {selectedLift && grouped[selectedLift] && (
        <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000", overflowY: "auto" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 96px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 4px" }}>PERSONAL BESTS</p>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, lineHeight: 1, margin: 0, color: "#F5F5F5" }}>
                  {selectedLift.toUpperCase()}
                </h2>
              </div>
              <button
                onClick={() => setSelectedLift(null)}
                style={{ background: "#161616", border: "1px solid #222", borderRadius: 50, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Best e1RM hero */}
            {(() => {
              const best = getBestE1RM(grouped[selectedLift]);
              return best !== null ? (
                <div style={{ background: "#161616", border: "1px solid #FF5F1F33", borderRadius: 16, padding: 20, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>BEST EST. 1RM</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 48, lineHeight: 1, color: "#FF5F1F" }}>
                      {best} <span style={{ fontSize: 24, color: "#666" }}>kg</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 48 }}>🏆</div>
                </div>
              ) : null;
            })()}

            {/* Best per bucket */}
            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 16px" }}>BEST PER BUCKET</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {BUCKETS.map((b) => {
                  const bBest = getBucketBest(grouped[selectedLift], b.id);
                  return (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: bBest ? `${b.color}12` : "#1E1E1E", border: `1px solid ${bBest ? b.color + "44" : "#2a2a2a"}`, borderRadius: 10 }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, color: bBest ? b.color : "#444" }}>{b.label}</span>
                      {bBest ? (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#F5F5F5" }}>{bBest.weight}kg × {bBest.reps}</div>
                          <div style={{ fontSize: 11, color: "#666" }}>e1RM {e1RM(bBest.weight, bBest.reps)} kg</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: "#444" }}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* History */}
            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 16px" }}>
                HISTORY ({grouped[selectedLift].length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...grouped[selectedLift]].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((pb) => {
                  const bkt = BUCKETS.find((b) => b.id === pb.bucketId);
                  return (
                    <div key={pb.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#1E1E1E", borderRadius: 10 }}>
                      <div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#F5F5F5" }}>{pb.weight}kg × {pb.reps}</div>
                        <div style={{ fontSize: 11, color: "#666" }}>{new Date(pb.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: bkt?.color ?? "#666", fontWeight: 700, letterSpacing: 0.5 }}>{bkt?.label}</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, color: "#FF5F1F" }}>{e1RM(pb.weight, pb.reps)} kg</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen PB celebration modal */}
      {pbResult?.isPB && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 88, marginBottom: 4, lineHeight: 1 }}>🏆</div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#FF5F1F", textTransform: "uppercase", margin: "0 0 8px" }}>NEW PERSONAL BEST</p>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, color: "#F5F5F5", lineHeight: 1.1, marginBottom: 24 }}>
            {pbResult.exerciseName.toUpperCase()}
          </div>

          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 24, width: "100%", maxWidth: 320, marginBottom: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>WEIGHT</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#F5F5F5" }}>
                  {pbResult.weight} <span style={{ fontSize: 16, color: "#666" }}>kg</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>REPS</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#F5F5F5" }}>{pbResult.reps}</div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #222", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>EST. 1RM</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#FF5F1F" }}>
                  {pbResult.estE1rm} <span style={{ fontSize: 16, color: "#FF8C42" }}>kg</span>
                </div>
              </div>
              {resultBucket && (
                <div style={{ background: `${resultBucket.color}22`, border: `1px solid ${resultBucket.color}66`, borderRadius: 10, padding: "8px 16px" }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: resultBucket.color }}>{resultBucket.label}</div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setPbResult(null)}
            style={{
              padding: "14px 48px", borderRadius: 50, border: "none",
              background: "#FF5F1F", color: "#fff",
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: 1.5,
              cursor: "pointer",
            }}
          >
            KEEP GOING
          </button>
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
              color: pathname === t.route ? "#FF5F1F" : "#666",
              fontFamily: "'Barlow', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              transform: pathname === t.route ? "translateY(-2px)" : "none",
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
