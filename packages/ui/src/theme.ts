/**
 * Design tokens — see /docs/03-DESIGN-SYSTEM.md. Feature code must always
 * reference these semantic tokens (`theme.customer.colors.action`), never
 * a raw hex value, so the palette can be swapped centrally.
 */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
} as const;

export const touchTarget = { minimum: 44 } as const;

/**
 * PRO NOW's palette.
 *
 * The brief was a look that is unmistakably ours, warm and inviting rather
 * than another marketplace in safe blue or municipal green. The colours were
 * chosen against the competition on purpose: Wolt owns cyan-blue, Gett owns
 * black-and-yellow, Uber owns black. Landing anywhere near those makes a new
 * product read as a copy before a single word is read.
 *
 * So the system is built on two colours doing two different jobs, and the
 * split is the idea:
 *
 *   SIGNAL (coral)  — "now". Every act of summoning someone: the primary
 *                     button, the live pulse, the countdown, the payout.
 *                     Warm, urgent, human — an urgency that feels like a
 *                     hand going up, not like an alarm.
 *   TRUST (teal)    — "verified". Every fact that has been checked: badges,
 *                     licences, the online state, confirmations.
 *
 * Keeping them apart is a product rule, not a preference. If urgency and
 * verification share a colour, "hurry" and "safe" become the same visual
 * word — and this product's whole claim is that speed did not cost safety.
 *
 * Backgrounds are warm ivory rather than white, and the darkest ink is a
 * warm plum rather than #000. Pure neutrals are what make an interface feel
 * clinical; the warmth is where "inviting" actually comes from.
 */

/** Raw ramp. Feature code uses the semantic tokens below, never these. */
export const palette = {
  // Signal — coral
  signal900: "#8F2A14",
  signal700: "#C93C1C",
  signal500: "#FF5C38",
  signal300: "#FF9478",
  signal100: "#FFE3DA",

  // Trust — teal
  trust900: "#085A49",
  trust700: "#0B7C64",
  trust500: "#0FA47F",
  trust300: "#55D3B4",
  trust100: "#D6F5EC",

  // Sun — limited supply, caution
  sun500: "#FFB020",
  sun100: "#FFF1D6",

  // Berry — danger, disputes
  berry500: "#E01E5A",
  berry100: "#FFE0EA",

  // Warm neutrals
  ink900: "#17121F",
  ink700: "#3A3244",
  ink500: "#5A5266",
  ink300: "#9B93A6",
  ink100: "#E8E2DC",
  sand: "#FBF6EE",
  sandDeep: "#F3ECE1",
  white: "#FFFFFF",

  // Dark surfaces (professional side)
  night900: "#100C16",
  night800: "#171220",
  night700: "#221B2E",
  night600: "#2E2640",
  nightText: "#F7F3FA",
  nightTextSoft: "#A79FB3",
} as const;

export const customerTheme = {
  name: "customer" as const,
  colors: {
    bg: palette.sand,
    surface: palette.white,
    surfaceElevated: palette.sandDeep,
    textPrimary: palette.ink900,
    textSecondary: palette.ink500,
    /** Signal. The button that summons a person. */
    action: palette.signal500,
    /** Trust. Verified facts only — never an action. */
    trust: palette.trust500,
    statusWarning: palette.sun500,
    statusDanger: palette.berry500,
    border: palette.ink100,
  },
};

export const proTheme = {
  name: "pro" as const,
  colors: {
    bg: palette.night900,
    surface: palette.night800,
    surfaceElevated: palette.night700,
    textPrimary: palette.nightText,
    textSecondary: palette.nightTextSoft,
    action: palette.signal500,
    /** On the dark side this also carries the ONLINE state. */
    trust: palette.trust300,
    statusWarning: palette.sun500,
    statusDanger: palette.berry500,
    border: palette.night600,
  },
};

export type Theme = typeof customerTheme | typeof proTheme;

export const typography = {
  display: { fontSize: 34, fontWeight: "700" as const },
  h1: { fontSize: 26, fontWeight: "700" as const },
  h2: { fontSize: 20, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  button: { fontSize: 16, fontWeight: "600" as const },
  numericMetric: { fontSize: 30, fontWeight: "700" as const, fontVariant: ["tabular-nums" as const] },
};

// ---------------------------------------------------------------------
// Depth, shape and imagery
//
// /docs/03-DESIGN-SYSTEM.md §Personality asks for "premium, immediate,
// safe, human, energetic — a modern mobility/marketplace product", and
// explicitly rules out "generic blue SaaS, heavy gradients, clutter,
// skeuomorphism, cartoon trade icons".
//
// Depth here therefore comes from soft, wide, low-opacity shadows and from
// generous corner radii — not from gradients or borders. A card should read
// as a raised surface, not as a drawn rectangle.
// ---------------------------------------------------------------------

/** Corner radii. `sheet` is the bottom-sheet top corners. */
export const radii = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  sheet: 30,
  pill: 999,
} as const;

export type ElevationLevel = 0 | 1 | 2 | 3;

/**
 * Shadows are theme-dependent: on the warm light surface a soft neutral
 * shadow reads as lift; on the near-black pro surface the same shadow is
 * invisible, so it is deepened and the surface itself is lightened instead.
 */
export function elevation(level: ElevationLevel, dark = false) {
  if (level === 0) return {};
  const light = [
    {},
    { shadowColor: "#3A2A24", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    { shadowColor: "#3A2A24", shadowOpacity: 0.08, shadowRadius: 26, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
    { shadowColor: "#3A2A24", shadowOpacity: 0.12, shadowRadius: 44, shadowOffset: { width: 0, height: 18 }, elevation: 10 },
  ];
  const darkLevels = [
    {},
    { shadowColor: "#000000", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    { shadowColor: "#000000", shadowOpacity: 0.45, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
    { shadowColor: "#000000", shadowOpacity: 0.55, shadowRadius: 50, shadowOffset: { width: 0, height: 20 }, elevation: 12 },
  ];
  return (dark ? darkLevels : light)[level] ?? {};
}

/**
 * Translucent washes of a semantic colour. Used for chips, status pills and
 * selected states so a tint never has to be hand-mixed at the call site.
 */
export const tint = {
  /** Signal wash — under a primary action or a live state. */
  action: (a = 0.12) => `rgba(255,92,56,${a})`,
  /** Trust wash — under a verified fact. Never under a button. */
  trust: (a = 0.12) => `rgba(15,164,127,${a})`,
  warning: (a = 0.16) => `rgba(255,176,32,${a})`,
  danger: (a = 0.12) => `rgba(224,30,90,${a})`,
  neutralLight: (a = 0.05) => `rgba(23,18,31,${a})`,
  neutralDark: (a = 0.06) => `rgba(247,243,250,${a})`,
} as const;

/**
 * Extended type scale. The display sizes exist for the two numbers this
 * product lives or dies by — the ETA and the payout — which
 * /docs/03-DESIGN-SYSTEM.md requires to be visually dominant.
 */
export const type = {
  displayXL: { fontSize: 64, lineHeight: 66, fontWeight: "700" as const, letterSpacing: -1.5 },
  display: { fontSize: 46, lineHeight: 50, fontWeight: "700" as const, letterSpacing: -1 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: "700" as const, letterSpacing: -0.4 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.2 },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: "600" as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: "700" as const, letterSpacing: 0.8 },
} as const;

/** Tabular figures, so changing digits never shift the layout. */
export const tabular = { fontVariant: ["tabular-nums" as const] };

/** Photography aspect ratios, per surface. */
export const imageRatio = {
  serviceTile: 4 / 3,
  hero: 16 / 9,
  portrait: 1,
  wide: 21 / 9,
} as const;
