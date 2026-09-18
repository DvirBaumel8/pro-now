import React from "react";
import Link from "next/link";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/live-map", label: "Live Map" },
  { href: "/jobs", label: "Jobs" },
  { href: "/providers", label: "Provider Approval" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 220,
          borderInlineEnd: "1px solid var(--border)",
          padding: 24,
          flexShrink: 0,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>PRO NOW</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 24 }}>Live Operations</div>
        <div
          style={{
            fontSize: 11,
            color: "var(--warning)",
            background: "rgba(245,165,36,0.12)",
            borderRadius: 8,
            padding: "6px 8px",
            marginBottom: 24,
          }}
        >
          SANDBOX providers active — not production. See /docs/18-ROADMAP.md.
        </div>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{ display: "block", padding: "8px 0", color: "var(--text-primary)", textDecoration: "none", fontSize: 14 }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}
