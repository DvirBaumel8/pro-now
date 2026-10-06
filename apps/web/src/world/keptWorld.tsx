import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router";

/**
 * THE STREET, KEPT UNDER A SERVICE (the demo's: its city stays mounted and
 * paused while a shop's service page is open, and back returns into the
 * shop where you were).
 *
 * The street is one mounted thing for the whole app: it is drawn on /world,
 * and once it hands off to a service (`keep`), it stays mounted, hidden and
 * paused, while Home shows the service page and the request form. Going back
 * returns to the same street, still inside the shop: nothing is fetched,
 * built or arrived at again. It is let go (`release`) when the street is
 * left through its own exit, when the service flow ends without going back
 * (sent, or closed), and when anything other than home or the street is
 * opened, so a hidden WebGL street never outlives what it was kept for.
 */
interface WorldKeeper {
  kept: boolean;
  keep(): void;
  release(): void;
}

const KeeperContext = createContext<WorldKeeper>({ kept: false, keep: () => undefined, release: () => undefined });

/** Where a kept street may stay mounted: the street itself, and home (the service flow). */
export function mayKeepWorldAt(pathname: string): boolean {
  return pathname === "/world" || pathname === "/";
}

export function WorldKeeperProvider({ children }: { children: ReactNode }) {
  const [kept, setKept] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    if (kept && !mayKeepWorldAt(pathname)) setKept(false);
  }, [kept, pathname]);
  const keep = useCallback(() => setKept(true), []);
  const release = useCallback(() => setKept(false), []);
  const value = useMemo(() => ({ kept, keep, release }), [kept, keep, release]);
  return <KeeperContext.Provider value={value}>{children}</KeeperContext.Provider>;
}

export function useWorldKeeper(): WorldKeeper {
  return useContext(KeeperContext);
}

/**
 * The one street: shown on /world, and hidden but mounted while kept.
 * `render(hidden)` draws it (the app passes its guards and `World`).
 */
export function KeptWorldLayer({ render }: { render: (hidden: boolean) => ReactNode }) {
  const { pathname } = useLocation();
  const { kept } = useWorldKeeper();
  const shown = pathname === "/world";
  if (!shown && !kept) return null;
  return <div style={shown ? { display: "contents" } : { display: "none" }} aria-hidden={!shown || undefined}>{render(!shown)}</div>;
}
