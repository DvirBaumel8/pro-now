import React from "react";

/** See /docs/13-ADMIN-OPS.md §Provider approval & risk queues. */
const QUEUE = [
  { name: "דניאל לוי", service: "אינסטלטור", stage: "IDENTITY_REVIEW" },
  { name: "מאיה כהן", service: "מניקור ג'ל", stage: "SERVICE_REVIEW" },
  { name: "אבי ישראלי", service: "חשמלאי", stage: "CREDENTIALS_PENDING" },
];

export default function ProvidersPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Provider Approval Queue</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "start", color: "var(--text-secondary)", fontSize: 13 }}>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Service</th>
            <th style={{ padding: 8 }}>Stage</th>
            <th style={{ padding: 8 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {QUEUE.map((row) => (
            <tr key={row.name} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: 8 }}>{row.name}</td>
              <td style={{ padding: 8 }}>{row.service}</td>
              <td style={{ padding: 8 }}>{row.stage}</td>
              <td style={{ padding: 8 }}>
                <button
                  style={{
                    background: "var(--action)",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: "#03130A",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 16 }}>
        Every approval/suspension action here must be RBAC-gated and audit-logged — see /docs/11-SECURITY.md and /docs/10-TRUST-VERIFICATION.md.
      </p>
    </div>
  );
}
