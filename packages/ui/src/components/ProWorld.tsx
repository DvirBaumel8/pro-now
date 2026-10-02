import React, { useEffect, useMemo, useRef, useId } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from "react-native-svg";

// Colours below are illustration art; the theme is not read here on purpose.

/**
 * PRO NOW WORLD — an imaginary neighbourhood, and the reason it can never
 * take a coordinate.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS IS
 * ---------------------------------------------------------------------
 * The surface the customer waits on while dispatch runs. Four versions were
 * rejected before this one: a rotating radar (*"שלא יראה כמו חיפוש ראדר של
 * מטוס"*), dots converging on black (empty), a lattice of igniting nodes
 * (*"משחק של חלליות"* — science fiction, cold), and a dark purple isometric
 * city that was closer but still night-time and still a city.
 *
 * The brief that settled it, from Amit: *"פחות אפל. יותר שמח… צבעוני ושמח
 * לעיניים… קח את זה לעולם וירטואלי."* And ChatGPT's correction, which is
 * the part that keeps it from going wrong:
 *
 *   **Playful premium, not childish.**
 *
 * Colourful, alive, a little magical, with depth and motion — and no cute
 * cartoon characters, no coins, no confetti, no XP, no exaggerated bounce
 * and no game sounds. Trust does not come from the illustration. Trust
 * arrives afterwards, with a real face, a real name and real verifications.
 * What this screen is allowed to say is only: *we are working for you*, and
 * to make ten to twenty anxious seconds pleasant to sit inside.
 *
 * The contrast is the point: **an imaginary world while we search, a real
 * person when we find one.** The moment the illustration opens and a real
 * professional steps out of it is the strongest brand moment available.
 *
 * ---------------------------------------------------------------------
 * WHY THE CENTRE IS NOT THE CUSTOMER'S HOUSE
 * ---------------------------------------------------------------------
 * The obvious design — your home at the middle, professionals converging —
 * was wrong, and ChatGPT caught it: *"לא הבית שלך ברחוב X."* The instant a
 * building is *your* building, the drawing becomes a map, and everything
 * around it becomes a claim about where people are. The centre is an
 * abstract landmark standing for **your request**, and the rest is a
 * neighbourhood that belongs to nobody.
 *
 * ---------------------------------------------------------------------
 * THE SEPARATION THAT MAKES THIS HONEST, ENFORCED BY THE TYPES
 * ---------------------------------------------------------------------
 * A lively world is fine. A lively world that implies supply is fabricated
 * supply (/CLAUDE.md §3) — a claim about who is near you, drawn so that it
 * does not look like a claim. So there are two different kinds of thing on
 * this screen and they are different types:
 *
 *   **Ambient life** — windows, vehicles, trees, light, the world itself.
 *   Carries no provider, no count, no meaning. It is scenery. This file
 *   renders only ambient life, and `ProWorldProps` has no way to pass it a
 *   professional, a candidate, a count or a position. The absence is the
 *   safeguard: you cannot leak what the component cannot accept.
 *
 *   **Candidate presence** — a REAL person the server returned. It lives in
 *   `CandidatePresence`, in a layer above this world, and it never receives
 *   a position in it. See that file.
 *
 * ChatGPT's architectural note, which is now true of the code: *"מפתח פשוט
 * לא יוכל בטעות לשים candidate ב-lat/lng בתוך העולם המאויר."*
 *
 * And this component must never be given coordinates. There is no `lat`,
 * no `lng`, no `region` and no `center` prop, and there never should be —
 * if a real position is needed, the answer is `RealMapSurface`, which is
 * allowed only after assignment (§11).
 */

/**
 * Illustration colours — ART, not tokens. They live only inside this world
 * and must never reach the interface, where a colour carries meaning (coral
 * = consequence, teal = verified). A pink rooftop claims nothing; a pink
 * button would.
 */
const W = {
  skyTop: "#FFF3E2",
  skyBottom: "#FFE3D0",
  grass: "#BFE3B4",
  grassDeep: "#A6D69A",
  path: "#F4E7D2",
  roofTerracotta: "#E8724C",
  roofSun: "#F4B942",
  roofMint: "#5FC3A4",
  roofSky: "#6FA8DC",
  wall: "#FFF8ED",
  wallShade: "#F0DFC9",
  window: "#FFD36E",
  windowOff: "#DCC9AE",
  tree: "#4FA96B",
  treeDark: "#3B8955",
  trunk: "#8A6244",
  van: "#FFFFFF",
  vanTrim: "#E8724C",
  landmark: "#FF5C38",
} as const;

export interface ProWorldProps {
  width: number;
  height: number;
  /**
   * False stops every animation dead (§7, and reduced motion). The world
   * stays; only the life in it stops.
   */
  active?: boolean;
  /*
   * DELIBERATELY ABSENT, AND NOT AN OVERSIGHT:
   *   no `professionals`, no `candidates`, no `availableCount`
   *   no `lat`, no `lng`, no `region`, no `center`
   * See the header. Ambient life carries no meaning and this world carries
   * no geography.
   */
}

/** One building in the fixed art. Identical for every customer, everywhere. */
interface Lot {
  gx: number;
  gy: number;
  kind: "house" | "block" | "shop";
  h: number;
  roof: string;
  lit: number;
}

const LOTS: Lot[] = [
  { gx: -2, gy: -1, kind: "house", h: 26, roof: W.roofTerracotta, lit: 2 },
  { gx: -1, gy: -2, kind: "block", h: 48, roof: W.roofSky, lit: 4 },
  { gx: 1, gy: -2, kind: "house", h: 24, roof: W.roofMint, lit: 1 },
  { gx: 2, gy: -1, kind: "block", h: 40, roof: W.roofSun, lit: 3 },
  { gx: -2, gy: 1, kind: "shop", h: 22, roof: W.roofSun, lit: 2 },
  { gx: 2, gy: 1, kind: "house", h: 28, roof: W.roofSky, lit: 2 },
  { gx: -1, gy: 2, kind: "block", h: 44, roof: W.roofTerracotta, lit: 3 },
  { gx: 1, gy: 2, kind: "house", h: 25, roof: W.roofMint, lit: 1 },
  { gx: 0, gy: -3, kind: "house", h: 22, roof: W.roofSun, lit: 1 },
  { gx: 0, gy: 3, kind: "shop", h: 20, roof: W.roofMint, lit: 2 },
];

const TREES = [
  { gx: -3, gy: 0 },
  { gx: 3, gy: 0 },
  { gx: -1, gy: 0.9 },
  { gx: 1.1, gy: -0.9 },
  { gx: -2.9, gy: 2 },
  { gx: 2.9, gy: -2 },
];

export function ProWorld({ width, height, active = true }: ProWorldProps) {
  /*
   * A GRADIENT ID NOBODY ELSE CAN CLAIM. On react-native-web every SVG
   * lands in one document, so two instances of this component defining
   * `proSky` would collide and the second one's sky would resolve to
   * nothing once the first unmounted.
   */
  const unique = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cx = width / 2;
  const cy = height * 0.52;
  const tw = Math.max(32, Math.round(width / 9.5));
  const th = Math.round(tw * 0.55);

  /** One driver for the whole world. Cheap, and everything stays in phase. */
  const life = useRef(new Animated.Value(0)).current;
  /** The camera's almost-imperceptible drift. */
  const camera = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      life.setValue(0);
      camera.setValue(0);
      return;
    }
    const loops = [
      Animated.loop(
        Animated.timing(life, {
          toValue: 1,
          duration: 7200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(camera, {
            toValue: 1,
            duration: 9000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(camera, {
            toValue: 0,
            duration: 9000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, life, camera]);

  const project = useMemo(
    () => (gx: number, gy: number) => ({ x: cx + (gx - gy) * tw, y: cy + (gx + gy) * th }),
    [cx, cy, tw, th]
  );

  const centre = project(0, 0);

  /** Painted far-to-near, which is the only thing making a flat drawing read as depth. */
  const painted = useMemo(() => [...LOTS].sort((a, b) => a.gx + a.gy - (b.gx + b.gy)), []);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {/*
        * THE CAMERA DRIFT. Barely perceptible and deliberately so: the
        * world should feel alive rather than animated. Anything faster
        * starts competing with the one thing this screen is waiting for.
        */}
      <Animated.View
        style={{
          transform: [
            { translateX: camera.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) },
            { translateY: camera.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) },
            { scale: camera.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.05] }) },
          ],
        }}
      >
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id={`proSky-${unique}`} cx="50%" cy="30%" r="80%">
              <Stop offset="0%" stopColor={W.skyTop} stopOpacity={1} />
              <Stop offset="100%" stopColor={W.skyBottom} stopOpacity={1} />
            </RadialGradient>
            <RadialGradient id={`landmarkGlow-${unique}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={W.landmark} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={W.landmark} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          <Rect width={width} height={height} fill={`url(#proSky-${unique})`} />

          {/* The ground: two overlapping discs, so the island has an edge. */}
          <Ellipse cx={cx} cy={cy + th * 2.2} rx={tw * 5.4} ry={th * 5.4} fill={W.grassDeep} />
          <Ellipse cx={cx} cy={cy + th * 1.9} rx={tw * 5.3} ry={th * 5.3} fill={W.grass} />

          {/* Paths, as two soft diamonds crossing at the landmark. */}
          <Path
            d={`M ${cx - tw * 4.6} ${cy + th * 0.3} L ${cx} ${cy - th * 4.0} L ${cx + tw * 4.6} ${cy + th * 0.3} L ${cx} ${cy + th * 4.6} Z`}
            fill="none"
            stroke={W.path}
            strokeWidth={th * 0.62}
            strokeLinejoin="round"
            opacity={0.95}
          />

          <Circle cx={centre.x} cy={centre.y} r={tw * 2.6} fill={`url(#landmarkGlow-${unique})`} />

          {painted.map((lot, i) => {
            const p = project(lot.gx, lot.gy);
            return <Lot key={i} x={p.x} y={p.y} tw={tw} th={th} lot={lot} />;
          })}

          {TREES.map((t, i) => {
            const p = project(t.gx, t.gy);
            return <Tree key={i} x={p.x} y={p.y} scale={tw / 40} />;
          })}

          {/*
            * THE LANDMARK AT THE CENTRE IS YOUR REQUEST, not your address.
            * An abstract beacon — deliberately not a building, so nothing
            * about it can be read as a place.
            */}
          <Beacon x={centre.x} y={centre.y} tw={tw} th={th} />
        </Svg>
      </Animated.View>

      {/*
        * AMBIENT LIFE, on top: a little van that crosses the world on a
        * loop. It carries no provider and means nothing — it is the
        * difference between a drawing and a place.
        */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.van,
          {
            left: cx - tw * 4.4,
            top: cy + th * 1.1,
            opacity: life.interpolate({
              inputRange: [0, 0.08, 0.72, 0.82],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                translateX: life.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0, tw * 8.6, tw * 8.6] }),
              },
              {
                translateY: life.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0, -th * 8.6, -th * 8.6] }),
              },
            ],
          },
        ]}
      >
        <Svg width={34} height={22} viewBox="0 0 34 22">
          <Path d="M2 14h20V5h6l4 6v3h-2" fill={W.van} />
          <Path d="M22 5h6l4 6h-10z" fill={W.vanTrim} />
          <Circle cx={8} cy={15} r={3.4} fill="#3A3244" />
          <Circle cx={26} cy={15} r={3.4} fill="#3A3244" />
        </Svg>
      </Animated.View>

      {/* Sunlight travelling across the island, once per cycle. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sun,
          {
            left: cx - tw * 5.6,
            top: cy - th * 3,
            width: tw * 2.6,
            height: th * 11,
            opacity: life.interpolate({
              inputRange: [0, 0.25, 0.5, 0.75, 1],
              outputRange: [0, 0.35, 0, 0, 0],
            }),
            transform: [
              { rotate: "22deg" },
              { translateX: life.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, tw * 11, tw * 11] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

/** One lot: a house, a small block, or a shop. Simple, and polished. */
function Lot({ x, y, tw, th, lot }: { x: number; y: number; tw: number; th: number; lot: Lot }) {
  const w = tw * 0.72;
  const d = th * 0.72;
  const h = lot.h;
  const pitched = lot.kind !== "block";

  return (
    <G>
      {/* soft contact shadow, which is most of what makes it sit down */}
      <Ellipse cx={x} cy={y + d * 0.5} rx={w * 1.05} ry={d * 0.8} fill="#000000" opacity={0.07} />

      <Path d={`M ${x - w} ${y} L ${x} ${y + d} L ${x} ${y + d - h} L ${x - w} ${y - h} Z`} fill={W.wallShade} />
      <Path d={`M ${x + w} ${y} L ${x} ${y + d} L ${x} ${y + d - h} L ${x + w} ${y - h} Z`} fill={W.wall} />

      {pitched ? (
        <>
          {/* a pitched roof, which is what stops a box reading as a box */}
          <Path
            d={`M ${x - w} ${y - h} L ${x} ${y - d - h} L ${x} ${y - d - h - th * 0.5} L ${x - w} ${y - h - th * 0.5} Z`}
            fill={lot.roof}
            opacity={0.86}
          />
          <Path
            d={`M ${x + w} ${y - h} L ${x} ${y - d - h} L ${x} ${y - d - h - th * 0.5} L ${x + w} ${y - h - th * 0.5} Z`}
            fill={lot.roof}
          />
          <Path
            d={`M ${x} ${y + d - h} L ${x + w} ${y - h} L ${x} ${y - d - h - th * 0.5} L ${x - w} ${y - h} Z`}
            fill={lot.roof}
            opacity={0.94}
          />
        </>
      ) : (
        <Path
          d={`M ${x} ${y - d - h} L ${x + w} ${y - h} L ${x} ${y + d - h} L ${x - w} ${y - h} Z`}
          fill={lot.roof}
        />
      )}

      {/* Windows. Some lit, some not — a street where everyone is in is a set. */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Rect
          key={i}
          x={x + w * 0.3 + (i % 2) * w * 0.3}
          y={y - h + d * 0.35 + Math.floor(i / 2) * h * 0.34}
          width={w * 0.16}
          height={h * 0.16}
          rx={2}
          fill={i < lot.lit ? W.window : W.windowOff}
          opacity={0.95}
        />
      ))}
    </G>
  );
}

function Tree({ x, y, scale }: { x: number; y: number; scale: number }) {
  const s = Math.max(0.7, scale);
  return (
    <G>
      <Ellipse cx={x} cy={y + 3 * s} rx={9 * s} ry={3.6 * s} fill="#000000" opacity={0.08} />
      <Rect x={x - 1.6 * s} y={y - 8 * s} width={3.2 * s} height={10 * s} rx={1.4 * s} fill={W.trunk} />
      <Circle cx={x} cy={y - 14 * s} r={8.5 * s} fill={W.tree} />
      <Circle cx={x - 3.5 * s} cy={y - 11 * s} r={5.5 * s} fill={W.treeDark} opacity={0.75} />
    </G>
  );
}

/**
 * The beacon. It stands for the customer's REQUEST, and it is deliberately
 * not a building: a building at the centre of a neighbourhood is a home,
 * and a home is an address.
 */
function Beacon({ x, y, tw, th }: { x: number; y: number; tw: number; th: number }) {
  const r = tw * 0.42;
  return (
    <G>
      <Ellipse cx={x} cy={y + th * 0.4} rx={r * 1.25} ry={th * 0.6} fill="#000000" opacity={0.08} />
      <Path
        d={`M ${x} ${y - r * 2.6} L ${x + r * 0.72} ${y - r * 0.5} L ${x} ${y + th * 0.35} L ${x - r * 0.72} ${y - r * 0.5} Z`}
        fill={W.landmark}
      />
      <Path
        d={`M ${x} ${y - r * 2.6} L ${x + r * 0.72} ${y - r * 0.5} L ${x} ${y - r * 0.2} Z`}
        fill="#FFFFFF"
        opacity={0.22}
      />
      <Circle cx={x} cy={y - r * 1.5} r={r * 0.26} fill="#FFFFFF" opacity={0.9} />
    </G>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: W.skyTop },
  van: { position: "absolute" },
  sun: { position: "absolute", backgroundColor: "#FFFFFF", borderRadius: 40 },
});
