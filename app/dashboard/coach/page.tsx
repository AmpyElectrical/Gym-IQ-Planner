"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard" },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan" },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs" },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks" },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: "/dashboard/coach" },
  { id: "profile",  icon: "👤",  label: "Profile",  route: "/dashboard/profile"  },
  { id: "settings", icon: "⚙️",  label: "Settings", route: "/dashboard/settings" },
];

const QUICK_PROMPTS = [
  "Plan my next 12 weeks for size and strength",
  "My legs are lagging — fix my program",
  "How much protein do I actually need?",
  "What should I change given my physical job?",
];

type Message = { role: "user" | "assistant"; content: string };

export default function CoachPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();
  const [pageLoading, setPageLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [micUnsupported, setMicUnsupported] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<{ stop(): void } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.replace("/"); return null; } return r.json(); })
      .then((d) => { if (!d) return; setPageLoading(false); })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const reply = await res.text();
      setMessages((prev) => [...prev, { role: "assistant", content: reply || "Sorry, something went wrong. Please try again." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setStreaming(false);
    }
  }

  function toggleMic() {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SR = typeof window !== "undefined"
      ? ((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition)
      : null;
    if (!SR) { setMicUnsupported(true); setTimeout(() => setMicUnsupported(false), 3000); return; }
    const textBeforeRecording = input;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = new (SR as any)();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-AU";
    r.onresult = (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => {
      let full = "";
      for (let i = 0; i < Object.keys(e.results).length; i++) full += e.results[i][0].transcript;
      setInput((textBeforeRecording ? textBeforeRecording + " " : "") + full);
    };
    r.onerror = () => setRecording(false);
    r.onend = () => setRecording(false);
    r.start();
    recognitionRef.current = r;
    setRecording(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
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
    <div style={{ height: "100vh", background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "'Barlow', sans-serif", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes typingDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}} @keyframes micPulse{0%,100%{box-shadow:0 0 0 0 #FF5F1F55}60%{box-shadow:0 0 0 8px #FF5F1F00}}`}</style>

      {/* Header */}
      <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: "#666", textTransform: "uppercase", margin: "0 0 2px" }}>YOUR AI</p>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 36, lineHeight: 1, margin: 0 }}>COACH</h1>
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Empty state — quick prompts */}
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <p style={{ fontSize: 13, color: "#555", fontWeight: 600, margin: "0 0 4px" }}>Ask your coach anything, or try:</p>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                style={{
                  background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12,
                  borderLeft: isDark ? "1px solid var(--border)" : "4px solid #FF5F1F",
                  padding: "13px 16px", color: "var(--text-primary)", fontFamily: "'Barlow', sans-serif",
                  fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#FF5F1F55")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#FF5F1F22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                🤖
              </div>
            )}
            <div
              style={{
                maxWidth: "82%",
                background: msg.role === "user" ? "#FF5F1F" : "#161616",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 14px",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.content || (
                <span style={{ animation: "blink 1s step-end infinite", color: "#666" }}>▍</span>
              )}
            </div>
          </div>
        ))}

        {streaming && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#FF5F1F22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2 }}>
              🤖
            </div>
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "16px 16px 16px 4px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#666", animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: "12px 16px 100px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        {micUnsupported && (
          <div style={{ fontSize: 12, color: "#888", textAlign: "center", marginBottom: 8 }}>
            Use Chrome or Safari for voice input
          </div>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach…"
            disabled={streaming}
            rows={1}
            style={{
              flex: 1, background: "var(--card-bg)", color: "var(--text-primary)",
              border: "1px solid var(--border)", borderRadius: 12,
              padding: "10px 14px", fontSize: 14,
              fontFamily: "'Barlow', sans-serif", outline: "none",
              resize: "none", maxHeight: 120, overflowY: "auto",
              lineHeight: 1.5,
            }}
            onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={toggleMic}
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              border: `1px solid ${recording ? "#FF5F1F66" : "#333"}`,
              background: recording ? "#FF5F1F22" : "#161616",
              color: recording ? "#FF5F1F" : "#666",
              fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: recording ? "micPulse 1.4s ease-out infinite" : "none",
            }}
          >
            🎙
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            style={{
              width: 44, height: 44, borderRadius: 12, border: "none", flexShrink: 0,
              background: !input.trim() || streaming ? "#222" : "#FF5F1F",
              color: !input.trim() || streaming ? "#555" : "#fff",
              fontSize: 18, cursor: !input.trim() || streaming ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
            }}
          >
            {streaming ? (
              <div style={{ width: 16, height: 16, border: "2px solid #444", borderTopColor: "#888", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : "↑"}
          </button>
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
