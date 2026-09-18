import React from "react";

/** See /docs/13-ADMIN-OPS.md §Live map. */
export default function LiveMapPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Live Map</h1>
      <div
        style={{
          height: 480,
          borderRadius: 16,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div>Map integration point — online professionals, active/en-route jobs, no-match hotspots.</div>
        <div style={{ fontSize: 12 }}>Wire to MapsRoutingProvider + a live-location subscription (Epic 7/12).</div>
      </div>
    </div>
  );
}
