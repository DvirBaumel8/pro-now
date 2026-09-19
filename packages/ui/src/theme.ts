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

export const customerTheme = {
  name: "customer" as const,
  colors: {
    bg: "#FAF9F6",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    textPrimary: "#14151A",
    textSecondary: "#5B5F57",
    action: "#17C964",
    statusWarning: "#F5A524",
    statusDanger: "#F31260",
    border: "#E7E5E1",
  },
};

export const proTheme = {
  name: "pro" as const,
  colors: {
    bg: "#0B0F0E",
    surface: "#151A18",
    surfaceElevated: "#1C2220",
    textPrimary: "#F3F5F3",
    textSecondary: "#9AA39C",
    action: "#17C964",
    statusWarning: "#F5A524",
    statusDanger: "#F31260",
    border: "#262B28",
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
    { shadowColor: "#2A2620", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    { shadowColor: "#2A2620", shadowOpacity: 0.08, shadowRadius: 26, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
    { shadowColor: "#2A2620", shadowOpacity: 0.12, shadowRadius: 44, shadowOffset: { width: 0, height: 18 }, elevation: 10 },
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
  action: (a = 0.12) => `rgba(23,201,100,${a})`,
  warning: (a = 0.14) => `rgba(245,165,36,${a})`,
  danger: (a = 0.12) => `rgba(243,18,96,${a})`,
  neutralLight: (a = 0.05) => `rgba(20,21,26,${a})`,
  neutralDark: (a = 0.06) => `rgba(243,245,243,${a})`,
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
