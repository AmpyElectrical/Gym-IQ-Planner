"use client";
import { ReactNode } from "react";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";

function ThemeWrapper({ children }: { children: ReactNode }) {
  const { isDark, toggle } = useTheme();

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      <button
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position: "fixed",
          top: 14,
          right: 14,
          zIndex: 9999,
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isDark ? "none" : "0 1px 6px rgba(0,0,0,0.10)",
        }}
      >
        {isDark ? "☀️" : "🌙"}
      </button>
      {children}
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
