/**
 * The street behind the top of the home screen, and the day/night rule it
 * follows. Ported 1:1 from the demo (tools/design-preview/src/App.tsx
 * `CityHero`, src/daylight.ts): our own city, photographed at the viewer's
 * hour, 06:00–18:00 by day.
 */
export function isDaytime(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h >= 6 && h < 18;
}

const CITY_HERO_CSS = "@keyframes pnCity{0%{transform:scale(1.02) translateX(0)}100%{transform:scale(1.12) translateX(-3%)}}";

export function CityHero({ lift = 0 }: { lift?: number }) {
  const bg = isDaytime()
    ? { src: "/world/splash_city_day.webp", pos: "50% 40%" }
    : { src: "/world/splash_city.webp", pos: "64% 50%" };
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#2a1838" }}>
      <style>{CITY_HERO_CSS}</style>
      <img
        src={bg.src}
        alt=""
        style={{
          position: "absolute", left: 0, right: 0, top: `${-lift}%`, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: bg.pos, filter: "brightness(1.1) saturate(1.12)",
          animation: "pnCity 22s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
}
