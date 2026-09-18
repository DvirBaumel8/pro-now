import React, { useState } from "react";
import { useRouter } from "next/router";

/** See /docs/13-ADMIN-OPS.md §Job inspector. */
export default function JobsSearchPage() {
  const [jobId, setJobId] = useState("");
  const router = useRouter();

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Job Inspector</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (jobId) router.push(`/jobs/${jobId}`);
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          placeholder="Job ID"
          style={{
            flex: 1,
            maxWidth: 320,
            padding: 10,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          style={{ background: "var(--action)", border: "none", borderRadius: 8, padding: "0 16px", color: "#03130A", fontWeight: 600, cursor: "pointer" }}
        >
          Open
        </button>
      </form>
      <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 16 }}>
        "I waited half an hour and nobody came" becomes an answer, not a guess — every job's full event timeline is reconstructable here. See /docs/13-ADMIN-OPS.md.
      </p>
    </div>
  );
}
