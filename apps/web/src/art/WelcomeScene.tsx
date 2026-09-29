/**
 * The welcome screen's picture: the painted street of neon shops.
 *
 * Ported 1:1 from the demo (tools/design-preview/src/App.tsx,
 * `WelcomeScene` / `StreetScene painted`, at the fork 48ee159), so the
 * product's first screen is the demo's first screen (docs/21 W2).
 */
import { useEffect, useMemo, useRef, useState } from "react";

const CITY_HERO_CSS = "@keyframes pnCity{0%{transform:scale(1.02) translateX(0)}100%{transform:scale(1.12) translateX(-3%)}}";

const STREET_GLOWS: ReadonlyArray<{ x: number; y: number; r: number; c: string; kind: "neon" | "lamp" | "head" }> = [
  { x: 0.18, y: 0.255, r: 0.2, c: "255,70,190", kind: "neon" },
  { x: 0.44, y: 0.265, r: 0.17, c: "60,120,255", kind: "neon" },
  { x: 0.655, y: 0.26, r: 0.15, c: "70,230,120", kind: "neon" },
  { x: 0.845, y: 0.258, r: 0.13, c: "255,60,80", kind: "neon" },
  { x: 0.585, y: 0.3, r: 0.06, c: "255,200,120", kind: "lamp" },
  { x: 0.77, y: 0.305, r: 0.05, c: "255,200,120", kind: "lamp" },
  { x: 0.95, y: 0.29, r: 0.05, c: "255,200,120", kind: "lamp" },
  { x: 0.84, y: 0.68, r: 0.1, c: "255,200,120", kind: "lamp" },
  { x: 0.965, y: 0.925, r: 0.08, c: "255,200,120", kind: "lamp" },
  { x: 0.03, y: 0.76, r: 0.07, c: "255,240,200", kind: "head" },
  { x: 0.17, y: 0.77, r: 0.07, c: "255,240,200", kind: "head" },
  { x: 0.435, y: 0.64, r: 0.06, c: "255,240,200", kind: "head" },
  { x: 0.635, y: 0.54, r: 0.05, c: "255,240,200", kind: "head" },
  { x: 0.72, y: 0.545, r: 0.05, c: "255,240,200", kind: "head" },
  { x: 0.845, y: 0.46, r: 0.04, c: "255,240,200", kind: "head" },
  { x: 0.9, y: 0.46, r: 0.04, c: "255,240,200", kind: "head" },
];

const STREET_CSS = `
@keyframes pnNeon{0%,100%{opacity:.55}45%{opacity:1}50%{opacity:.35}55%{opacity:.95}}
@keyframes pnLamp{0%,100%{opacity:.7}30%{opacity:.95}33%{opacity:.5}36%{opacity:.9}}
@keyframes pnHead{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.35)}}
@keyframes pnSpeck{0%{transform:translateY(0);opacity:0}15%{opacity:.9}100%{transform:translateY(-140px);opacity:0}}
`;

export function WelcomeScene() {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 700 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  /* The image's own frame, fitted as `cover` would fit it (2:3), so a
     glow placed on a sign stays on that sign at any screen size. */
  const iw = Math.max(size.w, (size.h * 2) / 3);
  const ih = iw * 1.5;
  const left = (size.w - iw) / 2;
  const top = (size.h - ih) * 0.3;
  const specks = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37) % 100, y: 35 + ((i * 53) % 55), d: 5 + (i % 5), delay: -(i * 0.9) })),
    []
  );
  return (
    <div ref={box} aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#2a1838" }}>
      <style>{CITY_HERO_CSS + STREET_CSS}</style>
      <div style={{ position: "absolute", left, top, width: iw, height: ih, animation: "pnCity 24s ease-in-out infinite alternate", transformOrigin: "50% 40%" }}>
        <img src="/clips/city_street.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        {STREET_GLOWS.map((g, i) => (
          <div
            key={i}
            style={{
              position: "absolute", left: `${g.x * 100}%`, top: `${g.y * 100}%`, width: g.r * iw, height: g.r * iw,
              transform: "translate(-50%,-50%)", borderRadius: "50%", mixBlendMode: "screen", pointerEvents: "none",
              background: `radial-gradient(circle, rgba(${g.c},.75) 0%, rgba(${g.c},.25) 40%, rgba(${g.c},0) 70%)`,
              animation: g.kind === "neon" ? `pnNeon ${3.2 + i * 0.4}s ease-in-out infinite` : g.kind === "lamp" ? `pnLamp ${4 + i * 0.3}s linear infinite` : `pnHead ${2.2 + (i % 3) * 0.5}s ease-in-out ${-i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>
      {specks.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: 4, height: 4, borderRadius: "50%", background: "rgba(255,210,150,.9)", boxShadow: "0 0 8px rgba(255,190,120,.9)", animation: `pnSpeck ${p.d}s linear ${p.delay}s infinite` }} />
      ))}
    </div>
  );
}
