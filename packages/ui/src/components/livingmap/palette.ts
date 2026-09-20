/**
 * THE LIVING MAP'S OWN COLOURS — art, not tokens.
 *
 * ChatGPT's colour decision, taken verbatim: *"העולם עצמו כהה. לא אי
 * בהיר… אבל כהה ≠ שחור. תחשוב: לילה ישראלי מיניאטורי וחם."* Navy and
 * charcoal underneath, amber in the windows, rich greens in the trees, and
 * the saturation coming from objects and light rather than from a
 * rainbow background.
 *
 * These names never leave this folder. In the interface a colour carries
 * meaning — coral is consequence, teal is verified — and a screen that
 * borrowed `solarTank` for a button would be spending a meaning it does not
 * have. Inside the world, a colour is just a colour.
 */
export const livingPalette = {
  nightTop: "#141226",
  nightBottom: "#1D1A33",
  asphalt: "#262238",
  laneMark: "#F0E6D2",
  median: "#2E4F3A",

  blockA: "#33304A",
  blockB: "#2C2A42",
  blockC: "#3A3552",
  roofEdge: "#453F5F",
  window: "#FFC46B",
  windowOff: "#3E3A57",
  acUnit: "#5A5474",

  /* The two details that say Israel before any street does. */
  solarPanel: "#1F3A5C",
  solarTank: "#C9CBD6",

  trunk: "#6B4A34",
  foliage: "#2F7D52",
  foliageDark: "#25613F",
  foliageLight: "#3E9A66",

  lamp: "#4A4566",
  lampGlow: "#FFD98A",

  kiosk: "#3A3352",
  awning: "#E8724C",
  shelter: "#4A4566",

  /** Per-theme accents. The world is dark; the accent is what it is about. */
  themeAccent: {
    HAIR: "#FF8FB1",
    AUTO: "#FF8A4C",
    HOME: "#5BC8E8",
    ELECTRICAL: "#FFD54A",
    PETS: "#66D99B",
  },
} as const;
