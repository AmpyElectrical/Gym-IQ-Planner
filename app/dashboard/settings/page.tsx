"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { id: "home",     icon: "⚡",  label: "Home",     route: "/dashboard"          },
  { id: "plan",     icon: "📋",  label: "Plan",     route: "/dashboard/plan"     },
  { id: "pbs",      icon: "🏆",  label: "PBs",      route: "/dashboard/pbs"      },
  { id: "ranks",    icon: "👑",  label: "Ranks",    route: "/dashboard/ranks"    },
  { id: "coach",    icon: "🤖",  label: "Coach",    route: "/dashboard/coach"    },
  { id: "profile",  icon: "👤",  label: "Profile",  route: "/dashboard/profile"  },
  { id: "settings", icon: "⚙️",  label: "Settings", route: "/dashboard/settings" },
];

type View = "main" | "add" | "detail" | "created";

type FullUser = {
  id: string;
  username: string;
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  password: string | null;
  createdAt: string;
};

const inputStyle: React.CSSProperties = {
  background: "#1E1E1E", color: "#F5F5F5", border: "1px solid #333",
  borderRadius: 10, padding: "12px 14px", fontSize: 15,
  fontFamily: "'Barlow', sans-serif", outline: "none", width: "100%",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
  color: "#666", textTransform: "uppercase", marginBottom: 6,
};

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [pageLoading, setPageLoading] = useState(true);
  const [myId, setMyId] = useState("");
  const [users, setUsers] = useState<FullUser[]>([]);
  const [view, setView] = useState<View>("main");

  // MY ACCOUNT fields
  const [origUsername, setOrigUsername] = useState("");
  const [origNickname, setOrigNickname] = useState("");
  const [usernameVal, setUsernameVal] = useState("");
  const [nicknameVal, setNicknameVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  // ADD USER fields
  const [addFirst, setAddFirst] = useState("");
  const [addLast, setAddLast] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // CREATED success state
  const [createdUsername, setCreatedUsername] = useState("");
  const [createdPassword, setCreatedPassword] = useState("");

  // DETAIL view
  const [detailUser, setDetailUser] = useState<FullUser | null>(null);
  const [showDetailPassword, setShowDetailPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.replace("/"); return null; } return r.json(); })
      .then((d) => {
        if (!d) return;
        setMyId(d.user.id);
        setOrigUsername(d.user.username);
        setOrigNickname(d.user.nickname ?? "");
        setUsernameVal(d.user.username);
        setNicknameVal(d.user.nickname ?? "");
        setPageLoading(false);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (!pageLoading) fetchUsers();
  }, [pageLoading, fetchUsers]);

  async function saveAccount() {
    setSaving(true);
    setSaveError("");
    setSaved(false);
    const body: Record<string, string> = {};
    if (usernameVal.trim() !== origUsername) body.username = usernameVal.trim();
    if (nicknameVal !== origNickname) body.nickname = nicknameVal;
    if (passwordVal.trim()) body.password = passwordVal.trim();
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed to save"); return; }
      const nu = data.user.username;
      const nn = data.user.nickname ?? "";
      setOrigUsername(nu);
      setOrigNickname(nn);
      setUsernameVal(nu);
      setNicknameVal(nn);
      setPasswordVal("");
      setSaved(true);
      fetchUsers();
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function createUser() {
    if (!addFirst.trim() || !addLast.trim()) { setAddError("First and last name are required"); return; }
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: addFirst, lastName: addLast, email: addEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to create user"); return; }
      setCreatedUsername(data.generatedUsername);
      setCreatedPassword(data.generatedPassword);
      setAddFirst(""); setAddLast(""); setAddEmail("");
      fetchUsers();
      setView("created");
    } finally {
      setAddLoading(false);
    }
  }

  async function deleteUser(id: string) {
    setDeleting(true);
    try {
      await fetch(`/api/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setView("main");
    } finally {
      setDeleting(false);
    }
  }

  function openDetail(u: FullUser) {
    setDetailUser(u);
    setShowDetailPassword(false);
    setView("detail");
  }

  const hasChanges =
    usernameVal.trim() !== origUsername ||
    nicknameVal !== origNickname ||
    !!passwordVal.trim();

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
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── MAIN VIEW ── */}
        {view === "main" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>MANAGE</p>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1, margin: 0 }}>SETTINGS</h1>
            </div>

            {/* MY ACCOUNT */}
            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 20px" }}>MY ACCOUNT</p>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>USERNAME</label>
                <input
                  value={usernameVal}
                  onChange={(e) => setUsernameVal(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                  onBlur={(e) => (e.target.style.borderColor = "#333")}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>NICKNAME</label>
                <input
                  value={nicknameVal}
                  onChange={(e) => setNicknameVal(e.target.value)}
                  placeholder="e.g. Iron Cody"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                  onBlur={(e) => (e.target.style.borderColor = "#333")}
                />
                <p style={{ fontSize: 11, color: "#555", margin: "6px 0 0" }}>Shown on leaderboard. Leave blank to use username.</p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>PASSWORD</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordVal}
                    onChange={(e) => setPasswordVal(e.target.value)}
                    placeholder="Set a new password"
                    style={{ ...inputStyle, paddingRight: 60 }}
                    onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                    onBlur={(e) => (e.target.style.borderColor = "#333")}
                  />
                  <button
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", color: "#555", cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: 0,
                    }}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              {saveError && <p style={{ color: "#EF4444", fontSize: 13, margin: "0 0 12px" }}>{saveError}</p>}

              <button
                onClick={saveAccount}
                disabled={!hasChanges || saving}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 50, border: "none",
                  background: saved ? "#22C55E" : !hasChanges || saving ? "#222" : "#FF5F1F",
                  color: !hasChanges || saving ? "#555" : "#fff",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 2,
                  cursor: !hasChanges || saving ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                }}
              >
                {saving ? "SAVING..." : saved ? "SAVED ✓" : "SAVE"}
              </button>
            </div>

            {/* USERS */}
            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: 0 }}>USERS</p>
                <button
                  onClick={() => { setAddError(""); setView("add"); }}
                  style={{
                    padding: "7px 18px", borderRadius: 50, border: "1px solid #FF5F1F44",
                    background: "#FF5F1F18", color: "#FF5F1F",
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: 1.5,
                    cursor: "pointer",
                  }}
                >
                  + ADD USER
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {users.map((u) => {
                  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;
                  const isMe = u.id === myId;
                  return (
                    <button
                      key={u.id}
                      onClick={() => openDetail(u)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: isMe ? "#FF5F1F12" : "#1E1E1E",
                        border: `1px solid ${isMe ? "#FF5F1F33" : "transparent"}`,
                        borderRadius: 12, padding: "13px 14px",
                        cursor: "pointer", textAlign: "left", width: "100%",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17, color: "#F5F5F5" }}>
                            {fullName}
                          </span>
                          {isMe && (
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#FF5F1F", background: "#FF5F1F22", borderRadius: 4, padding: "2px 6px" }}>YOU</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>@{u.username}</div>
                      </div>
                      <span style={{ color: "#555", fontSize: 20, lineHeight: 1 }}>›</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── ADD VIEW ── */}
        {view === "add" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <button
                onClick={() => setView("main")}
                style={{ background: "none", border: "none", color: "#FF5F1F", cursor: "pointer", padding: 0, fontSize: 20, lineHeight: 1 }}
              >
                ‹
              </button>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>USERS</p>
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, lineHeight: 1, margin: 0 }}>ADD USER</h1>
              </div>
            </div>

            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>FIRST NAME</label>
                <input
                  value={addFirst}
                  onChange={(e) => setAddFirst(e.target.value)}
                  placeholder="e.g. Cody"
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                  onBlur={(e) => (e.target.style.borderColor = "#333")}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>LAST NAME</label>
                <input
                  value={addLast}
                  onChange={(e) => setAddLast(e.target.value)}
                  placeholder="e.g. Nicholas"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                  onBlur={(e) => (e.target.style.borderColor = "#333")}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>EMAIL <span style={{ color: "#444", letterSpacing: 0 }}>(optional)</span></label>
                <input
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="e.g. cody@example.com"
                  type="email"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
                  onBlur={(e) => (e.target.style.borderColor = "#333")}
                />
              </div>

              {addError && <p style={{ color: "#EF4444", fontSize: 13, margin: "0 0 14px" }}>{addError}</p>}

              <button
                onClick={createUser}
                disabled={addLoading || !addFirst.trim() || !addLast.trim()}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 50, border: "none",
                  background: addLoading || !addFirst.trim() || !addLast.trim() ? "#222" : "#FF5F1F",
                  color: addLoading || !addFirst.trim() || !addLast.trim() ? "#555" : "#fff",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 2,
                  cursor: addLoading || !addFirst.trim() || !addLast.trim() ? "not-allowed" : "pointer",
                }}
              >
                {addLoading ? "CREATING..." : "CREATE USER"}
              </button>
            </div>
          </>
        )}

        {/* ── CREATED VIEW ── */}
        {view === "created" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#22C55E", textTransform: "uppercase", marginBottom: 4 }}>SUCCESS</p>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1, margin: 0 }}>USER CREATED</h1>
            </div>

            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px" }}>
                Share these login credentials with the new user. The password can be changed from Settings after first login.
              </p>

              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 8px" }}>USERNAME</p>
                <div style={{
                  background: "#0A0A0A", border: "1px solid #333", borderRadius: 12,
                  padding: "16px 18px",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, letterSpacing: 2,
                  color: "#FF5F1F",
                }}>
                  {createdUsername}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 8px" }}>PASSWORD</p>
                <div style={{
                  background: "#0A0A0A", border: "1px solid #333", borderRadius: 12,
                  padding: "16px 18px",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, letterSpacing: 6,
                  color: "#22C55E",
                }}>
                  {createdPassword}
                </div>
              </div>

              <button
                onClick={() => setView("main")}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 50, border: "none",
                  background: "#FF5F1F", color: "#fff",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 2,
                  cursor: "pointer",
                }}
              >
                DONE
              </button>
            </div>
          </>
        )}

        {/* ── DETAIL VIEW ── */}
        {view === "detail" && detailUser && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <button
                onClick={() => setView("main")}
                style={{ background: "none", border: "none", color: "#FF5F1F", cursor: "pointer", padding: 0, fontSize: 20, lineHeight: 1 }}
              >
                ‹
              </button>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>USER</p>
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, lineHeight: 1, margin: 0 }}>
                  {[detailUser.firstName, detailUser.lastName].filter(Boolean).join(" ") || detailUser.username}
                </h1>
              </div>
            </div>

            <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <DetailRow label="FIRST NAME" value={detailUser.firstName} />
              <DetailRow label="LAST NAME" value={detailUser.lastName} />
              <DetailRow label="EMAIL" value={detailUser.email} />
              <DetailRow label="USERNAME" value={detailUser.username} mono />
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 6px" }}>PASSWORD</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid #1E1E1E" }}>
                  <span style={{ fontFamily: showDetailPassword ? "'Barlow Condensed', sans-serif" : "inherit", fontWeight: 700, fontSize: 17, letterSpacing: showDetailPassword ? 3 : 0, color: "#F5F5F5" }}>
                    {showDetailPassword ? (detailUser.password ?? "—") : "••••••"}
                  </span>
                  <button
                    onClick={() => setShowDetailPassword((v) => !v)}
                    style={{
                      background: "none", border: "none", color: "#555", cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: 0,
                    }}
                  >
                    {showDetailPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>
              <DetailRow label="JOINED" value={new Date(detailUser.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} last />
            </div>

            {detailUser.id !== myId && (
              <button
                onClick={() => deleteUser(detailUser.id)}
                disabled={deleting}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 50,
                  border: "1px solid #EF444444",
                  background: "#EF444411", color: "#EF4444",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 2,
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                {deleting ? "DELETING..." : "DELETE USER"}
              </button>
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
          <Link
            key={t.id}
            href={t.route}
            prefetch={true}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "2px 4px",
              color: pathname === t.route ? "#FF5F1F" : "#666",
              fontFamily: "'Barlow', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              transform: pathname === t.route ? "translateY(-2px)" : "none",
              transition: "all 0.2s",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function DetailRow({ label, value, mono, last }: { label: string; value: string | null | undefined; mono?: boolean; last?: boolean }) {
  return (
    <div style={{ paddingBottom: last ? 0 : 14, marginBottom: last ? 0 : 14, borderBottom: last ? "none" : "1px solid #1E1E1E" }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 4px" }}>{label}</p>
      <p style={{
        margin: 0, fontSize: 16, color: value ? "#F5F5F5" : "#444",
        fontFamily: mono ? "'Barlow Condensed', sans-serif" : "'Barlow', sans-serif",
        fontWeight: mono ? 700 : 400,
        fontStyle: value ? "normal" : "italic",
      }}>
        {value || "—"}
      </p>
    </div>
  );
}
