import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { useSession } from "./auth";
import { Frame } from "./frame";
import { Home } from "./screens/Home";
import { SignIn } from "./screens/SignIn";
import { Welcome } from "./screens/Welcome";

/**
 * Who may see what is decided by the server's session, never by the client
 * (CLAUDE.md §3): these guards only choose which screen to draw while the
 * API enforces access on every call.
 */
function SignedIn({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();
  if (isPending) return null;
  return data ? children : <Navigate to="/welcome" replace />;
}

function SignedOut({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();
  if (isPending) return null;
  return data ? <Navigate to="/" replace /> : children;
}

export function App() {
  return (
    <BrowserRouter>
      <Frame>
        <Routes>
          <Route path="/welcome" element={<SignedOut><Welcome /></SignedOut>} />
          <Route path="/sign-in" element={<SignedOut><SignIn /></SignedOut>} />
          <Route path="/" element={<SignedIn><Home /></SignedIn>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Frame>
    </BrowserRouter>
  );
}
