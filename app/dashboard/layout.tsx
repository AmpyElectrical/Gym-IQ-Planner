"use client";
import { ReactNode } from "react";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";

function ThemeWrapper({ children }: { children: ReactNode }) {
  const { isDark, toggle } = useTheme();

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@900&display=swap" rel="stylesheet" />
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 52,
        zIndex: 9999, background: "var(--card-bg)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px",
      }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, letterSpacing: 1, color: "#FF5F1F" }}>
          GymIQ
        </span>
        <button
          onClick={toggle}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: "var(--input-bg)", border: "1px solid var(--border)",
            fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {isDark ? "☀️" : "🌙"}
        </button>
      </header>
      <div style={{ paddingTop: 52 }}>
        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ThemeWrapper>{children}</ThemeWrapper>
    </ThemeProvider>
  );
}
