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
