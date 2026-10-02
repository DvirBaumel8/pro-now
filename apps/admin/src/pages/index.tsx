import React from "react";
import { KpiCard } from "../components/KpiCard";

/**
 * Dashboard — see /docs/13-ADMIN-OPS.md §Dashboard KPIs. Real numbers
 * require the analytics/KPI aggregation endpoints from Epic 12
 * (see /docs/18-ROADMAP.md); this delivery renders the exact KPI set the
 * spec defines against clearly-labeled demo figures so the layout, and
 * the wiring point for real data, both exist.
 */
export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Live Operations Dashboard</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>
        Demo figures — wire to Epic 12 KPI aggregation. See /docs/13-ADMIN-OPS.md.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <KpiCard label="Jobs today" value="112" />
        <KpiCard label="GMV" value="₪41,200" />
        <KpiCard label="Platform revenue" value="₪4,940" />
        <KpiCard label="Online professionals" value="38" />
        <KpiCard label="Active searches" value="6" />
        <KpiCard label="Active jobs" value="21" />
        <KpiCard label="Average ETA" value="13.4 min" />
        <KpiCard label="Acceptance rate" value="87%" />
        <KpiCard label="Cancellation rate" value="4.1%" />
        <KpiCard label="Completion rate" value="95.8%" />
        <KpiCard label="Unfulfilled demand" value="3 jobs" sub="No eligible pro found — see /docs/13-ADMIN-OPS.md" />
      </div>

      <h2 style={{ fontSize: 16, marginTop: 40, marginBottom: 12 }}>Liquidity health</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 560 }}>
        "When a customer asks NOW, can we reliably get someone moving toward
        them?" — see /docs/13-ADMIN-OPS.md §Analytics. No
        threshold is frozen before a real pilot baseline exists.
      </p>
    </div>
  );
}
