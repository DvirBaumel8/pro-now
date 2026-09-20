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
  // The darkest coral that still reads as coral AND clears 4.5:1 as TEXT on
  // the ivory background (4.71). The vivid signal500 only reaches 2.85 there,
  // so it is a fill and an accent, never small text on light.
  signal700: "#C93C1C",
  signal500: "#FF5C38",
  signal300: "#FF9478",
  signal100: "#FFE3DA",

  // Trust — teal
  trust900: "#085A49",
  // Same story: trust500 is 2.94 on ivory and fails as text. This one is
  // 4.78 and is what light surfaces use for teal type and icons.
  trust700: "#0B7C64",
  trust500: "#0FA47F",
  trust300: "#55D3B4",
  trust100: "#D6F5EC",

  // Sun — limited supply, caution
  sun500: "#FFB020",
  /**
   * Amber, dark enough to be TEXT on the ivory surface.
   *
   * sun500 is a fill — a 1.83:1 ratio as text on ivory, which is close to
   * invisible. It carries "thin supply", and a warning nobody can read is
   * worse than no warning at all, because the layout promises information
   * that is not delivered. 5.94:1 here.
   */
  sun700: "#8A5200",
  sun100: "#FFF1D6",

  // Berry — danger, disputes
  berry500: "#E01E5A",
  /** Berry as TEXT on ivory. berry500 measures 4.33:1 there — just under. */
  berry700: "#B8003F",
  /**
   * Berry is 3.94:1 as text on the professional's near-black surface —
   * below WCAG, and it is the colour that carries "פג תוקף" and a negative
   * amount, i.e. exactly the words a professional must not misread. This
   * lighter berry measures 5.21:1 on night800 while still reading as the
   * same warning colour.
   */
  berry300: "#FF7EA6",
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

/**
 * CONTRAST IS PART OF THE PALETTE, NOT A LATER PASS.
 *
 * An automated audit of the running app found white text on the vivid coral
 * at 3.07:1 — below the 4.5:1 body-text floor — which meant every primary
 * button in the product was failing. Two ways out: darken the coral, or stop
 * putting white on it.
 *
 * Darkening loses the colour that makes this product recognisable. So the
 * coral stays vivid and carries INK text instead, which measures 5.99:1 and
 * is also the more distinctive choice: a bright coral button with a near-
 * black label looks like nobody else in the category.
 *
 * That is why `onAction` exists as a token rather than "#FFFFFF" written at
 * forty call sites. And why `actionText` is a different, darker coral: the
 * fill colour and the text colour of the same brand hue have different jobs
 * and different floors.
 */
export const customerTheme = {
  name: "customer" as const,
  colors: {
    bg: palette.sand,
    surface: palette.white,
    surfaceElevated: palette.sandDeep,
    textPrimary: palette.ink900,
    textSecondary: palette.ink500,
    /** Signal, as a FILL. The button that summons a person. */
    action: palette.signal500,
    /** What sits on top of `action`. Measured: 5.99:1. */
    onAction: palette.ink900,
    /** Signal, as TEXT on a light surface. Measured: 4.71:1. */
    actionText: palette.signal700,
    /** Trust. Verified facts only — never an action. Measured: 4.78:1. */
    trust: palette.trust700,
    statusWarning: palette.sun500,
    /** Same fact as `statusWarning`, legible as text on this surface. */
    statusWarningText: palette.sun700,
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
    onAction: palette.ink900,
    /** On a dark surface the vivid coral is legible as text: 5.9:1. */
    actionText: palette.signal500,
    /** On the dark side this also carries the ONLINE state. Measured 9.9:1. */
    trust: palette.trust300,
    statusWarning: palette.sun500,
    /** On the dark surface the fill colour is already legible as text. */
    statusWarningText: palette.sun500,
    statusDanger: palette.berry300,
    border: palette.night600,
  },
};

/**
 * Extended type scale. The display sizes exist for the two numbers this
 * product lives or dies by — the ETA and the payout — which
 * /docs/03-DESIGN-SYSTEM.md requires to be visually dominant.
 */
/**
 * THE SEMANTIC SCALE (Visual System v1 §1).
 *
 * Seven names, and a local `fontSize:` is a bug. The old scale had eleven
 * sizes with overlapping jobs — h1 and display both meant "big" — so every
 * screen picked its own and the app ended up with no hierarchy, just a range
 * of sizes. A name per job means two screens showing the same KIND of thing
 * show it at the same size without anyone coordinating.
 *
 * `type` below stays as the implementation of these names plus the legacy
 * aliases the existing screens use; `scale` is what new code reads.
 */
export const scale = {
  display: 56,
  hero: 44,
  title: 32,
  section: 24,
  body: 17,
  meta: 14,
  micro: 12,
} as const;

export type ScaleName = keyof typeof scale;

/**
 * THE CUSTOMER'S DARK SURFACE.
 *
 * ---------------------------------------------------------------------
 * A REVERSED DECISION, AND WHY
 * ---------------------------------------------------------------------
 * Visual System v1 §12 said "customer light, professional dark, and a dark
 * customer surface must be justified by a live state". That rule was closed
 * with ChatGPT and implemented — home, categories and capture were rebuilt
 * on warm ivory.
 *
 * Amit looked at the result and rejected it, and then pointed at the visual
 * board — which renders the customer's HOME screen dark, and uses white only
 * for the capture card and the category cards. ChatGPT had departed from its
 * own written rule the moment it drew the thing.
 *
 * Both of them are picking the same picture, so the rule is what was wrong.
 * The reasoning behind §12 — "a wall-to-wall dark interface reads as a
 * trading app" — turns out to be an argument about FLAT dark, not about
 * dark. A dark surface with depth, a lit capture field, real photography and
 * one live colour does not read as a terminal; it reads as evening, which is
 * when someone's boiler actually breaks.
 *
 * So: the customer is DARK, and light becomes the accent — the surfaces the
 * customer is meant to touch or read closely. The money screen stays light,
 * for the reason that was always the strongest part of §10: a quote is a
 * document, and a document is not a live event.
 */
export const customerDarkTheme = {
  name: "customer-dark" as const,
  colors: {
    bg: palette.night900,
    surface: palette.night800,
    surfaceElevated: palette.night700,
    textPrimary: palette.nightText,
    textSecondary: palette.nightTextSoft,
    action: palette.signal500,
    /**
     * INK, NOT WHITE — even though the board draws white here.
     *
     * White on the vivid coral measures 3.07:1, below the 4.5:1 floor for
     * button text, and an automated audit of this app has already caught
     * exactly that defect once across every primary button in the product.
     * Ink on the same coral measures 5.99:1 and is the more distinctive
     * choice anyway: a bright coral button with a near-black label looks
     * like nobody else in the category.
     */
    onAction: palette.ink900,
    /** On night, the vivid coral is legible as text: 5.9:1. */
    actionText: palette.signal500,
    trust: palette.trust300,
    statusWarning: palette.sun500,
    statusWarningText: palette.sun500,
    statusDanger: palette.berry300,
    border: palette.night600,
  },
};

export type Theme = typeof customerTheme | typeof proTheme | typeof customerDarkTheme;

/**
 * The ORIGINAL token set, from before `type` and `scale` existed. Two
 * components still read it, and both carried sizes off the scale through it
 * — which is how MatchCard ended up rendering an ETA unit at 20px while the
 * same unit is 44 on the new match screen.
 *
 * It is not deleted, because deleting it means rewriting two components in
 * the same commit that unifies the scale, and a change that large stops
 * being reviewable. Instead every entry now resolves to `scale`, so the
 * legacy path produces on-scale type too.
 */
export const typography = {
  display: { fontSize: scale.title, fontWeight: "700" as const },
  h1: { fontSize: scale.section, fontWeight: "700" as const },
  h2: { fontSize: scale.body, fontWeight: "600" as const },
  body: { fontSize: scale.body, fontWeight: "400" as const },
  bodyStrong: { fontSize: scale.body, fontWeight: "600" as const },
  caption: { fontSize: scale.meta, fontWeight: "400" as const },
  button: { fontSize: scale.body, fontWeight: "600" as const },
  numericMetric: { fontSize: scale.title, fontWeight: "700" as const, fontVariant: ["tabular-nums" as const] },
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
 * ---------------------------------------------------------------------
 * DEPTH ON A DARK SURFACE
 * ---------------------------------------------------------------------
 * Amit's note on the first dark build was that it still was not "זוהר
 * וחדשני" next to the board, and the diagnosis is mechanical rather than
 * stylistic: **shadows do not exist on near-black.** `elevation()` casts a
 * dark shadow, and a dark shadow on a dark surface is nothing at all. So
 * every panel in the dark build sat perfectly flat, and the screen read as
 * one sheet of black with text on it.
 *
 * Dark interfaces get their depth from the opposite direction — from LIGHT.
 * Two mechanisms, and they are the entire vocabulary:
 *
 *   `litEdge`  a hairline highlight along the TOP of a raised surface, as
 *              if a light source above it caught the edge. This is why a
 *              panel looks raised rather than merely a different colour.
 *   `Glow`     a wide, very low-opacity radial light behind the one thing
 *              on the screen that matters. See components/Glow.tsx.
 *
 * THIS AMENDS §5. The rule says card + shadow + border is forbidden — a
 * surface is raised or outlined, never both. That rule was written for the
 * light theme, where it is exactly right. On the dark theme a top-edge
 * hairline IS the elevation, not a second decoration competing with it, and
 * forbidding it leaves dark surfaces with no way to be raised at all. So:
 * on dark, `litEdge` replaces the shadow rather than joining it, and a full
 * four-sided border is still forbidden alongside it.
 */
export const depth = {
  /** The lit top edge of a raised dark panel. Spread onto the panel style. */
  litEdge: (a = 0.07) => ({
    borderTopWidth: 1,
    borderTopColor: `rgba(247,243,250,${a})`,
  }),
  /** The surface colours a raised dark panel steps through. */
  panel: { low: "#171220", mid: "#1C1626", high: "#241C31" },
} as const;

export const type = {
  /**
   * THE SCALE, AS NAMES. Every token below resolves to one of the seven
   * values in `scale` — no token invents a size of its own.
   *
   * It did not use to. The eleven tokens here carried eleven sizes (64, 46,
   * 30, 22, 18, 16, 13, 11) that belonged to no scale, and 128 further
   * `fontSize:` literals across 27 distinct values had been written at call
   * sites on top of them. The result is the defect ChatGPT named exactly:
   * "יש בקוד גדלים מקומיים שלא דרך הסקייל" — the same ETA rendered at 44 on
   * one screen and at 30 on another, so the reader learned nothing from the
   * size. That is not hierarchy; it is a range.
   *
   * The legacy names are kept as aliases rather than renamed in one sweep,
   * because a rename across 23 screens is where meaning gets lost. Each one
   * now snaps to its nearest scale step, and `scripts/check-type-scale.mjs`
   * fails the build on any new literal.
   */
  /** 56 — the code at the door. One per app, essentially. */
  display: { fontSize: scale.display, lineHeight: 58, fontWeight: "700" as const, letterSpacing: -1.6 },
  /** 44 — the ETA, the payout, the total. At most one per viewport. */
  hero: { fontSize: scale.hero, lineHeight: 46, fontWeight: "700" as const, letterSpacing: -1.2 },
  /** 32 — the one thing this screen is about. */
  title: { fontSize: scale.title, lineHeight: 38, fontWeight: "700" as const, letterSpacing: -0.6 },
  /** 24 — a section within it. */
  section: { fontSize: scale.section, lineHeight: 30, fontWeight: "700" as const, letterSpacing: -0.2 },
  /** 17 — everything a person reads as a sentence. */
  body: { fontSize: scale.body, lineHeight: 24, fontWeight: "400" as const },
  bodyStrong: { fontSize: scale.body, lineHeight: 24, fontWeight: "600" as const },
  /** 14 — a fact attached to something else. */
  meta: { fontSize: scale.meta, lineHeight: 19, fontWeight: "400" as const },
  metaStrong: { fontSize: scale.meta, lineHeight: 19, fontWeight: "600" as const },
  /** 12 — legal, provenance, the smallest thing we allow. */
  micro: { fontSize: scale.micro, lineHeight: 16, fontWeight: "400" as const },
  microStrong: { fontSize: scale.micro, lineHeight: 16, fontWeight: "700" as const, letterSpacing: 0.8 },

  // ---- legacy aliases, each snapped to the step above ----
  displayXL: { fontSize: scale.display, lineHeight: 58, fontWeight: "700" as const, letterSpacing: -1.6 },
  h1: { fontSize: scale.title, lineHeight: 38, fontWeight: "700" as const, letterSpacing: -0.6 },
  h2: { fontSize: scale.section, lineHeight: 30, fontWeight: "700" as const, letterSpacing: -0.2 },
  h3: { fontSize: scale.body, lineHeight: 24, fontWeight: "600" as const },
  caption: { fontSize: scale.meta, lineHeight: 19, fontWeight: "400" as const },
  captionStrong: { fontSize: scale.meta, lineHeight: 19, fontWeight: "600" as const },
  overline: { fontSize: scale.micro, lineHeight: 16, fontWeight: "700" as const, letterSpacing: 0.8 },
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
