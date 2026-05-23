"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

type User = {
  id: string;
  username: string;
  profile: { name: string } | null;
};

type WorkoutPlan = {
  id: string;
  day: string;
  week: string;
  typeId: string;
};

type CheckIn = {
  id: string;
  weight: number;
  energy: number;
  notes: string;
  date: string;
};

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard"         },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan"    },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs"     },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks"   },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: "/dashboard/coach"   },
  { id: "profile", icon: "👤",  label: "Profile", route: "/dashboard/profile" },
];

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

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [todayPlan, setTodayPlan] = useState<WorkoutPlan | null>(null);

  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) { router.replace("/"); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setUser(data.user);
        setPageLoading(false);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/workout-plan/today")
      .then((res) => res.json())
      .then((data) => setTodayPlan(data.plan ?? null))
      .catch(() => {});
    fetch("/api/checkins")
      .then((res) => res.json())
      .then((data) => setRecentCheckIns(data.checkIns ?? []))
      .catch(() => {});
  }, [user]);

  async function handleCheckIn() {
    if (!weight) return;
    setCheckInLoading(true);
    try {
      await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: parseFloat(weight), notes }),
      });
      setCheckInDone(true);
      setWeight("");
      setNotes("");
      fetch("/api/checkins")
        .then((res) => res.json())
        .then((data) => setRecentCheckIns(data.checkIns ?? []))
        .catch(() => {});
    } finally {
      setCheckInLoading(false);
    }
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const displayName = (user?.profile?.name || user?.username || "").toUpperCase();
  const session = todayPlan ? (SESSION_META[todayPlan.typeId] ?? SESSION_META.custom) : null;

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

        {/* ── HOME TAB ── */}
        {activeTab === "home" && (
          <>
            {/* Greeting */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>
                {greeting}
              </p>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1, color: "#F5F5F5", margin: 0 }}>
                {displayName}
              </h1>
            </div>

            {/* Today's Session */}
            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 14, margin: "0 0 14px" }}>
                TODAY'S SESSION
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 14, flexShrink: 0,
                  background: session ? `${session.color}22` : "#1E1E1E",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                }}>
                  {session ? session.icon : "😴"}
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, lineHeight: 1 }}>
                    {session ? session.label : "Rest Day"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>
                    {todayPlan ? `Week ${todayPlan.week} · ${todayPlan.day}` : "No session scheduled"}
                  </div>
                </div>
              </div>
              {session && todayPlan && !["rest", "stretch"].includes(todayPlan.typeId) && (
                <button
                  onClick={() => router.push(`/dashboard/session/${todayPlan.day}?typeId=${todayPlan.typeId}`)}
                  style={{
                    marginTop: 16, width: "100%", padding: "12px 0", borderRadius: 50, border: "none",
                    background: session.color, color: "#fff",
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: 1.5,
                    cursor: "pointer", transition: "opacity 0.2s",
                  }}
                >
                  OPEN SESSION ›
                </button>
              )}
            </div>

            {/* Weekly Check-in */}
            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 18px" }}>
                WEEKLY CHECK-IN
              </p>

              {checkInDone ? (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: "#22C55E" }}>
                    CHECK-IN LOGGED
                  </div>
                  <button
                    onClick={() => setCheckInDone(false)}
                    style={{ marginTop: 12, background: "transparent", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "'Barlow', sans-serif" }}
                  >
                    Log another
                  </button>
                </div>
              ) : (
                <>
                  {/* Weight */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 6 }}>
                      WEIGHT (kg)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 82.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      style={{ background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #333", borderRadius: 10, padding: "10px 14px", fontSize: 15, fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%" }}
                      onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                      onBlur={(e) => (e.target.style.borderColor = "#333")}
                    />
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 6 }}>
                      NOTES
                    </label>
                    <textarea
                      placeholder="How are you feeling today?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      style={{ background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #333", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%", resize: "none" }}
                      onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                      onBlur={(e) => (e.target.style.borderColor = "#333")}
                    />
                  </div>

                  <button
                    onClick={handleCheckIn}
                    disabled={!weight || energy === null || checkInLoading}
                    style={{
                      width: "100%", padding: "14px 0", borderRadius: 50, border: "none",
                      background: !weight || energy === null || checkInLoading ? "#333" : "#FF5F1F",
                      color: !weight || energy === null || checkInLoading ? "#666" : "#fff",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 900, fontSize: 17, letterSpacing: 1.5,
                      cursor: !weight || energy === null || checkInLoading ? "not-allowed" : "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    {checkInLoading ? "SAVING..." : "LOG CHECK-IN"}
                  </button>
                </>
              )}

              {/* Recent check-ins */}
              {recentCheckIns.length > 0 && (
                <div style={{ marginTop: 20, borderTop: "1px solid #222", paddingTop: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 12px" }}>
                    RECENT
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recentCheckIns.slice(0, 3).map((c) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1E1E1E", borderRadius: 10, padding: "10px 14px" }}>
                        <span style={{ fontSize: 13, color: "#999" }}>
                          {new Date(c.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                        </span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5F5F5" }}>
                          {c.weight} kg
                        </span>
                        <span style={{ fontSize: 12, color: "#FF5F1F", fontWeight: 700 }}>
                          {"⚡".repeat(c.energy)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── OTHER TABS (placeholder) ── */}
        {activeTab !== "home" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12 }}>
            <div style={{ fontSize: 52 }}>{TABS.find((t) => t.id === activeTab)?.icon}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#333", letterSpacing: 1 }}>
              COMING SOON
            </div>
          </div>
        )}
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
            onClick={() => router.push(t.route)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "2px 6px",
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
