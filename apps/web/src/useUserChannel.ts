import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "./auth";

/**
 * The person's own live channel (docs/21 W9): an offer or a notification
 * makes the matching query re-read the server. Reconnects with backoff;
 * every (re)connect re-reads, so nothing sent while it was down is lost.
 */
const MAX_BACKOFF_MS = 15_000;
export const inboxKey = ["inbox"] as const;

export function useUserChannel() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const signedIn = Boolean(session);

  useEffect(() => {
    if (!signedIn || typeof WebSocket === "undefined") return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;
    let attempt = 0;
    let closed = false;
    const refresh = (type?: string) => {
      if (!type || type === "OFFER") void queryClient.invalidateQueries({ queryKey: ["pro-offer"] });
      if (!type || type === "NOTIFICATION") void queryClient.invalidateQueries({ queryKey: inboxKey });
    };
    const connect = () => {
      socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/v1/ws/me`);
      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data)) as { type?: string };
          if (msg.type === "READY") {
            attempt = 0;
            refresh();
          } else if (msg.type === "OFFER" || msg.type === "NOTIFICATION") {
            refresh(msg.type);
          }
        } catch {
          // Not ours; the periodic re-read covers anything lost.
        }
      };
      socket.onopen = () => {
        ping = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send("ping"), 25_000);
      };
      socket.onclose = (e) => {
        clearInterval(ping);
        if (closed || e.code === 4401) return;
        retry = setTimeout(connect, Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt++));
      };
    };
    connect();
    return () => {
      closed = true;
      clearInterval(ping);
      clearTimeout(retry);
      socket?.close();
    };
  }, [signedIn, queryClient]);
}
