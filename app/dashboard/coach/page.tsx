"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const TABS = [
  { id: "home",    icon: "⚡",  label: "Home",    route: "/dashboard" },
  { id: "plan",    icon: "📋",  label: "Plan",    route: "/dashboard/plan" },
  { id: "pbs",     icon: "🏆",  label: "PBs",     route: "/dashboard/pbs" },
  { id: "ranks",   icon: "👑",  label: "Ranks",   route: "/dashboard/ranks" },
  { id: "coach",   icon: "🤖",  label: "Coach",   route: "/dashboard/coach" },
  { id: "profile", icon: "👤",  label: "Profile", route: "/dashboard/profile" },
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
  const [pageLoading, setPageLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.replace("/"); return null; } return r.json(); })
      .then((d) => { if (!d) return; setPageLoading(false); })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const finalText = accumulated;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: finalText };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
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

  return (
    <div style={{ height: "100vh", background: "#000", color: "#F5F5F5", fontFamily: "'Barlow', sans-serif", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      {/* Header */}
      <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid #111", flexShrink: 0 }}>
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
                  background: "#161616", border: "1px solid #2a2a2a", borderRadius: 12,
                  padding: "13px 16px", color: "#F5F5F5", fontFamily: "'Barlow', sans-serif",
                  fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#FF5F1F55")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
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
                border: msg.role === "assistant" ? "1px solid #222" : "none",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 14px",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#F5F5F5",
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

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: "12px 16px 80px", borderTop: "1px solid #111", flexShrink: 0, display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your coach…"
          disabled={streaming}
          rows={1}
          style={{
            flex: 1, background: "#161616", color: "#F5F5F5",
            border: "1px solid #333", borderRadius: 12,
            padding: "10px 14px", fontSize: 14,
            fontFamily: "'Barlow', sans-serif", outline: "none",
            resize: "none", maxHeight: 120, overflowY: "auto",
            lineHeight: 1.5,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#FF5F1F")}
          onBlur={(e) => (e.target.style.borderColor = "#333")}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          style={{
            width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0,
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
