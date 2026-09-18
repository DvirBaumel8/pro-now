import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { fetchJob } from "../../lib/api";

/**
 * Job inspector detail — see /docs/13-ADMIN-OPS.md §Job inspector. Fetches
 * the real job + event timeline from GET /v1/jobs/:id
 * (/docs/06-API-SPEC.md). Requires an admin bearer token in a production
 * build; this delivery calls the endpoint directly for the demo.
 */
export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [job, setJob] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchJob(id)
      .then((res) => setJob(res.job))
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Job {id}</h1>
      {error && (
        <p style={{ color: "var(--danger)" }}>
          Could not load this job from the API ({error}). Make sure apps/api is running locally — see /README.md.
        </p>
      )}
      {job && (
        <>
          <div style={{ marginBottom: 24, color: "var(--text-secondary)", fontSize: 13 }}>
            Status: <strong style={{ color: "var(--text-primary)" }}>{job.status}</strong>
          </div>
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>Event timeline</h2>
          <div style={{ borderInlineStart: "2px solid var(--border)", paddingInlineStart: 16 }}>
            {(job.events ?? []).map((event: any) => (
              <div key={event.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {new Date(event.createdAt).toLocaleTimeString()} · {event.actor}
                </div>
                <div style={{ fontSize: 14 }}>{event.type}</div>
              </div>
            ))}
            {(job.events ?? []).length === 0 && <div style={{ color: "var(--text-secondary)" }}>No events yet.</div>}
          </div>
        </>
      )}
    </div>
  );
}
