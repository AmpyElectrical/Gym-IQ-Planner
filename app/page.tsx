"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Barlow', sans-serif",
        padding: "24px",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap"
        rel="stylesheet"
      />

      <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        {/* Logo mark */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "#FF5F1F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 36,
          }}
        >
          ⚡
        </div>

        {/* Wordmark */}
        <h1
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 56,
            color: "#F5F5F5",
            letterSpacing: 2,
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          GYMIQ
        </h1>
        <p
          style={{
            color: "#666",
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 48,
            letterSpacing: 0.5,
          }}
        >
          Your intelligent training partner
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoComplete="username"
            autoCapitalize="none"
            style={{
              background: "#1E1E1E",
              color: "#F5F5F5",
              border: "1px solid #333",
              borderRadius: 12,
              padding: "14px 18px",
              fontSize: 16,
              fontFamily: "'Barlow', sans-serif",
              outline: "none",
              width: "100%",
              textAlign: "center",
              letterSpacing: 0.5,
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
            onBlur={(e) => (e.target.style.borderColor = "#333")}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            style={{
              background: "#1E1E1E",
              color: "#F5F5F5",
              border: "1px solid #333",
              borderRadius: 12,
              padding: "14px 18px",
              fontSize: 16,
              fontFamily: "'Barlow', sans-serif",
              outline: "none",
              width: "100%",
              textAlign: "center",
              letterSpacing: 2,
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
            onBlur={(e) => (e.target.style.borderColor = "#333")}
          />

          {error && (
            <p style={{ color: "#EF4444", fontSize: 13, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            style={{
              background: loading || !username.trim() ? "#333" : "#FF5F1F",
              color: loading || !username.trim() ? "#666" : "#fff",
              border: "none",
              borderRadius: 50,
              padding: "15px 0",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: 2,
              cursor: loading || !username.trim() ? "not-allowed" : "pointer",
              transition: "background 0.2s, color 0.2s",
              width: "100%",
            }}
          >
            {loading ? "LOADING..." : "LET'S GO"}
          </button>
        </form>
      </div>
    </main>
  );
}
