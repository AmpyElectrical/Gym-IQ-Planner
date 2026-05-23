"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard" },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan" },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs" },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks" },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: null },
  { id: "profile", icon: "👤",  label: "Profile", route: null },
];

const BODY_PARTS = [
  { id: "chest",     label: "Chest",     icon: "💪", color: "#FF5F1F" },
  { id: "back",      label: "Back",      icon: "🔙", color: "#FF8C42" },
  { id: "shoulders", label: "Shoulders", icon: "🏔️", color: "#FBBF24" },
  { id: "arms",      label: "Arms",      icon: "💪", color: "#A78BFA" },
  { id: "legs",      label: "Legs",      icon: "🦵", color: "#34D399" },
  { id: "core",      label: "Core",      icon: "🎯", color: "#22D3EE" },
];

const MEDALS = ["🥇", "🥈", "🥉"];
const medal = (rank: number) => (rank <= 3 ? MEDALS[rank - 1] : `#${rank}`);

type OverallEntry   = { userId: string; username: string; score: number; rank: number };
type BodyPartEntry  = { userId: string; username: string; bestE1RM: number; rank: number };
type ImprovedEntry  = { userId: string; username: string; exerciseName: string; improvementPct: number; rank: number };
type LeaderboardData = {
  overall: OverallEntry[];
  bodyParts: Record<string, BodyPartEntry[]>;
  improved: { last7: ImprovedEntry[]; last14: ImprovedEntry[] };
};

export default function RanksPage() {
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [myId, setMyId] = useState<string>("");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [subTab, setSubTab] = useState<"gym" | "bodyparts" | "improved">("gym");
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.replace("/"); return null; } return r.json(); })
      .then((d) => { if (!d) return; setMyId(d.user.id); setPageLoading(false); })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (pageLoading) return;
    setDataLoading(true);
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setDataLoading(false));
  }, [pageLoading]);

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
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>GYM</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1, margin: 0 }}>LEADERBOARD</h1>
        </div>

        {/* Sub-tab pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["gym", "bodyparts", "improved"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 50, border: "none", cursor: "pointer",
                background: subTab === t ? "#FF5F1F" : "#161616",
                color: subTab === t ? "#fff" : "#666",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 13, letterSpacing: 0.5,
                transition: "all 0.2s",
              }}
            >
              {t === "gym" ? "GYM" : t === "bodyparts" ? "BODY PARTS" : "IMPROVED"}
            </button>
          ))}
        </div>

        {dataLoading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ width: 28, height: 28, border: "3px solid #222", borderTopColor: "#FF5F1F", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          </div>
        )}

        {!dataLoading && data && (
          <>
            {/* ── GYM SUB-TAB ── */}
            {subTab === "gym" && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 12px" }}>
                  OVERALL RANKING
                </p>
                {data.overall.length === 0 && (
                  <EmptyState text="No lifts tracked yet. Log some PBs to appear on the board." />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.overall.map((u) => (
                    <RankRow
                      key={u.userId}
                      rank={u.rank}
                      username={u.username}
                      isMe={u.userId === myId}
                      right={<span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#FF5F1F" }}>{u.score} <span style={{ fontSize: 12, color: "#666" }}>e1RM</span></span>}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── BODY PARTS SUB-TAB ── */}
            {subTab === "bodyparts" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {BODY_PARTS.map((bp) => {
                  const list = data.bodyParts[bp.id] ?? [];
                  return (
                    <div key={bp.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${bp.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                          {bp.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>KING OF</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, lineHeight: 1, color: bp.color }}>
                            {bp.label.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      {list.length === 0 ? (
                        <p style={{ fontSize: 13, color: "#444", fontStyle: "italic", paddingLeft: 4 }}>No entries yet.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {list.slice(0, 5).map((u) => (
                            <RankRow
                              key={u.userId}
                              rank={u.rank}
                              username={u.username}
                              isMe={u.userId === myId}
                              right={<span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: bp.color }}>{u.bestE1RM} kg</span>}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── IMPROVED SUB-TAB ── */}
            {subTab === "improved" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {(["last7", "last14"] as const).map((key) => {
                  const list = data.improved[key];
                  const label = key === "last7" ? "LAST 7 DAYS" : "LAST 14 DAYS";
                  return (
                    <div key={key}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 10px" }}>{label}</p>
                      {list.length === 0 ? (
                        <EmptyState text="No improvements detected in this window." />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {list.map((u) => (
                            <RankRow
                              key={u.userId}
                              rank={u.rank}
                              username={u.username}
                              isMe={u.userId === myId}
                              sub={u.exerciseName}
                              right={
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#22C55E" }}>
                                  +{u.improvementPct}%
                                </span>
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
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
            onClick={() => t.route && router.push(t.route)}
            style={{
              background: "none", border: "none", cursor: t.route ? "pointer" : "default",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "2px 6px",
              color: t.id === "ranks" ? "#FF5F1F" : "#666",
              fontFamily: "'Barlow', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              transform: t.id === "ranks" ? "translateY(-2px)" : "none",
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

function RankRow({ rank, username, isMe, sub, right }: {
  rank: number; username: string; isMe: boolean; sub?: string; right: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: isMe ? "#FF5F1F18" : "#161616",
      border: `1px solid ${isMe ? "#FF5F1F55" : "#222"}`,
      borderRadius: 12, padding: "12px 14px",
    }}>
      <div style={{ width: 32, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: rank <= 3 ? 22 : 16, color: "#666", flexShrink: 0, textAlign: "center" }}>
        {medal(rank)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: isMe ? "#FF5F1F" : "#F5F5F5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {username}{isMe && " (you)"}
        </div>
        {sub && <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ fontSize: 13, color: "#444", fontStyle: "italic", paddingLeft: 4 }}>{text}</p>;
}
