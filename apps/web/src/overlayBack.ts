import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

/**
 * THE PHONE'S BACK CLOSES WHAT IS OPEN ON THE PAGE (the demo's
 * `openOverlay`, tools/design-preview/src/backGesture.ts; its button
 * audit #13).
 *
 * Home keeps its views in its own state (the menu, a category, a service's
 * page, the request form, the lists of every service and department), so
 * none of them had an address and the phone's back left home from all of
 * them. Opening one now adds a history entry on the same address, marked
 * with its token, and registers how to close it; the next back pops that
 * entry and closes it, and nothing else.
 *
 * - Closed on screen, the view takes its entry back off, so no spare step is
 *   left (one closed under another is stepped over when back reaches it). A view opened in the same moment (a category's service, say)
 *   waits for that back to land before adding its own entry.
 * - Left behind by a navigation away (sending a request opens the job), an
 *   entry belongs to nobody; arriving on one by back steps over it.
 */
type Entry = { token: string; close: () => void };

function overlayOf(state: unknown): string | null {
  return (state as { overlay?: string } | null)?.overlay ?? null;
}

/** The token on the current history entry, as the router keeps it (`history.state.usr`). */
function currentToken(): string | null {
  if (typeof window === "undefined") return null;
  return overlayOf((window.history.state as { usr?: unknown } | null)?.usr ?? null);
}

export function useOverlayBack(): (close: () => void) => () => void {
  const navigate = useNavigate();
  const stack = useRef<Entry[]>([]);
  const waiting = useRef<Entry[]>([]);
  const backInFlight = useRef(false);
  const dead = useRef(new Set<string>());

  // Stable for the page's lifetime: the router's navigate can change with each navigation, and a new
  // function here would re-run every opening's registration (and push its entry again).
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const push = useCallback(
    (entry: Entry) => {
      stack.current.push(entry);
      // The address and state as they are now: a replace in the same moment (`?service=` read and dropped) is already in them.
      const { pathname, search } = window.location;
      const state = (window.history.state as { usr?: object | null } | null)?.usr ?? null;
      navigateRef.current(`${pathname}${search}`, { state: { ...(state ?? {}), overlay: entry.token } });
    },
    [],
  );

  /*
   * The browser's own popstate, not the router's location: a push and a back
   * close together can land in one render, and the location the screen saw
   * then never changes.
   */
  useEffect(() => {
    const onPop = () => {
      const at = currentToken();
      const stepOver = () => {
        backInFlight.current = true;
        window.history.back();
      };
      // The entry of a view closed on screen under another one: nothing to do here.
      if (at !== null && dead.current.delete(at)) return stepOver();
      // Back went past an overlay's entry: close it (and any opened over it).
      while (stack.current.length > 0 && stack.current[stack.current.length - 1]!.token !== at) stack.current.pop()!.close();
      // An entry nobody owns any more (left behind by a navigation away): step over it.
      if (at !== null && stack.current.length === 0) return stepOver();
      if (backInFlight.current) {
        // Our own back landed: now the views opened meanwhile get their entries.
        backInFlight.current = false;
        waiting.current.splice(0).forEach(push);
      }
    };
    // Arrived on an entry left behind before this page was here to own it (back from the job a
    // request opened): step over it, as the listener would have.
    if (currentToken() !== null && stack.current.length === 0) {
      backInFlight.current = true;
      window.history.back();
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [push]);

  return useCallback(
    (close: () => void) => {
      const entry = { token: Math.random().toString(36).slice(2), close };
      if (backInFlight.current) waiting.current.push(entry);
      else push(entry);
      return () => {
        const queued = waiting.current.indexOf(entry);
        if (queued >= 0) {
          waiting.current.splice(queued, 1);
          return;
        }
        const i = stack.current.indexOf(entry);
        if (i < 0) return; // Already closed by back.
        stack.current.splice(i, 1);
        // Closed on screen: its entry comes back off, now if it is the current one, else when back reaches it.
        if (currentToken() === entry.token) {
          backInFlight.current = true;
          window.history.back();
        } else dead.current.add(entry.token);
      };
    },
    [push],
  );
}
