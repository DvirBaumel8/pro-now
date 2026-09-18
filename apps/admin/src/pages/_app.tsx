import type { AppProps } from "next/app";
import "../styles/globals.css";
import { AdminShell } from "../components/AdminShell";

/**
 * PRO NOW Admin — Live Operations. See /docs/13-ADMIN-OPS.md. Built from
 * v1, not "phase 2": dashboard KPIs, live map, job inspector, provider
 * approval queues, remote config — this delivery implements the
 * dashboard and job inspector shell; provider-approval and config screens
 * are the natural next slice (see /docs/EPIC-0-REPORT.md).
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <AdminShell>
      <Component {...pageProps} />
    </AdminShell>
  );
}
